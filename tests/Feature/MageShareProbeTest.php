<?php

namespace Tests\Feature;

use Database\Seeders\ForeverClassSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Shareable builds with REAL seeded data, focused on mage (a share failure
// was once seen on /mage and could not be reproduced afterwards).
// Guards the full flow: seed integrity, legal deep-build roundtrip, 422 on
// unmet prerequisite.
class MageShareProbeTest extends TestCase
{
    use RefreshDatabase;

    public function test_mage_is_seeded_with_valid_prerequisites(): void
    {
        $this->seed(ForeverClassSeeder::class);

        $mage = \App\Models\WowClass::with('trees.talents')->where('slug', 'mage')->first();
        $this->assertNotNull($mage, 'mage must be seeded');
        $this->assertSame(54, $mage->trees->sum(fn ($t) => $t->talents->count()));

        // Every requires_talent_id must resolve within the SAME tree
        // (both canSpend in JS and replayError in PHP only look there).
        foreach ($mage->trees as $tree) {
            foreach ($tree->talents as $talent) {
                if ($talent->requires_talent_id) {
                    $parent = $tree->talents->firstWhere('id', $talent->requires_talent_id);
                    $this->assertNotNull(
                        $parent,
                        "mage talent '{$talent->slug}' requires id {$talent->requires_talent_id} outside tree '{$tree->slug}'"
                    );
                }
            }
        }
    }

    public function test_mage_share_roundtrip_with_legal_picks(): void
    {
        $this->seed(ForeverClassSeeder::class);

        // Deep frost build exercising row gates + a prerequisite chain:
        // 5 in row 1, 5 in row 2, row-3 incl. ice-lance, row-4 fillers,
        // then fingers-of-frost (needs ice-lance maxed + 20 above).
        $picks = array_merge(
            array_fill(0, 2, 'frost-warding'),
            array_fill(0, 3, 'improved-frostbolt'),
            array_fill(0, 5, 'ice-shards'),
            array_fill(0, 3, 'piercing-ice'),
            ['ice-lance'],
            ['improved-blizzard'],
            array_fill(0, 2, 'arctic-reach'),
            ['ice-block'],
            array_fill(0, 3, 'shatter'),
            ['cold-snap'],
            array_fill(0, 2, 'fingers-of-frost'),
        );

        $store = $this->postJson('/api/builds', ['class_slug' => 'mage', 'picks' => $picks]);
        $store->assertCreated()->assertJsonStructure(['hash']);

        $this->getJson('/api/builds/'.$store->json('hash'))
            ->assertOk()
            ->assertJson(['class_slug' => 'mage', 'picks' => $picks]);
    }

    public function test_mage_share_rejects_unmet_prerequisite(): void
    {
        $this->seed(ForeverClassSeeder::class);

        // fingers-of-frost without its maxed parent ice-lance: illegal order.
        $picks = array_merge(
            array_fill(0, 2, 'frost-warding'),
            array_fill(0, 3, 'improved-frostbolt'),
            array_fill(0, 5, 'ice-shards'),
            array_fill(0, 3, 'piercing-ice'),
            array_fill(0, 3, 'improved-blizzard'),
            array_fill(0, 2, 'arctic-reach'),
            ['ice-block'],
            array_fill(0, 3, 'shatter'),
            ['fingers-of-frost'],
        );

        $this->postJson('/api/builds', ['class_slug' => 'mage', 'picks' => $picks])
            ->assertUnprocessable();
    }
}
