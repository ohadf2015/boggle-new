---
status: shipped
files_touched:
  - fe-next/components/Footer.tsx
  - fe-next/translations/en.js
  - fe-next/translations/he.js
  - fe-next/translations/sv.js
  - fe-next/translations/ja.js
  - fe-next/translations/es.js
  - fe-next/translations/ru.js
next_steps: |
  HIGH PRIORITY — education lead funnel is broken at discovery, not conversion:
  - Education hub gets ~39 pageviews/30 days (~1-2/day on active days, mostly 0)
  - zero school_lead_submitted events EVER in PostHog (form never received a real submission)
  - zero district_upsell / teacher_individual / teacher_district_banner CTA clicks in 30 days
  - The form + API are fully built and functional; the bottleneck is discovery
  Tonight shipped: added footer.forSchools link to Footer.tsx "For Teachers" nav in all 6 locales
  This puts /education/for-schools one click away from every page on the site.

  NEXT night priorities:
  1. Add school_lead_submitted + school_lead_form_viewed + education_upsell_impression
     to CANONICAL_DUAL_EMIT in growthTracking.ts (ran out of file slots tonight)
  2. Add a "For Schools / School pricing →" CTA inline on the education hub hero
     or after the DistrictUpsellStrip (above the fold on desktop)
  3. Rewarded ad offered rate is healthy (9-32/day on active days, acceptance ~50-100%)
     but many days show 0 offers — investigate offer trigger conditions on low-offer days
  4. Consider a "Are you a teacher?" sticky CTA on game results page for new users
---

## Findings

### Education upsell funnel — broken at discovery

| Metric | Value |
|---|---|
| Education pageviews (30d) | ~39 total |
| school_lead_submitted events ever | 0 |
| district_upsell CTA clicks (30d) | 0 |
| teacher_district_banner CTA clicks (30d) | 0 |

Root cause: the for-schools lead form page is not linked from any high-traffic surface.
The footer "For Teachers" nav linked to Education Hub, Vocabulary Games, Games for Teachers,
ESL Word Games — but NOT to /education/for-schools (the only page with the lead form).

Fix shipped: added `footer.forSchools` link to Footer.tsx + i18n key in all 6 locales.

### Rewarded ads

| Metric | Value |
|---|---|
| Offers/day (active days) | 9–32 |
| Zero-offer days in 14d | ~5 |
| Acceptance rate (when offered) | 50–100% |
| Watched/day (7d avg, brief) | 2 |

Mechanics are healthy (prepare_start → show_called → rewarded all 1:1).
Problem is offer frequency — many days show 0 offers. The brief's 2/24h avg is
deflated by the zero-offer days. No quick code fix tonight without risk; logged for
investigation.

## Impact ledger
See ndjson entry below.
