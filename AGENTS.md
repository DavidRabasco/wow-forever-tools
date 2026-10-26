# WoW Forever Tools

Talent calculator and build planner for WoW Forever (Classic rules, level 60,
51 talent points). Nine classes, three trees each, URL-only build sharing.

## Source of truth

- `docs/brief.md`: scope, constraints, data policy, phases, acceptance criteria.
- `docs/runbook.md`: execution order, model per step, copy-paste prompts.
- `docs/agents.md`: agent roster, file ownership, review rules.
- `docs/architecture.md`: how the app, data pipeline and static export fit.
- `docs/data-policy.md`: how gameplay data is sourced and verified.
- `docs/roadmap.md`: current phase and what comes next.
- `docs/calculator.md`: historical implementation notes for the calculator.

Read the brief before changing behavior. If code and docs disagree, stop and ask.

## Stack

Laravel 13, PHP 8.3, local SQLite, Vite 8, Tailwind CSS 4, vanilla JS. PHPUnit
for PHP, Vitest for the pure JS modules.

## Commands

```sh
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --force
php artisan db:seed --class="Database\Seeders\ForeverClassSeeder" --force
npm install

npm test                  # Vitest: rules + URL codec
npm run build             # Vite bundle
node --check resources/js/calculator.js
php artisan test          # data integrity + static export
php artisan forever:export dist
```

Production is `dist/`. It must work with no PHP and no database.

## Hard rules

- Static-first. Do not add a runtime backend, API or database.
- All user state lives in the URL or `localStorage`. Builds use `?b=`. Do not
  change that format or break existing links.
- Existing URLs must keep working, including static `{class}.html` links.
- Laravel and SQLite are local tooling. Data comes from `database/data/*.json`
  through the seeder and importer.
- English only for UI, docs, comments, data and commit messages.
- No fabricated gameplay data. Every game fact needs a source and a `verified`
  flag. Unknown values stay `null` and render as "Not verified".
- Icons come from `wow.zamimg.com`; keep the wowtbc.gg/Blizzard attribution.
- Vanilla JS modules and Tailwind. No SPA framework, no new runtime dependency
  without approval.
- Accessibility is a requirement: keyboard, touch, focus, contrast, labels.
- Do not install Laravel Boost. The old bootstrap is gone on purpose.
- No agent commits, pushes, force-pushes, rewrites history or deploys. The
  orchestrator does that after review.

## Working agreement

- One phase at a time. Read the phase in `docs/brief.md` and its prompt in
  `docs/runbook.md`.
- Small diffs. No unrelated refactors.
- A rule or data change needs a test that fails without it.
- Update the docs when behavior changes.
- Run the verification commands before reporting done.
- Stop and ask when a change would break a URL, add a dependency, add a paid
  service, or require an unverifiable data fact.

## Current phase

Phase 0 (baseline and guardrails), Phase 1 (spec) and Phase 2 (site shell and
SEO foundation) are complete. Phase 3 (talent refresh and data hygiene) is next.
See `docs/roadmap.md` and `docs/decisions/2026-10-26-phase-1-defaults.md`.
