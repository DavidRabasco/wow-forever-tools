<?php

namespace Tests\Feature;

use Database\Seeders\ForeverClassSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Seed integrity with REAL data, focused on mage: every requires_talent_id
// must resolve within the SAME tree (both canSpend in JS and any replay only
// look there). Kept from the old share-probe file after builds moved to URLs.
class MageDataIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_mage_is_seeded_with_valid_prerequisites(): void
    {
        $this->seed(ForeverClassSeeder::class);

        $mage = \App\Models\WowClass::with('trees.talents')->where('slug', 'mage')->first();
        $this->assertNotNull($mage, 'mage must be seeded');
        $this->assertSame(54, $mage->trees->sum(fn ($t) => $t->talents->count()));

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
}
