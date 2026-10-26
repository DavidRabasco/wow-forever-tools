# Agent workflow

This project uses one primary agent (orchestrator) and a small set of subagents.
The orchestrator owns the plan, the diff review, and every commit. Subagents do
focused work with fresh context.

Read `docs/brief.md` first. It owns scope, constraints, data policy, phases, and
acceptance criteria. This file only explains how the agents cooperate. The
step-by-step order, model per step, and copy-paste prompts live in
`docs/runbook.md`.

## Roster

| Agent | Mode | Recommended model | Owns | Must not touch |
|---|---|---|---|---|
| Build (primary) | primary | `deepseek-v4.1-flash` | Orchestration, plans, commits, phase acceptance | Nothing by default, but asks before deploys |
| `designer` | subagent | `glm-5.2` | `resources/views/**`, `resources/css/**`, `docs/design/**` | PHP/JS logic, data, routes |
| `implementer` | subagent | `deepseek-v4.1-flash` | `app/**`, `routes/**`, `resources/js/**`, `database/**`, `tests/**` | Legal copy, ad policy, data facts |
| `data-curator` | subagent | `glm-5.3-flash` | `database/data/**`, `docs/data/**` | Application code, views |
| `reviewer` | subagent | `deepseek-v4-pro` | Read-only review and test runs | Any edit |
| `legal-seo` | subagent | `glm-5.2` | `resources/views/legal/**`, `public/**`, `docs/legal/**` | Gameplay data, calculator logic |

Models are left unset in the agent files so they inherit the session model.
After subscribing to OpenCode Go, add the recommended `model:` line to each
frontmatter. Verify the exact IDs with `/models`; the provider prefix is
`opencode-go`.

## Handoff protocol

Every subagent prompt includes:

1. The phase and the acceptance criterion it must meet.
2. The exact files it owns and the files it must not touch.
3. The commands it must run before returning.
4. The output format: summary, files changed, commands run, risks, next step.

The orchestrator then:

1. Reads the diff, not only the summary.
2. Runs the verification commands again when the change is risky.
3. Accepts, asks for a fix, or reverts.
4. Updates `docs/roadmap.md` and the decision log.
5. Commits only after the phase is green.

## Parallelism

Parallel subagents are allowed only when their file sets are disjoint. Examples:

- Designer styles the home while the data curator fills `game/buffs.json`.
- Legal-SEO writes the privacy page while the implementer adds the consent hook.

Do not run these in parallel:

- Designer and implementer on the same Blade/JS feature.
- Two implementers on `calculator.js`.
- Any agent editing `database/data/**` while another validates it.

When in doubt, sequence the work. A slow correct merge is cheaper than a
conflict resolution in a 700-line vanilla JS file.

## Review rules

The reviewer checks, in this order:

1. Correctness against the brief and the game rules.
2. Silent data changes (a build that renders but lies).
3. Regressions in existing share links and URLs.
4. Accessibility and mobile behavior when UI changed.
5. Tests: do they fail if the feature breaks?
6. Scope creep, new dependencies, dead code, secrets.

Findings are reported by severity with file and line references. The reviewer
does not edit files.

## Data curation rules

- Every row needs `source_url`, `verified`, and `last_checked`.
- A second source is required before `verified: true` for BiS and buff/debuff
  coverage.
- Unknown values stay `null` and render as "Not verified".
- Never copy long prose. Facts and short names only.
- The curator writes a short note in `docs/data-todo.md` for every unresolved
  question.

## Legal and ads rules

- The legal-seo agent drafts; the owner reviews. Nothing here is legal advice.
- Cite Blizzard's current fan-site policy and the ad network's current policies
  in `docs/legal/sources.md`.
- No ads before consent in the EEA/UK. Use a Google-certified CMP, not a
  hand-rolled banner.
- No official logos, no "official", no implication of Blizzard endorsement.
- Privacy policy must list analytics, ads, cookies, and the contact address.

## Branch and commit rules

- One branch per phase: `feat/phase-2-site-shell`.
- One commit per coherent change. English messages.
- No agent pushes, force-pushes, rewrites history, or deploys.
- The orchestrator merges after the reviewer signs off and the verification
  commands pass.

## Escalation

Stop and ask the owner when:

- A data fact cannot be verified from two sources.
- A change would break an existing URL or share link.
- A new dependency, paid service, or backend is proposed.
- The ad network's policy conflicts with the site's content.
- The phase would grow beyond its acceptance criteria.
