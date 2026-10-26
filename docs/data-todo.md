# Data todo

Open gameplay-data questions. Every item needs a source before it can be marked
`verified`. See `docs/data-policy.md`.

## Talents

- [ ] `status`: everything is `unchanged` today. Diff against the current
      Forever/Classic data to flag `new`, `changed`, `moved` and `removed`.
- [ ] Paladin `description` summaries: re-import verbatim `ranks[]` so Next Rank
      matches the other classes.
- [ ] `is_gold`: confirm every gold marker against the current data.
- [ ] Confirm all 9 classes still match the live talent trees after the last
      Forever update. Use the importer diff, not a full overwrite.

## Buffs, debuffs and specs

- [ ] Define the authoritative source list and access date.
- [ ] Confirm party vs raid scope for every buff.
- [ ] Confirm stacking and exclusivity groups.
- [ ] Confirm which specs bring each buff/debuff in the current patch.
- [ ] Decide how to represent totems, auras, shouts and other temporary effects.

## BiS

- [ ] Pilot: Holy Paladin and Fury Warrior, current phase only.
- [ ] Choose the item source fields (boss, dungeon, quest, craft, vendor, PvP).
- [ ] Confirm item ids against Wowhead Forever.
- [ ] Record alternatives and why they are alternatives.
- [ ] Get a second source for every row before `verified: true`.
