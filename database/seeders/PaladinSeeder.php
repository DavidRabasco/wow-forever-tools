<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Paladin seed for the WoW Forever calculator.
// --------------------------------------------------
// What it does:
//  1. Creates the 'paladin' class and its 3 trees (holy/protection/retribution).
//  2. Loads the REAL Holy talents from database/data/paladin_holy.json
//     (scraped from wowtbc.gg page-data.json, classic 7x4 format).
//  3. Resolves prerequisites in 2 passes: first inserts with requires_talent_id
//     empty, then updates it with the id of the required slug
//     (requires_slug -> id).
//
// How to update data:
//  - Edit database/data/paladin_holy.json (row 1-7, col 1-4, unique ASCII slug).
//  - Run: php artisan db:seed --class=Database\\Seeders\\PaladinSeeder
//  - The seeder is idempotent (updateOrInsert by slug), it never duplicates.
//
// Source and license:
//  - Data (c) wowtbc.gg / Blizzard, educational use.
//  - Icons (c) Blizzard: the DB stores only the short name for wow.zamimg.com,
//    never binaries.
class PaladinSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Paladin class (updateOrInsert = updates the name if it exists,
        //    creates it otherwise).
        DB::table('classes')->updateOrInsert(
            ['slug' => 'paladin'],
            ['name' => 'Paladin', 'created_at' => now(), 'updated_at' => now()]
        );
        $classId = DB::table('classes')->where('slug', 'paladin')->value('id');

        // 2. All 3 trees exist even though only Holy has real talents for now.
        //    'order' sets the API order (1=Holy first).
        $trees = [
            ['slug' => 'holy', 'name' => 'Holy', 'order' => 1],
            ['slug' => 'protection', 'name' => 'Protection', 'order' => 2],
            ['slug' => 'retribution', 'name' => 'Retribution', 'order' => 3],
        ];
        foreach ($trees as $tree) {
            DB::table('talent_trees')->updateOrInsert(
                ['slug' => $tree['slug']],
                ['class_id' => $classId, 'name' => $tree['name'], 'order' => $tree['order'], 'created_at' => now(), 'updated_at' => now()]
            );
        }
        $holyId = DB::table('talent_trees')->where('slug', 'holy')->value('id');

        // 3. Read the JSON with the 17 real Holy talents.
        //    base_path() points to the Laravel project root.
        $jsonPath = base_path('database/data/paladin_holy.json');
        $raw = json_decode(file_get_contents($jsonPath), true);
        $talents = $raw['talents'] ?? [];

        // Pass 1: insert everything with no prerequisite (requires_talent_id=null).
        // The FK cannot be set yet because the required talent may not exist.
        foreach ($talents as $tal) {
            DB::table('talents')->updateOrInsert(
                ['slug' => $tal['slug']],
                [
                    'tree_id' => $holyId,
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

        // Cleanup: delete the 4 placeholder talents from the old seeder if left over.
        // (bendicion-reyes, juicio-luz-16, sello-verdad, veredicto-final are not in the JSON).
        $realSlugs = collect($talents)->pluck('slug')->all();
        DB::table('talents')
            ->where('tree_id', $holyId)
            ->whereNotIn('slug', $realSlugs)
            ->delete();
    }
}
