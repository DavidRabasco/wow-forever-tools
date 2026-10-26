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
//  3. Renders the static pages (home, about, sources, legal, 404) to
//     sibling .html files.
//  4. Copies public/build (Vite bundle) and favicon.svg, writes robots.txt,
//     sitemap.xml when SITE_URL is configured, and .nojekyll.
//  5. Temporarily moves public/hot aside so @vite emits manifest tags,
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
                $talentData = $this->exportClassJson($out, $classSlug, $class);
                $this->exportClassPage($out, $classSlug, $class, $talentData);
            }

            $this->exportSitePages($out);
            $this->exportSitemap($out);
            $this->exportRobots($out);

            if (File::isDirectory(public_path('build'))) {
                File::copyDirectory(public_path('build'), $out.'/build');
            } else {
                $this->warn('public/build is missing: run npm run build first.');
            }

            if (File::exists(public_path('favicon.svg'))) {
                File::copy(public_path('favicon.svg'), $out.'/favicon.svg');
            }

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
    private function exportClassJson(string $out, string $classSlug, array $class): array
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

        $payload = ['slug' => $classSlug, 'name' => $class['name'], 'trees' => $trees];

        File::put($out."/{$classSlug}.json", json_encode(
            $payload,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ));
        $this->line("wrote {$classSlug}.json");

        return $payload;
    }

    // {class}.html: server-rendered view with relative asset/data/page links.
    // The same payload is inlined so the calculator renders without a fetch.
    private function exportClassPage(string $out, string $classSlug, array $class, array $talentData): void
    {
        // The view only reads ->slug/->name: a plain object suffices (no DB).
        $wowClass = (object) ['slug' => $classSlug, 'name' => $class['name']];

        $html = view('calculator', [
            'wowClass' => $wowClass,
            'classes' => $this->classBar($classSlug),
            'talentData' => $talentData,
        ])->render();

        File::put($out."/{$classSlug}.html", $this->relativize($html));
        $this->line("wrote {$classSlug}.html");
    }

    // Static pages that do not depend on a class. All are siblings, so the
    // same relative asset paths work everywhere.
    private function exportSitePages(string $out): void
    {
        $siteUrl = rtrim((string) config('forever.site_url'), '/');
        $canonical = fn (string $path) => $siteUrl !== '' ? $siteUrl.$path : null;
        $classes = $this->classBar('');

        $pages = [
            ['home', 'index.html', [
                'classes' => $classes,
                'title' => 'WoW Forever Tools - Talent Calculator, Raid Comp and BiS',
                'description' => 'Plan WoW Forever talent builds, check raid buff coverage and find BiS lists. Free, no account, builds shared by URL.',
                'canonical' => $canonical('/'),
                'current' => '',
            ]],
            ['about', 'about.html', [
                'title' => 'About - WoW Forever Tools',
                'description' => 'What WoW Forever Tools is, how the data is sourced and why it is an unofficial fan project.',
                'canonical' => $canonical('/about.html'),
                'current' => 'about',
            ]],
            ['sources', 'sources.html', [
                'title' => 'Sources and attribution - WoW Forever Tools',
                'description' => 'Data sources, icon attribution and the verification status behind WoW Forever Tools.',
                'canonical' => $canonical('/sources.html'),
                'current' => '',
            ]],
            ['legal.privacy', 'privacy.html', [
                'title' => 'Privacy - WoW Forever Tools',
                'description' => 'What WoW Forever Tools stores, what the host logs and how to contact the project.',
                'canonical' => $canonical('/privacy.html'),
                'robots' => 'noindex',
                'current' => '',
            ]],
            ['legal.terms', 'terms.html', [
                'title' => 'Terms of use - WoW Forever Tools',
                'description' => 'Unofficial fan-site disclaimer, no-warranty notice and acceptable use for WoW Forever Tools.',
                'canonical' => $canonical('/terms.html'),
                'robots' => 'noindex',
                'current' => '',
            ]],
            ['legal.contact', 'contact.html', [
                'title' => 'Contact - WoW Forever Tools',
                'description' => 'Contact WoW Forever Tools for data corrections, copyright requests or privacy questions.',
                'canonical' => $canonical('/contact.html'),
                'robots' => 'noindex',
                'current' => '',
            ]],
            ['raid-comp', 'raid-comp.html', [
                'title' => 'Raid Comp (in development) - WoW Forever Tools',
                'description' => 'Raid composition and buff coverage tool for WoW Forever. In development.',
                'canonical' => $canonical('/raid-comp.html'),
                'robots' => 'noindex',
                'current' => 'raid-comp',
            ]],
            ['bis', 'bis.html', [
                'title' => 'BiS Lists (in development) - WoW Forever Tools',
                'description' => 'Best-in-slot lists by class, spec and phase for WoW Forever. In development.',
                'canonical' => $canonical('/bis.html'),
                'robots' => 'noindex',
                'current' => 'bis',
            ]],
            ['errors.404', '404.html', [
                'title' => 'Page not found - WoW Forever Tools',
                'description' => 'The requested page does not exist.',
                'canonical' => null,
                'robots' => 'noindex',
                'current' => '',
            ]],
        ];

        foreach ($pages as [$view, $file, $data]) {
            $html = view($view, $data)->render();
            File::put($out.'/'.$file, $this->relativize($html));
            $this->line("wrote {$file}");
        }
    }

    // Sitemap is only meaningful with a public URL. Set SITE_URL at launch.
    private function exportSitemap(string $out): void
    {
        $siteUrl = rtrim((string) config('forever.site_url'), '/');
        if ($siteUrl === '') {
            $this->line('SITE_URL is empty: skipped sitemap.xml');
            return;
        }

        $paths = ['/', '/about.html', '/sources.html', '/raid-comp.html', '/bis.html'];
        foreach (array_keys($this->manifestClasses()) as $slug) {
            $paths[] = "/{$slug}.html";
        }

        $lastmod = now()->toDateString();
        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
        $xml .= "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($paths as $path) {
            $loc = htmlspecialchars($siteUrl.$path, ENT_XML1 | ENT_QUOTES, 'UTF-8');
            $xml .= "  <url><loc>{$loc}</loc><lastmod>{$lastmod}</lastmod></url>\n";
        }
        $xml .= "</urlset>\n";

        File::put($out.'/sitemap.xml', $xml);
        $this->line('wrote sitemap.xml');
    }

    private function exportRobots(string $out): void
    {
        $siteUrl = rtrim((string) config('forever.site_url'), '/');
        $robots = "User-agent: *\nAllow: /\n";
        if ($siteUrl !== '') {
            $robots .= "Sitemap: {$siteUrl}/sitemap.xml\n";
        }

        File::put($out.'/robots.txt', $robots);
        $this->line('wrote robots.txt');
    }

    private function classBar(string $selectedSlug): array
    {
        $seeded = array_keys($this->manifestClasses());
        $classes = [];
        foreach (config('forever.classes') as $slug => $name) {
            $classes[] = [
                'slug' => $slug,
                'name' => $name,
                'icon' => "https://sunderarmor.com/WOW/Classes/Old/{$slug}.png",
                'available' => in_array($slug, $seeded, true),
                'selected' => $slug === $selectedSlug,
            ];
        }

        return $classes;
    }

    private function manifestClasses(): array
    {
        return json_decode(File::get(base_path('database/data/classes.json')), true)['classes'] ?? [];
    }

    // Absolute -> relative so any subpath (e.g. user.github.io/repo/) works.
    // NOTE: replace the full APP_URL prefix, not just '/build/', or the host
    // and the relative path glue into garbage (localhost:8000./build).
    private function relativize(string $html): string
    {
        $base = rtrim((string) config('app.url'), '/');
        if ($base !== '') {
            $html = str_replace($base.'/build/', './build/', $html);
        } else {
            $html = str_replace('/build/', './build/', $html);
        }

        // Keep favicon and root links relative before the generic page rewrite.
        $html = str_replace('href="/favicon.svg"', 'href="./favicon.svg"', $html);
        $html = str_replace('href="/"', 'href="./index.html"', $html);

        // Sibling pages: /about -> ./about.html, /paladin -> ./paladin.html.
        $html = preg_replace('#href="/([a-z-]+)"#', 'href="./$1.html"', $html);
        $html = preg_replace('#data-api="/api/classes/([a-z]+)"#', 'data-api="./$1.json"', $html);

        return $html;
    }
}
