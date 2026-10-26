# Legal and ads plan

Status: draft, not legal advice. The owner reviews every page before launch.

## Pages

- **Privacy policy:** what is collected, why, retention, lawful basis, contact,
  analytics, ads, cookies, user rights, complaint route.
- **Cookie policy:** necessary vs advertising cookies, consent, how to withdraw.
- **Terms of use:** acceptable use, no warranty, limitation of liability,
  intellectual property, fan-site disclaimer.
- **Contact:** data errors, copyright, privacy requests.
- **Fan-site disclaimer:** unofficial, not affiliated with or endorsed by
  Blizzard Entertainment. Trademarks belong to their owners.
- **Ads disclosure:** ads are served by a third party, not recommendations.

## Compliance requirements

- GDPR and Spanish LOPDGDD for EU/Spain visitors.
- Consent before non-essential cookies or personalized ads in the EEA/UK.
- Use a Google-certified CMP if the site serves Google ads; do not hand-roll a
  consent banner.
- Privacy policy must name the analytics provider, the ad network and the
  contact address.
- No ads on legal or error pages.
- No ad layout shift: reserve height.
- No official Blizzard logos or claims of endorsement.
- Copyright/takedown contact for data and artwork.

## Sources to verify before drafting final text

These must be checked and cited in `docs/legal/sources.md` with an access date:

- Blizzard's current fan-site / community content policy.
- Google AdSense program policies and content policies.
- Google-certified CMP requirements for EEA/UK traffic.
- AEPD guidance on cookies and consent.
- The analytics provider's data policy.

Do not copy policy text. Write original prose and link to the source.

## Owner inputs needed

- Public site name or brand.
- Contact email for privacy, data errors and copyright.
- Country/jurisdiction (default Spain, EU).
- Whether a company name or only a personal name appears.
- Whether affiliate links will ever be used (default: no).

## Drafting order

1. Privacy and cookies (they depend on analytics and ads).
2. Terms and fan-site disclaimer.
3. Contact page.
4. Ads disclosure.
5. `ads.txt` once the ad network gives the publisher id.

## Ad placement rules

- One slot after the primary tool content, one in the footer area at most.
- No interstitials, no sticky overlays, no ads that look like navigation.
- Disable ads until the network approves the site and there is real traffic.
- Track CLS and remove any slot that causes layout shift.
