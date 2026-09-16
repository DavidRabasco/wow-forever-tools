<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PaladinSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        //1. Clase
        $classId = DB::table('classes')->updateOrInsert(
            ['slug' => 'paladin'],
            ['name' => 'Paladín', 'created_at' => now(), 'updated_at' => now()]
        );
        $classId = DB::table('classes')->where('slug', 'paladin')->value('id');

        //2. Árboles de talentos
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

        //3. Talentos de ejemplo (ahora solo Holy)
        $talents = [
            [
                'tree_id' => $holyId, 'row' => 3, 'col' => 2,
                'slug' => 'bendicion-reyes', 'name' => 'Bendición de Reyes',
                'max_rank' => 1, 'is_gold' => false, 'requires_talent_id' => null,
                'status' => 'now_baseline', 'description' => 'Antes talento, ahora base en Forever.', 'icon' => null,
            ],
            [
                'tree_id' => $holyId, 'row' => 4, 'col' => 2,
                'slug' => 'juicio-luz-16', 'name' => 'Juicio de Luz (16)',
                'max_rank' => 1, 'is_gold' => true, 'requires_talent_id' => null,
                'status' => 'new', 'description' => 'Nuevo dorado de 16 puntos.', 'icon' => null,
            ],
            [
                'tree_id' => $holyId, 'row' => 5, 'col' => 1,
                'slug' => 'sello-verdad', 'name' => 'Sello de la Verdad',
                'max_rank' => 5, 'is_gold' => false, 'requires_talent_id' => null,
                'status' => 'moved', 'description' => 'Movido de fila sin cambios.', 'icon' => null,
            ],
        ];

         foreach ($talents as $tal) {
            DB::table('talents')->updateOrInsert(
                ['slug' => $tal['slug']],
                $tal + ['created_at' => now(), 'updated_at' => now()]
            );
        }

        //4. Talento que requiere otro talento
        $reqId = DB::table('talents')->where('slug', 'sello-verdad')->value('id');
        DB::table('talents')->updateOrInsert(
            ['slug' => 'veredicto-final'],
            [
                'tree_id' => $holyId, 'row' => 6, 'col' => 1,
                'name' => 'Veredicto Final', 'max_rank' => 1, 'is_gold' => false,
                'requires_talent_id' => $reqId, 'status' => 'unchanged',
                'description' => 'Requiere Sello de la Verdad.', 'icon' => null,
                'created_at' => now(), 'updated_at' => now(),
            ]
        );
    }
}
