# Roadmap

Source of truth for scope: `docs/brief.md`. Execution order and prompts:
`docs/runbook.md`.

## Status

| Phase | What | Status |
|---|---|---|
| 0 | Baseline: docs, tests, CI, agent workflow | Complete |
| 1 | Spec: routes, data schemas, hosting, ads, legal | Draft ready; waiting for owner decisions |
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

## Phase 1 checklist

- [x] Route map and URL compatibility plan.
- [x] Data schemas for specs, buffs, debuffs and BiS.
- [x] Hosting comparison (`docs/hosting.md`).
- [x] Ad and legal plan (`docs/legal/plan.md`).
- [x] Wireframes for home, calculator, Raid Comp and BiS
      (`docs/design/wireframes.md`).
- [x] Decision record with recommended defaults
      (`docs/decisions/2026-10-26-phase-1-defaults.md`).
- [ ] Owner confirms or changes the eight decisions.
- [ ] Owner approves the spec, which unlocks Phase 2.

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
