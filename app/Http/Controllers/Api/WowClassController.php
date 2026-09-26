<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WowClass;

class WowClassController extends Controller
{
    // One endpoint for every class: GET /api/classes/{slug}.
    // Returns the class with its trees (ordered) and talents (by row/col),
    // including background/spec_icon plus ranks[]/skill when imported.
    public function show(string $slug)
    {
        $class = WowClass::where('slug', $slug)
            ->with(['trees' => fn($q) => $q->orderBy('order'),
                    'trees.talents' => fn($q) => $q->orderBy('row')->orderBy('col')])
            ->firstOrFail();

        return response()->json($class);
    }
}
