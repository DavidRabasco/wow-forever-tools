# WoW Forever Tools: public site brief

Status: Phase 0 complete; Phase 1 approved; Phase 2 complete; Phase 3 next
Last updated: 2026-10-26
Owner: David

This file is the source of truth for scope, constraints, data policy, phases, and
agent workflow. If it conflicts with the code, stop and ask before changing
anything. Do not start a phase until the previous one meets its acceptance
criteria and the owner approves. The model-by-model execution order and the
copy-paste prompts are in `docs/runbook.md`.

## 1. Product

Current state: a talent calculator for WoW Forever (Classic rules, level 60, 51
points) covering all 9 classes, 27 trees and 466 talents. Laravel 13 + PHP 8.3 +
SQLite + Vite + Tailwind 4 + vanilla JS. Production is a static export
(`php artisan forever:export dist`) deployed to GitHub Pages by
`.github/workflows/pages.yml`. Builds travel in `?b=`; there is no runtime
database.

Target: a public, indexable, ad-supported fan site with four pillars:

1. Talent calculator (existing, polished, accessible, mobile-ready).
2. Raid Comp builder: add classes/specs to a party or raid and show the buffs
   and debuffs the composition provides, plus conflicts and gaps.
3. BiS lists: per class, spec and phase, with item sources and alternatives.
4. Supporting content: home, about, sources, legal pages, and short guides that
   give search traffic a reason to land here.

Audiences: WoW Forever players planning builds, raid leaders checking coverage,
levelers looking for BiS, and search visitors arriving from Google.

Success for the first six months:

- All 9 class calculators and the new tools work on desktop and mobile.
- Every gameplay fact has a source and a verified flag.
- The site is indexed (sitemap submitted, class and BiS pages ranking for their
  own names) and has no reported data errors.
- Core Web Vitals pass on the tool pages.
- AdSense (or an equivalent) is approved, with consent and legal pages in place.
- Revenue is treated as a lagging indicator: first traffic and usefulness, then
  ads. Do not design the product around ad clicks.

## 2. Non-goals (for now)

- Accounts, login, comments, profiles, or user-generated content stored on a
  server.
- A production backend or database. Laravel stays a local build tool and data
  pipeline.
- Paid hosting, paid APIs, paid analytics, or paid services without owner
  approval.
- Localization. The project is English only.
- A SPA framework (React, Vue, Svelte). Vanilla JS modules and Tailwind.
- A mobile app.
- Copying long descriptions from Wowhead, wowtbc.gg, or Warcraft Wiki. Use
  facts (names, ids, numbers), link to the source, and write original prose.
- Official Blizzard logos, fonts, or any claim of endorsement.

## 3. Hard constraints

- Static-first. Production output is `dist/` with no PHP and no database.
- All user state lives in the URL or `localStorage`. Share links must be
  deterministic, validated, and backward compatible.
- Existing URLs and `?b=` share links must keep working.
- Laravel and SQLite are local tooling. The seeder and importer remain the data
  path.
- Vanilla JS modules, Tailwind 4, Vite. No new runtime dependencies without
  approval.
- English only for UI, docs, comments, commit messages, and data.
- Icons from `wow.zamimg.com`. Tree artwork hotlinked as today. Attribution to
  wowtbc.gg and Blizzard stays visible.
- No fabricated gameplay data. Every talent, buff, debuff, item and source needs
  a `source_url` and a `verified` flag. Unknown values are `null` and render as
  "Not verified", never as invented content.
- Free hosting only: GitHub Pages or Cloudflare Pages. A custom domain is
  allowed and recommended for ads and credibility.
- Ads are the last phase. They must not cause layout shift, cover content, or
  appear before consent in the EEA/UK.
- Accessibility is a requirement, not a nice-to-have: keyboard, touch, focus
  visibility, contrast, and screen-reader labels.

## 4. Architecture and URLs

Proposed route map (the architect may refine it, but keep it static-friendly):

