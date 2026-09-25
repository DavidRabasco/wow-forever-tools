<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

// Semilla de Paladin para la calculadora WoW Forever.
// --------------------------------------------------
// Que hace:
//  1. Crea la clase 'paladin' y sus 3 arboles (holy/protection/retribution).
//  2. Carga los talentos REALES de Holy desde database/data/paladin_holy.json
//     (scrapeado de wowtbc.gg page-data.json, formato classic 7x4).
//  3. Resuelve prerequisitos en 2 pasadas: primero inserta sin requires_talent_id,
//     despues actualiza con el id del slug requerido (requires_slug -> id).
//
// Como actualizar datos:
//  - Edita database/data/paladin_holy.json (row 1-7, col 1-4, slug unico sin tildes).
//  - Ejecuta: php artisan db:seed --class=Database\\Seeders\\PaladinSeeder
//  - El seeder es idempotente (updateOrInsert por slug), no duplica.
//
// Fuente y licencia:
//  - Datos (c) wowtbc.gg / Blizzard, uso educativo.
//  - Iconos (c) Blizzard: en DB solo nombre corto para wow.zamimg.com, nunca binarios.
class PaladinSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Clase Paladin (updateOrInsert = si existe actualiza nombre, si no crea).
        DB::table('classes')->updateOrInsert(
            ['slug' => 'paladin'],
            ['name' => 'Paladín', 'created_at' => now(), 'updated_at' => now()]
        );
        $classId = DB::table('classes')->where('slug', 'paladin')->value('id');

        // 2. Los 3 arboles existen aunque solo Holy tenga talentos reales de momento.
        //    'order' define el orden en la API (1=Holy primero).
        $trees = [
            ['slug' => 'holy', 'name' => 'Sagrado', 'order' => 1],
            ['slug' => 'protection', 'name' => 'Protección', 'order' => 2],
            ['slug' => 'retribution', 'name' => 'Reprensión', 'order' => 3],
        ];
        foreach ($trees as $tree) {
            DB::table('talent_trees')->updateOrInsert(
                ['slug' => $tree['slug']],
                ['class_id' => $classId, 'name' => $tree['name'], 'order' => $tree['order'], 'created_at' => now(), 'updated_at' => now()]
            );
        }
        $holyId = DB::table('talent_trees')->where('slug', 'holy')->value('id');

        // 3. Lee el JSON con los 17 talentos reales de Holy.
        //    base_path() apunta a la raiz del proyecto Laravel.
        $jsonPath = base_path('database/data/paladin_holy.json');
        $raw = json_decode(file_get_contents($jsonPath), true);
        $talents = $raw['talents'] ?? [];

        // Pasada 1: inserta todos sin prerequisito (requires_talent_id=null).
        // No podemos poner el FK aun porque el talento requerido quiza no existe todavia.
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

        // Pasada 2: resuelve requires_slug -> requires_talent_id.
        // Ejemplo: illumination.requires_slug=reverence => busca id de reverence y lo guarda.
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

        // Limpieza: borra los 4 talentos de prueba del seeder antiguo si quedaron.
        // (bendicion-reyes, juicio-luz-16, sello-verdad, veredicto-final ya no existen en el JSON).
        $slugsReales = collect($talents)->pluck('slug')->all();
        DB::table('talents')
            ->where('tree_id', $holyId)
            ->whereNotIn('slug', $slugsReales)
            ->delete();
    }
}
