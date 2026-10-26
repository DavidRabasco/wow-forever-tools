# Phase 1 decisions

Date: 2026-10-26
Status: waiting for owner confirmation

Each decision has a recommended default. The owner can confirm all of them or
change individual numbers. Phase 2 code starts only after this record is
approved.

## 1. Hosting and domain

- Default: Cloudflare Pages with a custom domain, keeping GitHub Pages working
  until the domain is verified.
- Alternative: stay on GitHub Pages and use meta-refresh stubs for old URLs.
- Owner input: domain name, registrar, whether a Cloudflare API token is
  acceptable as a repository secret.

## 2. Ad network and timing

- Default: AdSense, built slots disabled until approval and meaningful traffic.
- Consent: Google-certified CMP for EEA/UK.
- Alternative: no ads at launch; add them after the first traffic data.
- Owner input: AdSense account status and acceptable ad density.

## 3. Analytics

- Default: cookieless Cloudflare Web Analytics if using Cloudflare Pages.
- Alternative: none at launch, or self-hosted Umami.
- Owner input: whether a small script and a privacy-policy entry are acceptable.

## 4. Legal identity and contact

- Default: public brand "WoW Forever Tools", dedicated contact email, Spain/EU.
- Owner input: public name, contact email, whether a company appears.

## 5. Artwork and logo policy

- Default: keep gameplay icons and tree artwork with attribution; do not use
  official logos in a way that implies endorsement; review the current Blizzard
  fan-site policy before ads.
- Owner input: whether to replace the hotlinked logo with original art.

## 6. Data sources and verification

- Default: Wowhead Forever + Warcraft Wiki/wowtbc.gg, with in-game confirmation
  where possible. Two independent sources before `verified: true`.
- Owner input: whether you have access to the game/beta for confirmation.

## 7. BiS pilot and phases

- Default: Holy Paladin and Fury Warrior, current phase/tier only.
- Owner input: preferred two specs and the phase naming scheme.

## 8. Launch scope

- Default: 9 calculators, Raid Comp, 2 verified BiS pilots.
- Alternative: wait for all 27 BiS pages.
- Owner input: acceptable launch date and whether the calculator alone is enough
  for a first public release.

## What is already fixed

- Static-first, no production backend.
- URL-only builds and `?b=` compatibility.
- English only.
- No accounts, comments or user-generated content.
- No invented gameplay data.

## Approval

Reply with the decision numbers to change, or "defaults" to accept all eight.
