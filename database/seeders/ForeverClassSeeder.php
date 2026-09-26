<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Forever class seeder (all classes, manifest-driven).
// --------------------------------------------------
// What it does, per class in database/data/classes.json:
//  1. Creates the class row and its trees (slug/name/order/background/spec_icon).
//  2. Loads the REAL talents of each tree from its JSON file
//     (classic 7x4 format: row/col/slug/max_rank/requires_slug/...).
//  3. Resolves prerequisites in 2 passes: first inserts with requires_talent_id
//     empty, then updates it with the id of the required slug.
//
// How to update data:
//  - Edit database/data/{class}_{tree}.json (unique ASCII slug per talent).
//  - Add a class: its JSON files + one entry in classes.json (see _notes there).
//  - Run: php artisan db:seed --class=Database\\Seeders\\ForeverClassSeeder
//  - Idempotent (updateOrInsert by slug), never duplicates.
//
// Source and license:
//  - Data (c) wowtbc.gg / Blizzard, educational use.
//  - Icons (c) Blizzard: the DB stores only short names for wow.zamimg.com,
//    never binaries.
class ForeverClassSeeder extends Seeder
{
    public function run(): void
    {
        $manifest = json_decode(file_get_contents(base_path('database/data/classes.json')), true);

        foreach ($manifest['classes'] as $classSlug => $class) {
            $this->seedClass($classSlug, $class);
        }
    }

    // Creates one class row plus all of its trees.
    private function seedClass(string $classSlug, array $class): void
    {
        // updateOrInsert = updates the name if it exists, creates it otherwise.
        DB::table('classes')->updateOrInsert(
            ['slug' => $classSlug],
            ['name' => $class['name'], 'created_at' => now(), 'updated_at' => now()]
        );
        $classId = DB::table('classes')->where('slug', $classSlug)->value('id');

        foreach ($class['trees'] as $treeSlug => $tree) {
            $this->seedTree($classId, $treeSlug, $tree);
        }
    }

    // Seeds one tree: creates the tree row, upserts its talents from JSON,
    // then resolves requires_slug -> requires_talent_id in a second pass.
    // NOTE: tree slugs repeat across classes (both Paladin and Warrior have
    // 'protection'), so trees match on (slug, class_id) and talents on
    // (slug, tree_id) — never on the bare slug.
    private function seedTree(int $classId, string $slug, array $tree): void
    {
        // Tree row (idempotent by slug + class), including presentation fields.
        DB::table('talent_trees')->updateOrInsert(
            ['slug' => $slug, 'class_id' => $classId],
            ['name' => $tree['name'], 'order' => $tree['order'],
             'background' => $tree['background'] ?? null, 'spec_icon' => $tree['spec_icon'] ?? null,
             'created_at' => now(), 'updated_at' => now()]
        );
        $treeId = DB::table('talent_trees')
            ->where('slug', $slug)->where('class_id', $classId)->value('id');

        // Read the JSON with the real talents of this tree.
        // base_path() points to the Laravel project root.
        $raw = json_decode(file_get_contents(base_path('database/data/'.$tree['file'])), true);
        $talents = $raw['talents'] ?? [];

        // Pass 1: insert everything with no prerequisite (requires_talent_id=null).
        // The FK cannot be set yet because the required talent may not exist.
        // Matched on (slug, tree_id): talent slugs may repeat across classes.
        foreach ($talents as $tal) {
            DB::table('talents')->updateOrInsert(
                ['slug' => $tal['slug'], 'tree_id' => $treeId],
                [
                    'row' => $tal['row'],
                    'col' => $tal['col'],
                    'name' => $tal['name'],
                    'max_rank' => $tal['max_rank'],
                    'is_gold' => $tal['is_gold'],
                    'requires_talent_id' => null,
                    'status' => $tal['status'],
                    'description' => $tal['description'],
                    'ranks' => isset($tal['ranks']) ? json_encode($tal['ranks']) : null,
                    'skill' => isset($tal['skill']) ? json_encode($tal['skill']) : null,
                    'icon' => $tal['icon'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // Pass 2: resolve requires_slug -> requires_talent_id (same tree first,
        // any tree as fallback for cross-tree links).
        foreach ($talents as $tal) {
            if (empty($tal['requires_slug'])) {
                continue;
            }
            $reqId = DB::table('talents')
                ->where('slug', $tal['requires_slug'])->where('tree_id', $treeId)->value('id')
                ?? DB::table('talents')->where('slug', $tal['requires_slug'])->value('id');
            DB::table('talents')->where('slug', $tal['slug'])->where('tree_id', $treeId)->update([
                'requires_talent_id' => $reqId,
                'updated_at' => now(),
            ]);
        }

        // Cleanup: delete stale talents of this tree that are no longer in the JSON.
        $realSlugs = collect($talents)->pluck('slug')->all();
        DB::table('talents')
            ->where('tree_id', $treeId)
            ->whereNotIn('slug', $realSlugs)
            ->delete();
    }
}
