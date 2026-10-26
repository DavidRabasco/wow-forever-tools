# Execution runbook

Practical order of work for turning WoW Forever Tools into a public site. Read
`docs/brief.md` for scope and `docs/agents.md` for agent ownership. This file is
the checklist: model, agent, prompt, output, and the gate to move on.

Last updated: 2026-10-26

## 0. Preflight

Check the account and the provider before spending time on prompts:

```sh
opencode auth list
```

It must show **OpenCode Go**. If it shows `0 credentials`:

```sh
opencode console login
opencode auth login opencode
opencode auth list
```

Then, in the TUI:

```text
/models
```

Look for `opencode-go/deepseek-v4.1-flash`. If the DeepSeek models are missing,
open the Console, go to **Settings > Privacy > Regions**, and enable **Global**.

Check the Go plan and usage at https://opencode.ai/console. Go is $10/month and
Go Plus is $40/month. The $15 models (V4 Pro, Kimi K3.1 Pro, GLM-5.3) are for
short, focused sessions. The $60 to $80 models are the daily workhorses.

If Go is not connected yet, Step 1 still works with the free model. Steps 2 and
later expect the models below. The subagents in `.opencode/agents/` already pin
their models; if Go is unavailable, remove the `model:` lines temporarily and
they will inherit the session model.

### If a Go model fails

`Upstream request failed: Endpoint is unavailable` is the generic UI message.
The log has the real cause:

```text
%USERPROFILE%\.local\share\opencode\log\opencode.log
```

Common causes and fixes:

| Log message | Fix |
|---|---|
| `This Go model requires Global regions` | Console > Settings > Privacy > Regions > enable **Global** |
| `Insufficient account funds` | Check the Go plan, usage and Extra Usage in the Console |
| `UNKNOWN_MODEL` | Re-select the model in `/models`; verify the provider prefix is `opencode-go` |
| Connection or 5xx errors | Retry once, then switch to a fallback model |

DeepSeek V4.1 Flash and V4 Pro both require the Global region setting. If you
cannot enable it, use `kimi-k3.1-pro` or `glm-5.2` for the architecture step.
Both are non-DeepSeek models and usually work without that setting.

## 1. Model and agent map

| Work | Model | Agent |
|---|---|---|
| Architecture, schema, hard bugs | `opencode-go/deepseek-v4-pro` | Build |
| Day-to-day implementation | `opencode-go/deepseek-v4.1-flash` | Build / implementer |
| UI, layout, accessibility | `opencode-go/glm-5.2` | designer |
| Data curation and bulk edits | `opencode-go/glm-5.3-flash` | data-curator |
| Review | `opencode-go/deepseek-v4-pro` | reviewer |
| Final independent audit | `opencode-go/kimi-k3.1-pro` | reviewer |
| Legal and SEO drafts | `opencode-go/glm-5.2` | legal-seo |

Switch the session model with `/models`. Subagents use the model in their
frontmatter, so you do not need to switch before asking for one.

## 2. Session discipline

- One phase per session. Start a fresh session for each step.
- Do not let the architect implement. Do not let the implementer invent data.
- The orchestrator reads the diff, runs the verification commands, and commits.
- Subagents never commit, push, or deploy.
- Parallel subagents only when their file sets are disjoint.
- After each phase: tests, build, export, docs, commit. Then next phase.

## Step 1: plan

Model: `opencode-go/deepseek-v4-pro`
Agent: Build
Output: plan, open decisions, no code

```text
Read docs/brief.md, docs/agents.md, AGENTS.md, README.md and docs/calculator.md.
Do not edit files. Ignore the Laravel Boost bootstrap; Boost is not installed.

Return:
1. current-state summary and discrepancies with the brief,
2. at most 8 blocking decisions for Phase 0/1,
3. Phase 0 plan with exact files, commands and acceptance checks,
4. Phase 1 outline: route map, data schemas, hosting, ads, legal,
5. three risks and what you would cut if scope grows.

Wait for my approval before editing anything.
```

Gate: the plan names exact files and commands, and the open questions are
answerable by the owner, not by the model.

## Step 2: Phase 0, baseline

Model: `opencode-go/deepseek-v4.1-flash`
Agent: Build, optionally `implementer`
Output: green tests, CI, docs, no feature work

```text
Implement Phase 0 from docs/brief.md only. Branch: feat/phase-0-baseline.
Scope: replace the Boost bootstrap in AGENTS.md; fix stale README references; add docs/architecture.md, docs/data-policy.md and docs/roadmap.md; add Vitest for the rules engine and URL codec; extend the PHP tests; make CI run tests, build and export. Keep .opencode/agents as is.

Do not start Phase 1. Run node --check resources/js/calculator.js, npm test, npm run build, php artisan test and php artisan forever:export dist. Report summary, files, commands, risks.
```

