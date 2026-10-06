<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

// Exports a fully STATIC site (no PHP/DB at runtime) for free hosting
// (e.g. GitHub Pages). Verified output in dist/ by default.
// ------------------------------------------------------------------
// Usage: php artisan forever:export [dist]
//
// What it does (needs NO database: manifest + data files are enough):
//  1. Writes {class}.json per class in exact API shape (trees ordered,
//     talents by row/col, requires_slug resolved to numeric ids).
//  2. Renders calculator.blade.php per class to {class}.html, rewriting
//     absolute paths to relative ones (./build/..., ./x.json, ./y.html)
//     so the site works from any subpath.
//  3. Copies public/build (Vite bundle), writes an index picker + .nojekyll.
//  4. Temporarily moves public/hot aside so @vite emits manifest tags,
//     never dev-server tags (restored afterwards).
//
// Share links keep working statically: builds travel in ?b= (see JS).
class ForeverExport extends Command
{
    protected $signature = 'forever:export {out=dist : output directory}';
    protected $description = 'Export a static no-backend site (HTML + JSON + assets)';

    public function handle(): int
    {
        // Absolute out path stays as-is; relative resolves from project root.
        $out = $this->argument('out');
        if (!preg_match('#^[a-zA-Z]:[\\\\/]|^/#', $out)) {
            $out = base_path($out);
        }
        File::deleteDirectory($out);
        File::makeDirectory($out, 0755, true);

        $manifest = json_decode(File::get(base_path('database/data/classes.json')), true);
        $classes = $manifest['classes'] ?? [];

        // Stale `public/hot` (from `npm run dev`) makes @vite point at the
        // dev server: move it aside while rendering, restore afterwards.
        $hot = public_path('hot');
        $hotMoved = false;
        if (File::exists($hot)) {
            File::move($hot, $hot.'.export-bak');
            $hotMoved = true;
        }

        try {
            foreach ($classes as $classSlug => $class) {
                $this->exportClassJson($out, $classSlug, $class);
                $this->exportClassPage($out, $classSlug, $class);
            }
            $this->exportIndex($out, $classes);
            File::copyDirectory(public_path('build'), $out.'/build');
            File::put($out.'/.nojekyll', '');
        } finally {
            if ($hotMoved) {
                File::move($hot.'.export-bak', $hot);
            }
        }

        $this->info('Static site exported to '.$out.' ('.count($classes).' classes).');
        return 0;
    }

    // {class}.json in API shape: ids assigned sequentially in API order,
    // requires_slug resolved to the matching numeric id.
    private function exportClassJson(string $out, string $classSlug, array $class): void
    {
        $trees = [];
        $nextId = 1;
        foreach ($class['trees'] as $treeSlug => $tree) {
            $raw = json_decode(File::get(base_path('database/data/'.$tree['file'])), true);
            $bySlugId = [];
            foreach ($raw['talents'] ?? [] as $tal) {
                $bySlugId[$tal['slug']] = $nextId++;
            }
            $talents = [];
            foreach ($raw['talents'] ?? [] as $tal) {
                $talents[] = [
                    'id' => $bySlugId[$tal['slug']],
                    'tree_id' => null,
                    'row' => $tal['row'],
                    'col' => $tal['col'],
                    'name' => $tal['name'],
                    'slug' => $tal['slug'],
                    'max_rank' => $tal['max_rank'],
                    'is_gold' => $tal['is_gold'],
                    'requires_talent_id' => !empty($tal['requires_slug']) ? ($bySlugId[$tal['requires_slug']] ?? null) : null,
                    'status' => $tal['status'],
                    'description' => $tal['description'],
                    'ranks' => $tal['ranks'] ?? null,
                    'skill' => $tal['skill'] ?? null,
                    'icon' => $tal['icon'],
                ];
            }
            // Same order the API serves (and the JS relies on for ?b= indices).
            usort($talents, fn($a, $b) => [$a['row'], $a['col']] <=> [$b['row'], $b['col']]);
            $trees[] = [
                'slug' => $treeSlug,
                'name' => $tree['name'],
                'order' => $tree['order'],
                'background' => $tree['background'] ?? null,
                'spec_icon' => $tree['spec_icon'] ?? null,
                'talents' => array_values($talents),
            ];
        }
        usort($trees, fn($a, $b) => $a['order'] <=> $b['order']);
        File::put($out."/{$classSlug}.json", json_encode(
            ['slug' => $classSlug, 'name' => $class['name'], 'trees' => $trees],
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ));
        $this->line("wrote {$classSlug}.json");
    }

    // {class}.html: server-rendered view with relative asset/data/page links.
    private function exportClassPage(string $out, string $classSlug, array $class): void
    {
        // The view only reads ->slug/->name: a plain object suffices (no DB).
        $wowClass = (object) ['slug' => $classSlug, 'name' => $class['name']];
        $seeded = array_keys($this->manifestClasses());
        $classes = [];
        foreach (config('forever.classes') as $slug => $name) {
            $classes[] = [
                'slug' => $slug,
                'name' => $name,
                'icon' => "https://sunderarmor.com/WOW/Classes/Old/{$slug}.png",
                'available' => in_array($slug, $seeded, true),
                'selected' => $slug === $classSlug,
            ];
        }

        $html = view('calculator', ['wowClass' => $wowClass, 'classes' => $classes])->render();

        // Absolute -> relative so any subpath (e.g. user.github.io/repo/) works.
        // NOTE: replace the full APP_URL prefix, not just '/build/', or the
        // host and the relative path glue into garbage (localhost:8000./build).
        $base = rtrim(config('app.url'), '/');
        if ($base !== '') {
            $html = str_replace($base.'/build/', './build/', $html);
        } else {
            $html = str_replace('/build/', './build/', $html);
        }
        $html = preg_replace('#data-api="/api/classes/([a-z]+)"#', 'data-api="./$1.json"', $html);
        $html = preg_replace('#href="/([a-z]+)"#', 'href="./$1.html"', $html);

        File::put($out."/{$classSlug}.html", $html);
        $this->line("wrote {$classSlug}.html");
    }

    private function manifestClasses(): array
    {
        return json_decode(File::get(base_path('database/data/classes.json')), true)['classes'] ?? [];
    }

    // Minimal landing: class picker (avoids a dead root on static hosts).
    private function exportIndex(string $out, array $classes): void
    {
        $links = '';
        foreach ($classes as $slug => $class) {
            $links .= "<li style=\"margin:8px 0\"><a style=\"color:#ffd100\" href=\"./{$slug}.html\">{$class['name']}</a></li>";
        }
        File::put($out.'/index.html', <<<HTML
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WoW Forever Tools</title></head>
            <body style="background:#0a0a12;color:#fff;font-family:sans-serif;padding:2rem">
            <h1 style="color:#ffd100">WoW Forever Tools</h1>
            <p>Talent calculators:</p>
            <ul>{$links}</ul>
            </body>
            </html>
            HTML);
    }
}
