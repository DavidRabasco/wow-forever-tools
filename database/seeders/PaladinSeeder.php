<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Paladin seed for the WoW Forever calculator.
// --------------------------------------------------
// What it does:
//  1. Creates the 'paladin' class and its 3 trees (holy/protection/retribution).
//  2. Loads the REAL talents of each tree from database/data/paladin_{tree}.json
//     (scraped from wowtbc.gg page-data.json, classic 7x4 format).
//  3. Resolves prerequisites in 2 passes: first inserts with requires_talent_id
//     empty, then updates it with the id of the required slug
//     (requires_slug -> id).
//
// How to update data:
//  - Edit database/data/paladin_{holy,protection,retribution}.json
//    (row 1-7, col 1-4, unique ASCII slug).
//  - Run: php artisan db:seed --class=Database\\Seeders\\PaladinSeeder
//  - The seeder is idempotent (updateOrInsert by slug), it never duplicates.
//  - Same shape works for other classes: add the class + its tree files.
//
// Source and license:
//  - Data (c) wowtbc.gg / Blizzard, educational use.
//  - Icons (c) Blizzard: the DB stores only the short name for wow.zamimg.com,
//    never binaries.
class PaladinSeeder extends Seeder
{
    // Tree slug => [display name, order in the API, data file, Blizzard artwork
    // background (hotlink, educational use) and official zamimg spec icon].
    private const TREES = [
        'holy' => ['name' => 'Holy', 'order' => 1, 'file' => 'paladin_holy.json',
            'background' => 'https://sunderarmor.com/WOW/Calculator/Backgrounds/NEW/holy_paladin.jpg',
            'spec_icon' => 'spell_holy_holybolt'],
        'protection' => ['name' => 'Protection', 'order' => 2, 'file' => 'paladin_protection.json',
            'background' => 'https://sunderarmor.com/WOW/Calculator/Backgrounds/NEW/protection_paladin.jpg',
            'spec_icon' => 'ability_paladin_shieldofthetemplar'],
        'retribution' => ['name' => 'Retribution', 'order' => 3, 'file' => 'paladin_retribution.json',
            'background' => 'https://sunderarmor.com/WOW/Calculator/Backgrounds/NEW/retribution_paladin.jpg',
            'spec_icon' => 'spell_holy_auraoflight'],
    ];

    public function run(): void
    {
        // 1. Paladin class (updateOrInsert = updates the name if it exists,
        //    creates it otherwise).
        DB::table('classes')->updateOrInsert(
            ['slug' => 'paladin'],
            ['name' => 'Paladin', 'created_at' => now(), 'updated_at' => now()]
        );
        $classId = DB::table('classes')->where('slug', 'paladin')->value('id');

        foreach (self::TREES as $slug => $tree) {
            $this->seedTree($classId, $slug, $tree);
        }
    }

    // Seeds one tree: creates the tree row, upserts its talents from JSON,
    // then resolves requires_slug -> requires_talent_id in a second pass.
    private function seedTree(int $classId, string $slug, array $tree): void
    {
        // 2. Tree row (idempotent by slug), including presentation fields.
        DB::table('talent_trees')->updateOrInsert(
            ['slug' => $slug],
            ['class_id' => $classId, 'name' => $tree['name'], 'order' => $tree['order'],
             'background' => $tree['background'], 'spec_icon' => $tree['spec_icon'],
             'created_at' => now(), 'updated_at' => now()]
        );
        $treeId = DB::table('talent_trees')->where('slug', $slug)->value('id');

        // 3. Read the JSON with the real talents of this tree.
        //    base_path() points to the Laravel project root.
        $raw = json_decode(file_get_contents(base_path('database/data/'.$tree['file'])), true);
        $talents = $raw['talents'] ?? [];

        // Pass 1: insert everything with no prerequisite (requires_talent_id=null).
        // The FK cannot be set yet because the required talent may not exist.
        foreach ($talents as $tal) {
            DB::table('talents')->updateOrInsert(
                ['slug' => $tal['slug']],
                [
                    'tree_id' => $treeId,
                    'row' => $tal['row'],
                    'col' => $tal['col'],
                    'name' => $tal['name'],
                    'max_rank' => $tal['max_rank'],
                    'is_gold' => $tal['is_gold'],
                    'requires_talent_id' => null,
                    'status' => $tal['status'],
                    'description' => $tal['description'],
                    'icon' => $tal['icon'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        // Pass 2: resolve requires_slug -> requires_talent_id.
        // Example: illumination.requires_slug=reverence => look up reverence's id.
        foreach ($talents as $tal) {
            if (empty($tal['requires_slug'])) {
                continue;
            }
            $reqId = DB::table('talents')->where('slug', $tal['requires_slug'])->value('id');
            DB::table('talents')->where('slug', $tal['slug'])->update([
                'requires_talent_id' => $reqId,
                'updated_at' => now(),
            ]);
        }

        // Cleanup: delete stale talents of this tree that are no longer in the JSON
        // (e.g. placeholders from the old single-tree seeder).
        $realSlugs = collect($talents)->pluck('slug')->all();
        DB::table('talents')
            ->where('tree_id', $treeId)
            ->whereNotIn('slug', $realSlugs)
            ->delete();
    }
}
