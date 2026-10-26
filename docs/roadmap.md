# Roadmap

Source of truth for scope: `docs/brief.md`. Execution order and prompts:
`docs/runbook.md`.

## Status

| Phase | What | Status |
|---|---|---|
| 0 | Baseline: docs, tests, CI, agent workflow | Complete |
| 1 | Spec: routes, data schemas, hosting, ads, legal | Waiting for owner decisions |
| 2 | Site shell and SEO foundation | Not started |
| 3 | Talent refresh and data hygiene | Not started |
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

## Phase 1 decisions (owner)

1. Hosting and domain: GitHub Pages or Cloudflare Pages.
2. Ad network and activation timing.
3. Analytics provider.
4. Legal identity and contact address.
5. Artwork and logo policy.
6. Authoritative data sources and verification access.
7. BiS pilot specs and supported phases.
8. Launch scope.

Recommended defaults are in `docs/brief.md` and the Step 1 plan.

## Next after Phase 0

1. Answer the Phase 1 decisions.
2. Lock the route map and schemas.
3. Design the home, Raid Comp and BiS wireframes.
4. Start Phase 2 only after the spec is approved.
