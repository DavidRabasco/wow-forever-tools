<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

// The deployable unit is the static export, not the Laravel app. This test
// proves the export runs without a database and keeps the URLs, JSON shape and
// share-link order the browser expects.
class StaticExportTest extends TestCase
{
    private string $out;

    protected function setUp(): void
    {
        parent::setUp();

        $this->out = storage_path('framework/testing/static-export');
        File::deleteDirectory($this->out);

        // A public URL is needed for canonical links and sitemap.xml.
        config(['forever.site_url' => 'https://example.test']);

        Artisan::call('forever:export', ['out' => $this->out]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->out);
        parent::tearDown();
    }

    public function test_it_writes_every_class_page_and_json_file(): void
    {
        $classes = array_keys(config('forever.classes'));

        $this->assertFileExists($this->out.'/index.html');
        $this->assertFileExists($this->out.'/.nojekyll');
        $this->assertFileExists($this->out.'/build/manifest.json');
        $this->assertFileExists($this->out.'/favicon.svg');
        $this->assertFileExists($this->out.'/robots.txt');
        $this->assertFileExists($this->out.'/sitemap.xml');

        foreach ($classes as $slug) {
            $this->assertFileExists($this->out."/{$slug}.html", "{$slug}.html");
            $this->assertFileExists($this->out."/{$slug}.json", "{$slug}.json");
        }
    }

    public function test_the_site_pages_and_canonical_metadata_exist(): void
    {
        foreach (['about', 'sources', 'privacy', 'terms', 'contact', 'raid-comp', 'bis'] as $page) {
            $this->assertFileExists($this->out."/{$page}.html", "{$page}.html");
        }

        $this->assertFileExists($this->out.'/404.html');

        $about = File::get($this->out.'/about.html');
        $this->assertStringContainsString('<link rel="canonical" href="https://example.test/about.html">', $about);
        $this->assertStringContainsString('href="./index.html"', $about);
        $this->assertStringContainsString('href="./druid.html"', $about);

        $privacy = File::get($this->out.'/privacy.html');
        $this->assertStringContainsString('<meta name="robots" content="noindex">', $privacy);
    }

    public function test_home_class_grid_and_robots_are_relative_and_complete(): void
    {
        $home = File::get($this->out.'/index.html');

        $this->assertStringContainsString('href="./paladin.html"', $home);
        $this->assertStringContainsString('./build/', $home);
        $this->assertStringNotContainsString('href="/', $home);
        $this->assertStringNotContainsString('localhost', $home);

        $robots = File::get($this->out.'/robots.txt');
        $this->assertStringContainsString('Sitemap: https://example.test/sitemap.xml', $robots);

        $sitemap = File::get($this->out.'/sitemap.xml');
        $this->assertStringContainsString('https://example.test/paladin.html', $sitemap);
        $this->assertStringContainsString('https://example.test/about.html', $sitemap);
        $this->assertStringContainsString('https://example.test/raid-comp.html', $sitemap);
    }

    public function test_the_html_is_relative_and_never_points_at_the_dev_server(): void
    {
        $html = File::get($this->out.'/paladin.html');

        $this->assertStringNotContainsString('localhost', $html);
        $this->assertStringNotContainsString('127.0.0.1', $html);
        $this->assertStringNotContainsString('5173', $html);
        $this->assertStringNotContainsString('data-api="/api/classes/', $html);

        $this->assertStringContainsString('data-api="./paladin.json"', $html);
        $this->assertStringContainsString('id="talent-data"', $html);
        $this->assertStringContainsString('./build/', $html);
        $this->assertStringContainsString('href="./warrior.html"', $html);
    }

    public function test_the_json_matches_the_api_order_and_prerequisites(): void
    {
        $total = 0;

        foreach (array_keys(config('forever.classes')) as $slug) {
            $data = json_decode(
                File::get($this->out."/{$slug}.json"),
                true,
                512,
                JSON_THROW_ON_ERROR
            );

            $this->assertSame($slug, $data['slug']);
            $this->assertCount(3, $data['trees'], "{$slug} must have three trees");

            foreach ($data['trees'] as $tree) {
                $ids = array_column($tree['talents'], 'id');
                $this->assertSame(
                    count($ids),
                    count(array_unique($ids)),
                    "{$slug}/{$tree['slug']} has duplicate ids"
                );

                foreach ($tree['talents'] as $talent) {
                    $total++;

                    if ($talent['requires_talent_id'] === null) {
                        continue;
                    }

                    $this->assertContains(
                        $talent['requires_talent_id'],
                        $ids,
                        "{$slug}/{$tree['slug']}/{$talent['slug']} has a broken prerequisite"
                    );
                }
            }
        }

        $this->assertSame(466, $total);
    }
}
