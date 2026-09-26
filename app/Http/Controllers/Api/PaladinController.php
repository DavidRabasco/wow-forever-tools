<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

class PaladinController extends Controller
{
    // Legacy alias kept for bookmarks: GET /api/paladin.
    // New code uses GET /api/classes/{slug}.
    public function show()
    {
        return app(WowClassController::class)->show('paladin');
    }
}
