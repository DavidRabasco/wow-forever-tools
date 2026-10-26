<?php

namespace Tests\Feature;

use App\Models\Talent;
use App\Models\TalentTree;
use App\Models\WowClass;
use Database\Seeders\ForeverClassSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Full seeded-data integrity for all 9 classes. MageDataIntegrityTest stays as
// a focused regression test; this one owns the whole catalog and the shape the
// static export relies on.
class ForeverDataIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private const EXPECTED_CLASSES = 9;

    private const EXPECTED_TREES = 27;

    private const EXPECTED_TALENTS = 466;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ForeverClassSeeder::class);
    }

    public function test_the_catalog_has_the_expected_shape(): void
    {
        $this->assertSame(self::EXPECTED_CLASSES, WowClass::count());
        $this->assertSame(self::EXPECTED_TREES, TalentTree::count());
        $this->assertSame(self::EXPECTED_TALENTS, Talent::count());

        $this->assertSame(
            self::EXPECTED_CLASSES,
            WowClass::whereIn('slug', array_keys(config('forever.classes')))->count(),
            'Every class in config/forever.php must be seeded.'
        );
    }

    public function test_every_prerequisite_resolves_inside_its_own_tree(): void
    {
        $classes = WowClass::with('trees.talents')->get();

        foreach ($classes as $class) {
            foreach ($class->trees as $tree) {
                $ids = $tree->talents->pluck('id')->all();

                foreach ($tree->talents as $talent) {
                    if (! $talent->requires_talent_id) {
                        continue;
                    }

                    $this->assertContains(
                        $talent->requires_talent_id,
                        $ids,
                        "{$class->slug}/{$tree->slug}/{$talent->slug} requires a talent outside its tree."
                    );
                }
            }
        }
    }

    public function test_talent_positions_and_ranks_are_playable(): void
    {
        foreach (Talent::all() as $talent) {
            $this->assertGreaterThanOrEqual(1, $talent->row, "{$talent->slug} row");
            $this->assertLessThanOrEqual(7, $talent->row, "{$talent->slug} row");
            $this->assertGreaterThanOrEqual(1, $talent->col, "{$talent->slug} col");
            $this->assertLessThanOrEqual(4, $talent->col, "{$talent->slug} col");
            $this->assertGreaterThanOrEqual(1, $talent->max_rank, "{$talent->slug} max_rank");
        }
    }

    public function test_tree_orders_and_slugs_are_unique_per_parent(): void
    {
        foreach (WowClass::with('trees.talents')->get() as $class) {
            $orders = $class->trees->pluck('order');
            $this->assertSame(
                $orders->count(),
                $orders->unique()->count(),
                "{$class->slug} has duplicate tree orders."
            );

            foreach ($class->trees as $tree) {
                $slugs = $tree->talents->pluck('slug');
                $this->assertSame(
                    $slugs->count(),
                    $slugs->unique()->count(),
                    "{$class->slug}/{$tree->slug} has duplicate talent slugs."
                );
            }
        }
    }
}
