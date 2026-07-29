status: shipped
files_touched:
  - fe-next/components/education/DistrictUpsellStrip.tsx
  - fe-next/components/education/__tests__/DistrictUpsellStrip.test.tsx
  - fe-next/utils/growthTracking.ts

## What shipped
Added `education_upsell_impression` PostHog event on mount of `DistrictUpsellStrip`.
Previously: only click tracked (`landing_cta_clicked`). Now view-through rate measurable.
Added event to `GrowthEvent` union type. 1 TDD test added (impression fires on mount).

## Revenue analysis
- `rewarded_ad_watched = 0` (7d) — STRUCTURAL. H5 gated OFF pending AdSense approval.
  AdMob native-only; tiny Android user base. No code fix possible — unblock = AdSense approval.
- `DistrictUpsellStrip` already deployed on /education with click tracking + mailto CTA.
  Gap: no impression data → CTR unknown. Fixed tonight.

## next_steps
1. After a few days of data: query PostHog `education_upsell_impression` vs `landing_cta_clicked`
   cta=district_upsell. High impressions + low clicks = copy/placement problem.
2. Enable `NEXT_PUBLIC_H5_ADS_ENABLED=true` once AdSense approved — biggest revenue unlock.
3. IAP demand probe: `iap_viewed` banner on daily results behind `NEXT_PUBLIC_IAP_PROBE_ENABLED`.
4. DistrictUpsellStrip on sub-pages (games-for-teachers, esl-word-games) — hand-off to Lane 08.
