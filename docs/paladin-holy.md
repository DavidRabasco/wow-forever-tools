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
| `resources/js/calculator.js` | Generic calculator (API URL from `#trees data-api`): 3 side-by-side 7×4 grids sharing the 51-point pool, per-tree counters, WoW-style borders/arrows/tooltip with verbatim ranks + Next Rank. Commented in English. |
| `resources/views/calculator.blade.php` | Generic `/{class}` view: backend-driven class bar + `#trees` slot (JS-owned) + right-side pick-order panel (`#pick-level`, `#pick-order`). |
| `app/Http/Controllers/Api/PaladinController.php` | Legacy alias: `GET /api/paladin` delegates to `WowClassController@show('paladin')`. |
| `app/Http/Controllers/Api/WowClassController.php` | `GET /api/classes/{slug}` → class + ordered trees + talents by row/col. |
| `app/Http/Controllers/ClassController.php` | `GET /{class}` → `calculator` view with the 9-class bar (backend-driven availability). |
| `app/Console/Commands/ImportForeverClass.php` | `php artisan forever:import {class}`: scrapes wowtbc page-data into `database/data/{class}_{tree}.json` (verbatim ranks, resolved icons/backgrounds, manifest merge). |
| `database/data/classes.json` | Class manifest: trees, files, backgrounds, spec icons. |
| `database/seeders/ForeverClassSeeder.php` | Manifest-driven seeder for all classes (scoped slugs, 2 passes). |
| `database/migrations/2026_09_26_005315_add_presentation_to_talent_trees.php` | Adds `background` (full artwork URL) + `spec_icon` (zamimg short name) to `talent_trees`. |

## 3. Rules (level 60 = 51 points)

Classic grants 1 point per level from 10 → **51 points** at 60 (`MAX_TOTAL_POINTS`).
- Per talent: `state <= max_rank`.
- Row R needs `(R-1)*5` points in the rows ABOVE it (rows 1..R-1; its own points never count). Row 7 needs 30 above, so no exemption is required for the 1-point capstone.
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
`node --check resources/js/calculator.js` OK.

## 8. Multi-class pipeline (Warrior pilot, 2026-09-26, done)

New classes no longer need hand-written summaries or per-class seeders:
`php artisan forever:import {class}` downloads the wowtbc page-data, writes
`database/data/{class}_{tree}.json` with verbatim `ranks[]` + `skill` blocks,
resolves icons against Wowhead Forever data, probes artwork backgrounds, and
merges `database/data/classes.json` (spec icons are filled by hand after a
zamimg 200-check). `talents` carries nullable `ranks`/`skill` JSON columns;
slugs are unique per parent (`(slug, tree_id)`, `(slug, class_id)`).
The tooltip shows the current verbatim rank plus `Next Rank:` while skilling
(hand-summary Paladin rows keep the old single-text rendering until migrated).
Warrior pilot: 53 talents (17/18/18), icons 53/53, backgrounds verified,
`/warrior` + `/api/classes/warrior` 200, `/druid` correctly 404.

## 5. Icon status (2026-09-25, done)

`icon` stores the **`wow.zamimg` short name** (e.g. `spell_holy_searinglight`); the JS
builds `https://wow.zamimg.com/images/wow/icons/medium/{icon}.jpg` with text fallback.
Source: `nether.wowhead.com/forever/data/talents-classic?db=1790292378` (Forever data,
not Classic): 9 icons match Classic and 8 are new in Forever
(`ability_thunderbolt`, `inv_misc_horn_03`, `spell_holy_divineillumination`,
`spell_holy_purifyingpower`, `ability_paladin_infusionoflight`,
`spell_holy_healingfocus`, `spell_holy_innerfire`,
`ability_paladin_judgementofthepure`). All 17 verified with HTTP 200 on zamimg.

## 6. Presentation (2026-09-26, done)

Each tree renders as a WoW-style framed panel: official Blizzard artwork as
background (same classic textures Wowhead shows; Wowhead builds its zamimg path
at runtime from beta data, so the identical art is hotlinked from sunderarmor
with a dark fallback base), dimmed with a black gradient for icon readability,
bronze/gold double edge, and a header with the official retail spec icon
(Holy `spell_holy_holybolt`, Protection `ability_paladin_shieldofthetemplar`,
Retribution `spell_holy_auraoflight`) + gold tree name. Fields live on
`talent_trees` (`background`, `spec_icon`) and travel in the API.

## 7. Pick-order panel (2026-09-26, done)

Right-side list with one line per spent point, in learn order:
`Level 10 - Divine Strength 1/5`, `Level 11 - Divine Strength 2/5`...
Line *i* = level 10+*i*, rank shown is the running count. Header shows the
character level (9 + spent points; 51 pts = 60). Spending appends, removing
drops that talent's most recent pick, so the list is always a valid sequence.

## 9. Pending

1. `status`: everything is `unchanged` today; diff against Classic to flag `new/changed/moved/now_baseline`.
2. `builds` (6-char hash): shareable save/load builds — table created, API pending.
3. All 9 classes live (2026-09-26, done): 466 talents via `forever:import`, icons 466/466 (2 hand-fixed: primal-bite, blood-frenzy), backgrounds verified, spec icons retail-official (doubtful ones visually inspected), `/druid ... /warlock` 200.
4. Paladin `description` summaries: optionally re-import verbatim ranks via the importer for Next-Rank tooltips.
