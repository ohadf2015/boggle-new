status: research-only
attempted: education upsell lead-gen CTA on teacher/education page (honest contact-sales, 5 locales, TDD)
files_touched: none

## Finding: lane prompt's "known surface" is stale — monetization scaffolding is already deep

Checked the prompt's STEP 2 assumptions against the live code before building anything
(per `verification-before-completion` + the "verify before recommending from memory" rule).
All three assumed gaps are already shipped, by prior lanes:

- **"Education free... NO pricing, NO lead capture anywhere"** — false.
  `app/[locale]/education/for-schools/page.tsx` has full pricing (Offer schema for Free/Pro/Schools
  tiers), a lead-capture form (`ForSchoolsPackages` @ `#lead`), comparison table, FAQ, two CTAs.
  Linked from the education hub (`eg6Land.guides.schoolsBadge`) and `classroom-game`.
- **Teacher→school upsell referral** — already built. `app/[locale]/teacher/upgrade/PageClient.tsx`
  has a teacher/school tab toggle; the school tab renders `SchoolPlanSection`, and an
  "Ask your school" flow (`AskSchoolPanel`) lets an individual Pro teacher invite their admin
  to the multi-teacher deal. Also `ClassLimitUpsellModal`, `TeacherProTrialEndedBanner`,
  `StudentCapMeter`, `HomeProCard`, `ProGate` — upsell surfaces are already everywhere a
  teacher could plausibly hit a wall.
- **"IAP/subscription EXPERIMENT scaffolding"** (option 3 in the prompt) — already shipped.
  `components/monetization/SupporterInterestCard.tsx` (fires `iap_viewed`/`iap_tapped`, web-only,
  mounted on `app/[locale]/profile/PageClient.tsx`) and `components/ads/RemoveAdsProbe.tsx`
  (mounted on `app/[locale]/settings/PageClient.tsx`) are pure-analytics demand probes with
  no purchase path — exactly what the prompt asked me to build tonight.

Given this, writing a 4th education CTA or a 3rd demand probe would be pure duplication risk
(two near-identical CTAs competing on the same page is a real regression, not a feature).
Did not ship code tonight — avoided manufacturing a cosmetic diff just to have one.

## What's NOT yet covered (real backlog, ranked)

1. **Rewarded-ad funnel has the probes but nobody's read the data they produce.**
   `trackRewardedAdOffered/Watched/Declined` (utils/growthTracking.ts:1917-1946) are fully wired
   through `hooks/useRewardedAd.ts` (652 lines, triple-gated AdMob/CrazyGames/H5). Brief signal
   tonight: `rewarded_ad_watched` 0/24h, 0 7d avg — severity scored low (0.4) so likely just thin
   overnight traffic, not a break. Next lane with PostHog access should pull
   `rewarded_ad_offered` vs `rewarded_ad_declined` (by `reason`) over 7d before assuming either
   "broken" or "fine" — nobody has looked at the decline-reason breakdown yet.
2. **`iap_tapped` / `iap_viewed` ratio on SupporterInterestCard and RemoveAdsProbe is unread.**
   Both probes have been live (per their test files) but no lane has queried their conversion —
   that's the actual "is there appetite for a paid web tier" answer the prompt is trying to get
   at, and it already exists in PostHog, unqueried.
3. **AdSense web ads are still pending approval** (per brief) — H5 ad revenue is $0 regardless of
   UX polish until that lands; lane 08 owns that content track, not this lane.

## Next steps
- Next monetization lane: start with a PostHog query on `rewarded_ad_declined` reasons and
  `iap_tapped`/`iap_viewed` rate, not a new UI surface. That data should drive whether the next
  code change is "fix a broken ad gate" or "the demand genuinely isn't there."
- Lane 07 (self-learn): update this lane's prompt STEP 2 "known surface" section — the
  "NO pricing, NO lead capture" line is wrong and will cause future lanes to re-build what
  already exists, same failure mode as pitfall-class 3 (asymmetric paths / stale assumptions).
