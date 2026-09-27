---
status: shipped
files_touched:
  - fe-next/app/[locale]/education/page.tsx
next_steps: |
  - Query PostHog for autocapture events with source=edu_hub_for_schools_card to measure click-through to lead form
  - If CTR still low after 3-5 days, consider making card span 2 columns for more visual weight
  - school_lead_form_viewed + school_lead_submitted already tracked — check PostHog funnel for drop-offs
  - Revenue data snapshot stale: founder should run scripts/nightly/lib/pull-revenue-snapshot.sh (Playwriter) and/or provision ADMOB_API_TOKEN
  - Rewarded ad volume very low (2/24h per brief): consider surfacing rewarded-ad CTA more prominently on word-hunt results screen
---

## What shipped

**For-schools card visual prominence** in the education hub resource links grid.

`fe-next/app/[locale]/education/page.tsx` — the "For Schools" card (last of 5 in `EducationResourceLinks`) now:
- `bg-neo-lime` background (was `bg-neo-navy-light`) — visually distinct from 4 peer cards
- Inverted badge: `bg-neo-navy text-neo-lime`
- Black text (readable on lime)
- `data-ph-capture-attribute-source="edu_hub_for_schools_card"` — PostHog autocapture click tracking

All 5 locale strings already present in `RESOURCE_CARDS`. No new translation keys.

## What was already in place (no action needed)

- `/education/for-schools` page with `SchoolLeadForm` + `school_lead_submitted` tracking ✓
- `/api/education/school-lead` POST route with rate-limit + email notification ✓
- `DistrictUpsellBanner` on teacher dashboard with impression + click tracking ✓

## Guardrail check

No coin-economy / payment / billing logic touched. No new ad surface. No hardcoded strings. No paywalled free feature. No fake stats. eslint clean (0 warnings).
