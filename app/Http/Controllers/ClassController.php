<?php

namespace App\Http\Controllers;

use App\Models\WowClass;

// Serves the talent calculator page for any seeded class (GET /{class}).
class ClassController extends Controller
{
    public function show(string $class)
    {
        $wowClass = WowClass::where('slug', $class)->firstOrFail();

        // Bar entries from the catalog (config/forever.php); availability =
        // seeded in DB. Portrait art lives at sunderarmor (reference set).
        $available = WowClass::pluck('slug')->all();
        $classes = [];
        foreach (config('forever.classes') as $slug => $name) {
            $classes[] = [
                'slug' => $slug,
                'name' => $name,
                'icon' => "https://sunderarmor.com/WOW/Classes/Old/{$slug}.png",
                'available' => in_array($slug, $available, true),
                'selected' => $slug === $wowClass->slug,
            ];
        }

        return view('calculator', [
            'wowClass' => $wowClass,
            'classes' => $classes,
        ]);
    }
}
