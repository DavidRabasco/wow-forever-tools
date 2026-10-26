# Roadmap

Source of truth for scope: `docs/brief.md`. Execution order and prompts:
`docs/runbook.md`.

## Status

| Phase | What | Status |
|---|---|---|
| 0 | Baseline: docs, tests, CI, agent workflow | Complete |
| 1 | Spec: routes, data schemas, hosting, ads, legal | Approved with changes |
| 2 | Site shell and SEO foundation | Complete |
| 3 | Talent refresh and data hygiene | Next |
| 4 | Raid Comp MVP | Not started |
| 5 | BiS MVP | Not started |
| 6 | Monetization and launch | Not started |
| 7 | Iterate | Not started |

## Phase 0 checklist

- [x] Commit planning docs and agent files.
- [x] Create `feat/phase-0-baseline`.
- [x] Replace the Boost bootstrap in `AGENTS.md` with project rules.
- [x] Replace `CLAUDE.md` with a pointer to `AGENTS.md`.
- [x] Fix stale README references.
- [x] Add `docs/architecture.md`, `docs/data-policy.md`, `docs/roadmap.md`.
- [x] Extract pure JS rules and codec modules.
- [x] Add Vitest and `npm test`.
- [x] Add all-class data integrity test.
- [x] Add static-export test.
- [x] Add CI workflow and make deploy depend on tests.
- [x] Run the full verification suite.
- [x] Commit Phase 0.

Verification: 17 Vitest tests, 10 PHPUnit tests (4,923 assertions), Vite build,
and a 9-class / 466-talent static export with no dev-server or absolute asset
references.

## Phase 1 checklist

- [x] Route map and URL compatibility plan.
- [x] Data schemas for specs, buffs, debuffs and BiS.
- [x] Hosting comparison (`docs/hosting.md`).
- [x] Ad and legal plan (`docs/legal/plan.md`).
- [x] Wireframes for home, calculator, Raid Comp and BiS
      (`docs/design/wireframes.md`).
- [x] Decision record with recommended defaults
      (`docs/decisions/2026-10-26-phase-1-defaults.md`).
- [x] Owner confirms or changes the eight decisions.
- [x] Owner approves the spec, which unlocks Phase 2.

## Phase 2 checklist

- [x] Shared site layout, navbar, footer and meta partials.
- [x] Home with class grid and tool cards.
- [x] About and Sources pages.
- [x] Privacy, Terms and Contact drafts (`noindex` until launch).
- [x] Raid Comp and BiS "in development" pages.
- [x] 404 page.
- [x] Favicon, robots.txt and optional sitemap.xml.
- [x] Relative URL rewriting for every static page.
- [x] Exporter tests for the new pages and metadata.
- [x] Lighthouse SEO and accessibility check.
- [x] Visual QA at 1440px and 390px.
- [x] Commit Phase 2.

Results:

- Home Lighthouse: performance 100, accessibility 100, best practices 100, SEO 100.
- Calculator Lighthouse: accessibility 100, SEO 100, best practices 96,
  performance 67. Accessibility and SEO meet the Phase 2 target. Performance is
  a Phase 6 follow-up (image delivery, cache, LCP).
- Desktop and 390px layouts were checked with headless Chrome. The 390px
  screenshots use an iframe because headless Chrome enforces a wider minimum
  window; the iframe viewport is a true 390px.
- The calculator inlines its class JSON, so the first render does not wait for
  a request. The `data-api` fallback remains for Laravel dev pages.

## Phase 1 decisions (owner)

1. Hosting and domain: GitHub Pages or Cloudflare Pages.
2. Ad network and activation timing.
3. Analytics provider.
4. Legal identity and contact address.
5. Artwork and logo policy.
6. Authoritative data sources and verification access.
7. BiS pilot specs and supported phases.
8. Launch scope.

Recommended defaults are in
`docs/decisions/2026-10-26-phase-1-defaults.md`.

## Next after Phase 1

1. Confirm the eight decisions.
2. Approve the spec.
3. Start Phase 2 with the designer and implementer.
4. Do not start data work until the verification access in decision 6 is clear.
