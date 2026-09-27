---
status: shipped
attempted: Fix rewarded_ad_watched dual-emit so nightly revenue collector gets real data (was showing 0/7d due to event name mismatch)
files_touched:
  - fe-next/utils/growthTracking.ts
  - fe-next/utils/__tests__/growthTracking.canonicalEmit.test.ts
next_steps: |
  - Check revenue brief tomorrow — rewarded_ad_watched should show non-zero if Android users are watching ads
  - If still 0 after fix, the 0 is real (no Android DAU completing rewarded ads) → investigate ad placement/discovery
  - Education upsell infrastructure already complete (DistrictUpsellBanner, SchoolLeadForm, for-schools page all wired 5 locales); no gap there
  - Consider adding rewarded_ad_offered/rewarded_ad_declined to CANONICAL_DUAL_EMIT if collector needs them
---

## Root cause

nightly collect-revenue.sh queries PostHog for unprefixed rewarded_ad_watched:
  SELECT count() FROM events WHERE event = 'rewarded_ad_watched' AND ...

But trackGrowthEvent always emits with growth: prefix (growth:rewarded_ad_watched).
The unprefixed variant only emits for events in CANONICAL_DUAL_EMIT.
rewarded_ad_watched was NOT in that set → 0/7d in revenue brief.

## Fix

Added 'rewarded_ad_watched' to CANONICAL_DUAL_EMIT in growthTracking.ts.
Now fires both growth:rewarded_ad_watched (dashboards) AND rewarded_ad_watched (collector query).

## TDD

Test added to growthTracking.canonicalEmit.test.ts verifying trackRewardedAdWatched
produces both event names. eslint clean.

## Education upsell audit (no code needed tonight)

Already fully built: DistrictUpsellBanner in teacher dashboard, DistrictUpsellStrip on
education landing, TeacherAccessCTA on 3 edu content pages, SchoolLeadForm at
/education/for-schools — all 5 locales complete. No gap to fill tonight.
