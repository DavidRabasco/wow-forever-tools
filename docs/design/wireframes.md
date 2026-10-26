# Design wireframes

Status: draft for Phase 1 approval. Text wireframes, not final visuals.

## Global shell

- Header: logo + site name linking home, then `Calculator`, `Raid Comp`, `BiS`,
  `About`. Current section uses the gold underline.
- Footer: `Sources`, `Privacy`, `Cookies`, `Terms`, `Contact`, the fan-site
  disclaimer, and the data attribution.
- One content width. No horizontal scroll at 360px.
- Gold `#ffd100` for active headings and primary actions. Bronze `#6b5a2e` for
  frames. Near-black background.
- Ads: reserved slots below the primary tool, never above the fold on tool
  pages, never on legal or error pages.

## Home

```text
[header]

  WoW Forever Tools
  Talent builds, raid coverage and BiS in one place.

  [Talent Calculator]  [Raid Comp]  [BiS Lists]

  Class grid: 9 cards with icon, name, "Open calculator"

  "What's new" short note (data update date)

  [ad slot, reserved height]

  [footer]
```

- The calculator is the primary card. Raid Comp and BiS are secondary.
- Each class card links to `/{class}/`.
- Keep the copy short. Search visitors need to know what the site is in one
  screen.

## Calculator

Current three-tree layout stays:

```text
[level] [reset] [share] [points left]
[tree 1] [tree 2] [tree 3]   [pick order]
```

- Wide screens: three trees centered as a unit, pick panel immediately right.
- Narrow screens: trees stack, pick panel below, toolbar wraps.
- Tooltip: hover on desktop, tap/long-press on touch, dismiss on outside tap.
- Keyboard: cells focusable, Enter/Space spend, Delete/Backspace remove, arrows
  move between cells.
- Every state has a text or shape cue, not only color.

## Raid Comp

```text
[raid size: 5 | 10 | 25 | 40] [reset] [share] [copy for Discord]

[roster grid]                      [coverage panel]
  slot 1: [class/spec]               Buffs: covered / missing
  slot 2: ...                        Debuffs: covered / missing
  ...                                Conflicts: ...
                                     Duplicates: ...

[add player] [remove]               [ad slot]
```

- Roster: one control per slot, class then spec. Role shown as a badge.
- Coverage panel groups by category: stats, haste, armor, damage, healing,
  utility, target debuffs.
- Conflicts and duplicates are explicit. No green check unless the buff is
  actually covered.
- Share URL uses a compact `?comp=` code. Copy-for-Discord produces a plain text
  summary.
- Mobile: roster first, coverage collapsible below.

## BiS

```text
[class] [spec] [phase]                         [share] [print]

[slot table]
  Slot | Item | Source | Notes | Alternatives

[enchants / gems]
[data provenance + last checked]

[ad slot]
```

- Slots in a fixed order: head, neck, shoulder, back, chest, wrist, hands,
  waist, legs, feet, rings, trinkets, main hand, off hand, ranged/relic.
- Source badges: boss, dungeon, quest, craft, vendor, PvP.
- Every row links to its Wowhead Forever item page and its source page.
- Alternatives collapse behind a details control.
- Mobile: cards instead of a table; slot label first.
- Unverified rows show a visible "Not verified" badge.

## About, Sources, Legal

- About: who runs the site, why it exists, how to report a data error.
- Sources: list every data source, access date and attribution.
- Privacy, Cookies, Terms, Contact: simple prose, no ads, no tool widgets.
- 404: short message, links to home and the calculator index.

## Accessibility checklist

- Keyboard reachable controls.
- Visible focus ring on every interactive element.
- 44px minimum touch targets.
- Contrast AA.
- Tooltip does not trap focus.
- Tables have headers and captions where appropriate.
- No motion that cannot be reduced.

## Open questions

- Should the home show a "latest builds" list? It needs curated data, so default
  is no.
- Should the calculator keep the class bar on every page or only on class pages?
  Default: class pages only; the home has the class grid.
