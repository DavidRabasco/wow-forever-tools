# Data policy

Gameplay data is the product. A calculator that looks right but shows a wrong
buff, item or prerequisite is worse than a missing feature. These rules apply to
talents today and to specs, buffs, debuffs and BiS later.

## Principles

- Start from a source, not from memory. Every row needs `source_url` and
  `last_checked`.
- `verified: true` requires two independent sources, or confirmation from the
  game client. One source is a draft.
- Unknown values stay `null`. The UI renders "Not verified". Never invent a
  plausible value.
- Facts only: names, ids, ranks, numbers, stacking rules, source page. Do not
  copy long descriptions or tables.
- Keep the JSON deterministic: stable order, stable ids, no timestamps that
  change on every run.
- Data changes are separate commits from code changes.

## Current talent data

`database/data/{class}_{tree}.json` is the source of truth. Fields:

- `row` (1-7), `col` (1-4)
- `slug` (unique per tree), `name`, `max_rank`
- `requires_slug` or null
- `is_gold`, `status`
- `description` (hand summary for Paladin today)
- `ranks[]`, `skill` (verbatim text from the importer when available)
- `icon` (zamimg short name)

The seeder resolves prerequisites in two passes and scopes uniqueness by parent:
`(slug, tree_id)` for talents and `(slug, class_id)` for trees.

## Future datasets

Proposed layout:

```text
database/data/
  game/specs.json
  game/buffs.json
  game/debuffs.json
  bis/{class}/{spec}/{phase}.json
```

Buff/debuff fields:

```json
{
  "id": "example-buff",
  "name": "Example Buff",
  "type": "buff",
  "scope": "raid",
  "category": "stat",
  "stacking": "exclusive",
  "exclusive_group": "example-group",
  "sources": [
    { "class": "paladin", "spec": "holy", "ability": "Example Ability" }
  ],
  "notes": null,
  "source_url": null,
  "verified": false,
  "last_checked": null
}
```

Spec fields:

```json
{
  "id": "paladin-holy",
  "class": "paladin",
  "spec": "holy",
  "role": "healer",
  "provided_buffs": [],
  "provided_debuffs": [],
  "source_url": null,
  "verified": false,
  "last_checked": null
}
```

BiS row fields:

```json
{
  "slot": "head",
  "item_id": null,
  "name": null,
  "source": { "type": null, "name": null, "zone": null, "boss": null },
  "notes": null,
  "alternatives": [],
  "source_url": null,
  "verified": false,
  "last_checked": null
}
```

## Validation

Phase 0 adds tests for the seeded catalog and the static export. A dedicated
command is planned:

```sh
php artisan forever:data:validate
```

It must check:

- JSON parses and matches the schema.
- Ids are unique and referenced ids exist.
- Every row has `source_url`, `verified` and `last_checked`.
- `verified: true` has a second source or an explicit owner confirmation.
- Buff/debuff exclusivity groups are consistent.
- BiS slots are unique per spec/phase and item ids are numeric.

## Update workflow

1. Import or edit a draft.
2. Run the validator and the diff report.
3. Review the diff. A human accepts or rejects each changed gameplay fact.
4. Commit the data separately, with the sources in the message or a linked note.
5. Update `docs/data-todo.md` for anything still unverified.

Never auto-apply scraped changes. Never let an agent mark a fact as verified
without a source.

## Copyright and attribution

- Data facts (c) Blizzard / wowtbc.gg. Icons (c) Blizzard via `wow.zamimg.com`.
- Store icon short names, not image files.
- Link to the source page instead of copying prose.
- Keep the attribution visible on the site and in `README.md`.
