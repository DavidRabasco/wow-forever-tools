<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Covers shareable builds: valid store, rejected garbage, legal replay, load.
class BuildTest extends TestCase
{
    use RefreshDatabase;

    // Minimal class: one tree, row-1 (5 ranks) + row-2 (3 ranks, no prereq).
    private function seedMiniClass(): void
    {
        $classId = \DB::table('classes')->insertGetId([
            'slug' => 'mini', 'name' => 'Mini',
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $treeId = \DB::table('talent_trees')->insertGetId([
            'class_id' => $classId, 'slug' => 'tiny', 'name' => 'Tiny', 'order' => 1,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        foreach ([
            ['row' => 1, 'col' => 1, 'slug' => 'first', 'name' => 'First', 'max_rank' => 5],
            ['row' => 2, 'col' => 1, 'slug' => 'second', 'name' => 'Second', 'max_rank' => 3],
        ] as $t) {
            \DB::table('talents')->insert($t + [
                'tree_id' => $treeId, 'is_gold' => false, 'requires_talent_id' => null,
                'status' => 'unchanged', 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    public function test_store_valid_build_returns_hash(): void
    {
        $this->seedMiniClass();

        $picks = array_merge(array_fill(0, 5, 'first'), ['second']);
        $response = $this->postJson('/api/builds', ['class_slug' => 'mini', 'picks' => $picks]);

        $response->assertCreated()->assertJsonStructure(['hash']);
        $this->assertSame(6, strlen($response->json('hash')));
        $this->assertDatabaseHas('builds', ['class_slug' => 'mini']);
    }

    public function test_store_rejects_unknown_talent(): void
    {
        $this->seedMiniClass();

        $this->postJson('/api/builds', ['class_slug' => 'mini', 'picks' => ['nope']])
            ->assertUnprocessable();
    }

    public function test_store_rejects_row_gate_violation(): void
    {
        $this->seedMiniClass();

        // Row-2 pick with nothing above it: illegal order.
        $this->postJson('/api/builds', ['class_slug' => 'mini', 'picks' => ['second']])
            ->assertUnprocessable();
    }

    public function test_show_returns_stored_picks(): void
    {
        $this->seedMiniClass();

        $picks = ['first', 'first', 'first', 'first', 'first', 'second'];
        $hash = $this->postJson('/api/builds', ['class_slug' => 'mini', 'picks' => $picks])->json('hash');

        $this->getJson("/api/builds/{$hash}")
            ->assertOk()
            ->assertJson(['class_slug' => 'mini', 'picks' => $picks]);
    }

    public function test_identical_picks_reuse_the_same_hash(): void
    {
        $this->seedMiniClass();

        $payload = ['class_slug' => 'mini', 'picks' => ['first', 'first']];
        $first = $this->postJson('/api/builds', $payload)->assertCreated()->json('hash');
        $second = $this->postJson('/api/builds', $payload)->assertOk()->json('hash');

        $this->assertSame($first, $second);
        $this->assertSame(1, \DB::table('builds')->count());
    }
}