Gate: `php artisan test`, `npm test`, `npm run build`, and
`php artisan forever:export dist` pass. README matches the code.

## Step 3: Phase 1, spec

Model: `opencode-go/deepseek-v4-pro`
Agent: Build
Output: route map and data schemas, no code

```text
Phase 1 only, no code. Using docs/brief.md, write docs/roadmap.md with the final route map and JSON schemas for buffs, debuffs, specs and BiS. Include the hosting recommendation (GitHub Pages vs Cloudflare Pages), the ad network and consent plan, and the legal page list. Stop for approval.
```

Model: `opencode-go/glm-5.2`
Agent: designer
Output: wireframes, no code

```text
Use the designer subagent to add docs/design/wireframes.md with text wireframes for home, /raid-comp and /bis/{class}/{spec}. Mobile first, WoW palette, accessibility notes. No code.
```

Gate: the owner approves the route map, schemas, hosting, ad plan, and
wireframes before any code.

## Step 4: Phase 2, site shell and SEO

Model: `opencode-go/glm-5.2`
Agent: designer
Output: Blade/Tailwind shell

```text
Use the designer subagent to implement the Phase 2 visual shell in Blade and Tailwind: home, nav, footer, legal shells and 404. Follow docs/brief.md and docs/design/wireframes.md. Do not touch JS, routes or data.
```

Model: `opencode-go/deepseek-v4.1-flash`
Agent: implementer
Output: static routes, meta/OG, sitemap, robots, analytics hook

```text
Use the implementer subagent to wire Phase 2 into the static exporter: per-page meta/OG/canonical, sitemap.xml, robots.txt, favicon, analytics hook, consent placeholder and the new routes. Add exporter tests. Do not start Phase 3.
```

Model: `opencode-go/deepseek-v4-pro`
Agent: reviewer
Output: findings and sign-off

```text
Use the reviewer subagent to review the Phase 2 diff against docs/brief.md. Findings by severity with file:line. Do not edit.
```

Gate: Lighthouse SEO and accessibility >= 95 on home and one class page, every
exported page exists, no broken links.

## Step 5: Phase 3, talent refresh

Model: `opencode-go/deepseek-v4.1-flash`
Agent: implementer
Output: importer diff report, tests, no data changes

```text
Use the implementer subagent to add a talent diff report to the importer: new/changed/moved/removed talents, ranks, icons, gold and status, with tests. Do not modify database/data yet.
```

Model: `opencode-go/glm-5.3-flash`
Agent: data-curator
Output: updated talent JSON with sources

```text
Use the data-curator subagent to run the diff, update only the affected talent JSON files, and record sources in docs/data/. Do not mark verified without two sources. Report changed and unverified rows.
```

Model: `opencode-go/deepseek-v4-pro`
Agent: reviewer
Output: truth and regression review

```text
Use the reviewer subagent to review the talent data diff for truth and regressions. Do not edit.
```

Gate: the diff is reviewed, the data change is documented, no unverified fact is
marked as verified.

## Step 6: Phase 4, Raid Comp

Model: `opencode-go/glm-5.3-flash`
Agent: data-curator
Output: buffs, debuffs, specs

```text
Use the data-curator subagent to create database/data/game/specs.json, buffs.json and debuffs.json for all 9 classes, following docs/brief.md. Every row needs source_url, verified, last_checked, stacking and exclusive_group. Report unverified rows.
```

Model: `opencode-go/glm-5.2`
Agent: designer
Output: wireframe for the tool

```text
Use the designer subagent to design /raid-comp: party/raid size, class/spec slots, coverage matrix, conflicts, missing buffs, share and text export. Mobile first. Add docs/design/raid-comp.md, no code.
```

Model: `opencode-go/deepseek-v4.1-flash`
Agent: implementer
Output: the working tool and tests

```text
Use the implementer subagent to implement /raid-comp and the ?comp= codec, coverage and conflict logic, share and Discord text export, with tests. Read data from JSON, do not hardcode buffs.
```

Model: `opencode-go/deepseek-v4-pro`
Agent: reviewer
Output: findings

```text
Use the reviewer subagent to review the Raid Comp diff. Do not edit.
```

Gate: 5/10/25/40 work, coverage matches the curated data, conflicts are
explained, share links round-trip, no false coverage.

## Step 7: Phase 5, BiS

Model: `opencode-go/glm-5.3-flash`
Agent: data-curator
Output: two verified pilot specs

