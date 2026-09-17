<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\WowClass;

class PaladinController extends Controller
{
    public function show()
    {
        //Recupera la clase Paladin junto con sus árboles de talentos y talentos ordenados
        $class = WowClass::where('slug', 'paladin')
            ->with(['trees' => fn($q) => $q->orderBy('order'),
                    'trees.talents' => fn($q) => $q->orderBy('row')->orderBy('col')])
            ->firstOrFail();

        return response()->json($class);
    }
}
