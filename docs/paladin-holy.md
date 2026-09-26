# Holy Paladin (WoW Forever) — how it was built

Project language: English only (no localization planned). All user-facing
strings, data, comments and docs are in English.

## 1. Data source (scraping)

Yes, it can be scraped. Wowhead Forever (`wowhead.com/forever/talent-calc`) is a
React SPA: the initial HTML is empty and talents hydrate via JS, so a plain
`fetch` of the HTML returns no names.

What works:

- **wowtbc.gg** (Gatsby) exposes the hydrated JSON at:
  `https://wowtbc.gg/page-data/warcraftforever/talent-calculator/paladin/page-data.json`
  → `result.pageContext.talentData[]` with `name, tree, row (r1-r7), column (c1-c4),
  total_ranks, pre_req, arrow, value[]/skill, global_req`.
- The **17 Holy talents** (ids 2–18) used here come from there.
- **Wowhead** also allows inspecting `WH TalentCalc` in DevTools → Network/XHR,
  but full datamining needs an API key / beta client. Once the beta opens,
  compare `status` (new/changed/moved) and `is_gold` (11/21/31/16).

Mandatory attribution: data (c) wowtbc.gg / Blizzard, icons (c) Blizzard.
The DB stores only the icon **short name** (`spell_holy_x`), never binaries;
the JS builds `https://wow.zamimg.com/images/wow/icons/medium/{icon}.jpg` with
text fallback.

## 2. Files

| File | What it is |
|---|---|
| `database/data/paladin_holy.json` | Source of truth: 17 Holy talents (row/col/slug/max_rank/requires_slug/status/description/icon). |
| `database/data/paladin_protection.json` | Same schema: 16 Protection talents. |
| `database/data/paladin_retribution.json` | Same schema: 17 Retribution talents. |
| `database/data/paladin_holy_template.json` | Original empty template, kept as a field reference. |
| `database/seeders/PaladinSeeder.php` | Creates the class + 3 trees and loads the JSON in 2 passes (insert, then resolve `requires_slug → requires_talent_id`). Idempotent + deletes old test talents. |
| `resources/js/paladin.js` | 3 side-by-side 7×4 grids sharing the 51-point pool, per-tree counters, WoW-style borders/arrows/tooltip. Commented in English. |
| `resources/views/paladin.blade.php` | `/paladin` view (only the `#trees` container, the JS paints the rest). |
| `app/Http/Controllers/Api/PaladinController.php` | `GET /api/paladin` → class + ordered trees + talents by row/col. |

## 3. Rules (level 60 = 51 points)

Classic grants 1 point per level from 10 → **51 points** at 60 (`MAX_TOTAL_POINTS`).
- Per talent: `state <= max_rank`.
- Row R needs `(R-1)*5` tree points (row 7 = 30 pts).
- Prerequisite: the required talent must be maxed
  (`illumination ← reverence`, `divine-precision ← holy-shock`, `lights-vigil ← holy-shock`).
- Removal: the state with −1 is simulated and rejected if it breaks a row gate or prerequisite.
- Gold: `holy-shock` (~21 pts) and `lights-vigil` (~31 pts) carry `is_gold=true`.
  **Verify** against the Wowhead beta (the JSON does not flag gold talents).

## 4. Commands (local SQLite)

`.env` now uses SQLite (it previously pointed at an unavailable MySQL):

```powershell
php artisan migrate --force
php artisan db:seed --class="Database\Seeders\PaladinSeeder" --force
npm run build   # or npm run dev for Vite
```

Verified: 50/50 talents (17 Holy + 16 Protection + 17 Retribution), 7 prerequisites resolved, `php artisan test` 2/2 OK,
`node --check resources/js/paladin.js` OK.

## 5. Icon status (2026-09-25, done)

`icon` stores the **`wow.zamimg` short name** (e.g. `spell_holy_searinglight`); the JS
builds `https://wow.zamimg.com/images/wow/icons/medium/{icon}.jpg` with text fallback.
Source: `nether.wowhead.com/forever/data/talents-classic?db=1790292378` (Forever data,
not Classic): 9 icons match Classic and 8 are new in Forever
(`ability_thunderbolt`, `inv_misc_horn_03`, `spell_holy_divineillumination`,
`spell_holy_purifyingpower`, `ability_paladin_infusionoflight`,
`spell_holy_healingfocus`, `spell_holy_innerfire`,
`ability_paladin_judgementofthepure`). All 17 verified with HTTP 200 on zamimg.

## 6. Pending

1. `status`: everything is `unchanged` today; diff against Classic to flag `new/changed/moved/now_baseline`.
2. `builds` (6-char hash): shareable save/load builds — table created, API pending.
