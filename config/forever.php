<?php

// WoW Forever catalog: the 9 playable classes in display order.
// The calculator shows all 9 in the class bar; only DB-seeded ones link.
// Seeded class content (trees, files, art) lives in database/data/classes.json.
return [
    // Absolute public URL used for canonical links and sitemap.xml.
    // Leave empty until the site has a domain; the exporter then skips both.
    'site_url' => env('SITE_URL'),

    'classes' => [
        'druid' => 'Druid',
        'hunter' => 'Hunter',
        'mage' => 'Mage',
        'paladin' => 'Paladin',
        'priest' => 'Priest',
        'rogue' => 'Rogue',
        'shaman' => 'Shaman',
        'warlock' => 'Warlock',
        'warrior' => 'Warrior',
    ],
];
