<?php

namespace App\Http\Controllers;

use App\Models\WowClass;

// Serves the talent calculator page for any seeded class (GET /{class}).
class ClassController extends Controller
{
    // The 9 Forever classes in bar order. Only seeded ones are clickable;
    // the rest render dimmed with a "coming soon" tooltip (see the view).
    private const CLASSES = [
        'druid' => 'Druid',
        'hunter' => 'Hunter',
        'mage' => 'Mage',
        'paladin' => 'Paladin',
        'priest' => 'Priest',
        'rogue' => 'Rogue',
        'shaman' => 'Shaman',
        'warlock' => 'Warlock',
        'warrior' => 'Warrior',
    ];

    public function show(string $class)
    {
        $wowClass = WowClass::where('slug', $class)->firstOrFail();

        // Bar entries: portrait art lives at sunderarmor (same set as reference).
        $available = WowClass::pluck('slug')->all();
        $classes = [];
        foreach (self::CLASSES as $slug => $name) {
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