```text
Use the data-curator subagent to build BiS pilot data for Holy Paladin and Fury Warrior only, with two sources per row. Add docs/data/bis-pilot.md with the open questions. Do not touch other specs yet.
```

Model: `opencode-go/glm-5.2`
Agent: designer
Output: wireframe for the BiS page

```text
Use the designer subagent to design /bis and /bis/{class}/{spec}: slot table, phase selector, source badges, alternatives, filters, share. Mobile first. No code.
```

Model: `opencode-go/deepseek-v4.1-flash`
Agent: implementer
Output: the BiS pages and export paths

```text
Use the implementer subagent to implement the BiS pages, static export paths, filters and share URL, with tests. Only the two pilot specs.
```

Model: `opencode-go/deepseek-v4-pro`
Agent: reviewer
Output: data truth, URL, SEO review

```text
Use the reviewer subagent to review the BiS pilot for data truth, URLs and SEO. Do not edit.
```

Gate: every pilot row has two sources, a working link, and a rendered source
badge. No invented item.

## Step 8: Phase 6, ads, legal, launch

Model: `opencode-go/glm-5.2`
Agent: legal-seo
Output: legal drafts and policy sources

```text
Use the legal-seo subagent to draft privacy, cookies, terms, contact, fan-site disclaimer and ads disclosure. Cite Blizzard's fan-site policy, the ad network policy, GDPR and LOPDGDD in docs/legal/sources.md. Draft only; the owner reviews.
```

Model: `opencode-go/deepseek-v4.1-flash`
Agent: implementer
Output: consent, ad slots, ads.txt, launch wiring

```text
Use the implementer subagent to add the consent hook, reserved ad slots, ads.txt and the Search Console/sitemap checks. No ads before consent in the EEA/UK. Add tests where possible.
```

Model: `opencode-go/deepseek-v4-pro`
Agent: reviewer
Output: launch audit

```text
Use the reviewer subagent to audit Phase 6: legal links, consent, CLS, ad placement and SEO. Do not edit.
```

Gate: AdSense-ready, GDPR-safe, Lighthouse >= 90, no ad-induced layout shift,
privacy and terms linked from every page.

## Step 9: final audit

Model: `opencode-go/kimi-k3.1-pro`
Agent: reviewer
Output: independent audit

```text
Review the whole site against docs/brief.md: data truth, existing URLs, share links, static export, SEO, accessibility, ads and legal. Do not edit. Report blockers, majors and minors with file:line.
```

Gate: no blockers. Fix majors before launch. Keep minors in `docs/roadmap.md`.

## Cap and fallback rules

| If this runs out | Use instead |
|---|---|
| `deepseek-v4-pro` ($15) | `kimi-k3.1-pro` ($15), then `glm-5.2` ($60) |
| `kimi-k3.1-pro` ($15) | `deepseek-v4-pro`, then `glm-5.2` |
| `glm-5.2` ($60) | `kimi-k3` or `qwen3.7-plus` ($60) |
| `glm-5.3-flash` ($60) | `deepseek-v4.1-flash` ($80) |
| `deepseek-v4.1-flash` ($80) | `glm-5.2` or `kimi-k2.7-code` ($60) |

If you hit the same cap twice in a week, upgrade to Go Plus ($40). It raises V4
Pro and Kimi K3.1 Pro to $60 and V4.1 Flash to $160, which is better than
paying overage.

Do not use `muse-spark-*-contributor`: it trains on request data.

## Commit and verify after every phase

```sh
node --check resources/js/calculator.js
npm test
npm run build
php artisan test
php artisan forever:export dist
git status --short
```

Then commit on the phase branch with an English message. Do not push or deploy
until the reviewer signs off.

## Current state at the time of writing

- Phase 0 and Phase 1 are complete on `feat/phase-0-baseline`.
- The Phase 1 decisions are recorded in
  `docs/decisions/2026-10-26-phase-1-defaults.md`.
- Phase 2 is complete: shared layout, home, about, sources, legal drafts, 404,
  favicon, robots, optional sitemap, and inline class JSON for the calculator.
- The JS rules and URL codec have Vitest coverage; the PHP suite covers all-class
  data integrity and the static export.
- Next: Phase 3 (talent refresh and data hygiene). Do not apply scraped data
  without a diff review.
- `opencode auth list` may show `0 credentials` in a plain terminal even when the
  running session reaches Go through its own profile. Check the log for the real
  model error before changing the configuration.
- Start with Step 1 if the Phase 0 baseline is not complete. Do not skip to
  Phase 2 because the calculator already works; the baseline is what keeps the
  rest from breaking.
