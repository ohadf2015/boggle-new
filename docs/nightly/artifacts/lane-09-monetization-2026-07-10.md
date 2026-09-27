---
status: shipped
files_touched:
  - fe-next/app/[locale]/education/PageClient.tsx
next_steps: |
  - Monitor landing_cta_clicked{cta:district_upsell} in 3 days — should move from 0 now that strip is above the fold
  - Monitor landing_cta_clicked{cta:teacher_district_banner} baseline in teacher dashboard
  - If clicks still 0 after 3 days, traffic to education pages is genuinely low; consider homepage education entry point
  - education_upsell_impression fires on mount (not scroll-into-view) — impression data misleading; exposure now better
  - Rewarded_ad_watched 0/24h vs 2.57 avg — likely stochastic at low volume, revisit if trend persists 3+ days
---

## Impact check (verdict_for: 09-monetization-2026-07-07-district-upsell-strip)
- verdict: neutral (measured: 0, baseline: 0) — strip was wired but buried below the fold

## What shipped
Moved `DistrictUpsellStrip` on the education hub (`/[locale]/education`) from the very bottom
of the page (after EducationFAQ, ~7 scroll-heights down) to just before the trust bullets
section. Strip now renders much closer to the fold, right after users see hero, product tour,
and teacher/student role cards.

Root cause of 0 clicks: `education_upsell_impression` fires on React mount (not on
scroll-into-view), so PostHog showed impressions while the CTA was never in the actual
viewport on mobile. The strip at the page bottom was effectively invisible.

## What was NOT done (and why)
- Did not add new CTAs — funnel fully wired: hub strip + teacher dashboard banner + for-schools + SchoolLeadForm + school_lead_submitted
- Did not touch coin/economy/billing — guardrail respected
- Did not change rewarded ad logic — 0/24h at 2.57/day avg is stochastic noise, not a confirmed bug