| Route | Content |
|---|---|
| `/` | Home: what the site is, class grid, tool cards, latest updates |
| `/{class}` | Existing calculator (`paladin`, `warrior`, ...) |
| `/raid-comp` | Raid Comp builder |
| `/bis` | Index of classes and specs |
| `/bis/{class}/{spec}` | BiS list for one spec, with phase selector |
| `/about` | What the project is, who runs it, data sources |
| `/sources` | Data provenance and attribution |
| `/privacy` | Privacy policy |
| `/terms` | Terms of use and fan-site disclaimer |
| `/contact` | Contact |
| `/404.html` | Static not found page |

Implementation notes:

- The exporter must generate directory-based pages (`bis/paladin/holy/index.html`)
  so GitHub Pages serves clean URLs without a server.
- `sitemap.xml`, `robots.txt`, `ads.txt`, and `favicon` are generated or copied
  at export time.
- Data for the tools is exported as JSON next to the HTML, in the same shape the
  client consumes. No runtime `/api` calls in production.
- SEO: unique title/description per class and BiS page, canonical, Open Graph and
  Twitter cards, `WebSite`/`BreadcrumbList` JSON-LD where it is honest, internal
  links between calculator, raid comp and BiS.
- Analytics: cookieless by default (Cloudflare Web Analytics or a self-hosted
  Umami). Track tool opens, shares, and class/spec selections without PII.
- Ads: AdSense or an equivalent, with a Google-certified CMP for consent, ad
  slots with reserved height, and `ads.txt`. No ads on legal or error pages.

## 5. Data policy

Every dataset gets a schema, a version, and a validator. Suggested layout:

```text
database/data/
  classes.json                 existing manifest
  {class}_{tree}.json          existing talents
  game/specs.json              class/spec/role + provided buffs/debuffs
  game/buffs.json              buff definitions and stacking rules
  game/debuffs.json            debuff definitions and stacking rules
  bis/{class}/{spec}/{phase}.json
```

Minimum fields:

- Buff/debuff: `id`, `name`, `type` (buff/debuff), `scope` (party/raid/target),
  `category`, `stacking` (`unique`, `stacks`, `exclusive`),
  `exclusive_group`, `sources[]` (`class`, `spec`, `ability`), `notes`,
  `source_url`, `verified`, `last_checked`.
- Spec: `class`, `spec`, `role`, `provided_buffs[]`, `provided_debuffs[]`,
  `source_url`, `verified`.
- BiS row: `slot`, `item_id`, `name`, `source` (`type`, `name`, `zone`, `boss`),
  `notes`, `alternatives[]`, `source_url`, `verified`, `last_checked`.
- Talent updates: keep the existing fields, add a dataset `version` and a
  `status` (`unchanged`, `new`, `changed`, `moved`, `removed`).

Rules:

- Curate from Warcraft Wiki, Wowhead Forever, wowtbc.gg and in-game data. Cite
  the exact page. Do not copy paragraphs.
- A `php artisan forever:data:validate` command checks schemas, duplicate ids,
  broken references, missing sources, and missing `verified` flags.
- Talent refresh uses the importer plus a diff command. The diff is reviewed by
  a human and committed as a data change. Never auto-apply scraped changes.
- When a fact cannot be verified, leave it `null`, show "Not verified" in the
  UI, and add it to `docs/data-todo.md`.

## 6. Phases and acceptance criteria

### Phase 0: baseline and guardrails

- Replace the unused Laravel Boost bootstrap in `AGENTS.md` with real project
  rules (do not install Boost).
- Fix stale README references (`Build`, `Api\BuildController`, test list).
- Add `docs/architecture.md`, `docs/data-policy.md`, `docs/roadmap.md`,
  `docs/agents.md`.
- Add JS unit tests (Vitest) for the rules engine and the URL codec. Extend the
  PHP suite for the API and data integrity.
- CI runs tests, build, and export, not only deploy.
- Agent files live in `.opencode/agents/`.
- Done: `php artisan test`, `npm test`, `npm run build`, and
  `php artisan forever:export dist` all pass; README matches the code.

### Phase 1: spec and URL map (no code)

- Final sitemap, route map, data schemas, ad/legal plan, hosting decision, and
  wireframes for home, raid comp, and BiS.
- Done: owner approves the written spec before implementation.

### Phase 2: site shell and SEO foundation

- Home, navigation, footer, about, sources, privacy, terms, contact, 404.
- Meta/OG/Twitter tags, canonical URLs, sitemap, robots, favicon, analytics hook,
  and a consent placeholder.
