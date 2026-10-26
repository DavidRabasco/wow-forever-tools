# Architecture

This project has two modes:

1. **Local development**: Laravel serves `/{class}` and `/api/classes/{slug}`
   from SQLite. Vite serves the CSS and JS.
2. **Production**: a static export in `dist/` with HTML, JSON and the Vite
   bundle. No PHP, no database, no server-side requests.

The calculator is the same code in both modes. The only difference is whether it
fetches `/api/classes/{slug}` or a sibling `{class}.json` file.

## Data flow

```text
database/data/classes.json            class/tree manifest
database/data/{class}_{tree}.json     talents (source of truth)
        |
        |  php artisan db:seed --class=ForeverClassSeeder
        v
SQLite (local only)
        |
        +--> GET /api/classes/{slug}   Laravel dev
        |
        +--> php artisan forever:export dist
                 |
                 +--> {class}.json     same shape, no runtime API
                 +--> {class}.html     server-rendered view, relative links
                 +--> index.html       minimal class picker for now
                 +--> build/           Vite bundle
                 +--> .nojekyll
```

The exporter does not need a database. It reads the manifest and the per-tree
JSON files directly, assigns ids in API order, resolves `requires_slug` to
`requires_talent_id`, and writes deterministic JSON.

## Calculator modules

`resources/js/calculator.js` is the browser entry point. It owns the DOM,
tooltip, dependency arrows, pick-order panel, level selector and URL sync.

Pure logic lives in small modules so Vitest can test it without a browser:

- `resources/js/calculator/constants.js`: `MAX_TOTAL_POINTS`, level bounds.
- `resources/js/calculator/rules.js`: pool, row gate, prerequisites, removal,
  level cap.
- `resources/js/calculator/codec.js`: `?b=` encoder and decoder.

The entry point wraps the modules with its live `state`, `trees` and `pointCap`.
Call sites stay the same; the rules cannot drift between tests and production.

## Rules

- One point per level from 10 to 60: 51 points at 60.
- Shared pool across the three trees.
- Per-talent cap: `state[slug] <= max_rank`.
- Strict per-row gate: row R needs `(R-1)*5` points in rows above it. A row never
  counts its own points.
- Prerequisite: the required talent must be maxed.
- Removal is simulated first. It is rejected if it would break a row gate or a
  prerequisite for any skilled talent.

## Share links

`?b=` is base64url of `[pick count][6 bits per pick]`, using the deterministic
API order (trees by `order`, talents by `row` then `col`). The count byte
separates real picks from padding.

The address bar is live-synced on every spend, remove, level change and load.
Opening a link replays the picks through `canSpend`, so a tampered or truncated
link cannot create an illegal build.

Do not change this format. It is part of the public contract.

## Static export and URLs

Current output is flat: `paladin.html`, `paladin.json`, and so on. The public
site phase moves to directory-based URLs (`/paladin/`, `/bis/paladin/holy/`) and
keeps `{class}.html` stubs so existing links keep working.

The exporter rewrites absolute asset and data paths to relative ones, because
the site can live under `user.github.io/repo/`. `data-api` becomes a sibling
JSON file and class links become sibling pages.

## Deployment

`.github/workflows/pages.yml` builds the Vite bundle, runs the exporter, uploads
`dist/` and deploys to GitHub Pages. A stale `public/hot` file is moved aside
during export so `@vite` never emits dev-server tags.

Phase 0 adds a CI workflow that runs the JS tests, PHP tests, build and export.
The deployment must not be considered safe until CI is required for the branch
or the deploy workflow depends on it.

## Failure modes to keep in mind

- A scraper change can silently alter a talent, rank or prerequisite. The importer
  needs a diff report before data is committed.
- A static path rewrite that misses the app URL prefix can produce
  `http://localhost:8000./build/...` (this happened once).
- Adding a runtime API call would break production. All tool data must be
  exported as JSON.
- Changing talent order would invalidate every shared `?b=` link.
- A missing `public/build/manifest.json` makes `@vite` fail during export.