- Done: Lighthouse SEO and accessibility >= 95 on home and one class page; the
  static export includes every page; no broken links.

### Phase 3: talent refresh and data hygiene

- Importer diff report, `status`/`is_gold` verification, Paladin verbatim ranks,
  and a documented data snapshot.
- Done: diff reviewed, changes documented, tests pass, no unverified change.

### Phase 4: Raid Comp MVP

- Curated buff/debuff/spec data for all 9 classes.
- Party 5, raid 10/25/40. Coverage matrix, missing/duplicate/conflict warnings,
  share URL, text export for Discord, mobile layout.
- Done: data has sources, share round-trip is legal, no false coverage.

### Phase 5: BiS MVP

- Two pilot specs first, then the rest. Phase selector, source badges, item
  links, alternatives, filters, share URL, static SEO pages.
- Done: each pilot row has a source and a second check; no invented items.

### Phase 6: monetization and launch

- Ad slots, consent, privacy/cookies, `ads.txt`, custom domain, Search Console,
  sitemap submission, performance budget, error monitoring.
- Done: AdSense-ready, GDPR-safe, Lighthouse >= 90, no CLS from ads, launch
  checklist complete.

### Phase 7: iterate

- Monthly analytics review. Add specs, phases, and guides only when the data is
  verified. No scope creep into accounts or a backend.

## 7. Agent workflow

- The primary agent is the orchestrator: plans, delegates, reviews, commits.
- Subagents run with fresh context. Give each one the phase, the exact files it
  owns, and the acceptance criteria.
- One phase at a time. Parallel work only when file sets are disjoint. Never let
  two agents edit the same file at once.
- File ownership is phase-scoped:
  - designer: `resources/views/**` (layout/visual), `resources/css/**`,
    `docs/design/**`.
  - implementer: `app/**`, `routes/**`, `resources/js/**`, `database/**`,
    `tests/**`.
  - data-curator: `database/data/**`, `docs/data/**`.
  - legal-seo: `resources/views/legal/**`, `public/**`, `docs/legal/**`.
  - reviewer: read-only, plus test commands.
- Every subagent returns: summary, files changed, commands run, risks, and the
  next step.
- The implementer runs the verification commands. The reviewer reads the diff
  and reports findings by severity. No subagent commits, pushes, or deploys.
- Use the built-in Plan and Explore agents for research before writing code.
- The orchestrator updates `docs/roadmap.md` and the decision log after each
  phase.

## 8. Model routing (OpenCode Go)

| Work | Model | Why |
|---|---|---|
| Orchestration, day to day | `deepseek-v4.1-flash` | $80 monthly allowance, fast, good at PHP/JS |
| Architecture, schema, hard bugs | `deepseek-v4-pro` | $15, use in short focused sessions |
| UI/UX and design review | `glm-5.2` | $60, strong layout and visual reasoning |
| Data curation and bulk edits | `glm-5.3-flash` | $60, cheap, high volume |
| Final review | `kimi-k3.1-pro` or `deepseek-v4-pro` | Different model catches different bugs |
| Legal/SEO drafts | `glm-5.2` or `deepseek-v4-pro` | Careful writing, limited sessions |

Provider ID is `opencode-go` and model IDs are the ones shown in `/models`. If
the $15 caps run out, upgrade to Go Plus instead of paying overage.

## 9. Definition of done (every task)

- The change works on desktop and mobile.
- Keyboard and touch paths are checked when the task touches the calculator.
- Tests cover the new rule or data shape.
- Docs and data provenance are updated.
- `npm run build`, `node --check resources/js/calculator.js`,
  `php artisan test`, and `php artisan forever:export dist` pass.
- No dead code, no secrets, no unrelated refactors.

## 10. First response required

Before writing any code:

1. Read `README.md`, `docs/calculator.md`, `docs/brief.md`, `docs/agents.md`,
   and the current code paths you plan to touch.
2. Summarize the current state and any discrepancies with this brief.
3. List the open decisions and ask only the questions that block Phase 0/1.
4. Propose a Phase 0 and Phase 1 plan with exact files, commands, and risks.
5. Stop and wait for approval.

Do not install Laravel Boost. Do not add a backend. Do not invent data. Do not
change the existing share-link format.
