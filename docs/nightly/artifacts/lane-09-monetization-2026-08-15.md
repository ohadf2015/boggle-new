status: research-only
attempted: add education lead-gen CTA / IAP demand probe — found both already shipped by prior nights, verified live and wired (see below). No safe new gap found within budget.

## verified already-shipped (do not re-propose)
- `/education/for-schools`: lead-capture form + $149/yr school pricing, linked from Footer, education hub, teacher/upgrade, about, guides, sitemap. Discoverable, not orphaned.
- `SupporterInterestCard` (iap_viewed probe) — mounted in `app/[locale]/profile/PageClient.tsx`.
- `RemoveAdsProbe` (iap_viewed probe) — mounted in `app/[locale]/settings/PageClient.tsx`.
- `teacher/upgrade` PageClient — iap_viewed on `teacher_pro` + `district_inquiry`.
- `DistrictUpsellBanner`, `ClassLimitUpsellModal`, `DistrictUpsellStrip`, `TeacherAccessCTA` — all wired.

## why nothing shipped tonight
- `hooks/useAdMob.ts` / `useRewardedAd.ts` are dense, heavily-commented edge-case code (native
  WebView-suspend timing, rewarded-interstitial vs rewarded-video namespace split). Not safe to
  touch inside a ~10min lane budget without breaking a documented invariant.
- Intel brief signal was thin (single stale posthog metric, reach=0) — not enough to target a
  specific ad-UX surface confidently.
- Player feedback: only 2 mp_round responses this week, denominator too small to steer on.

## ranked backlog for tomorrow (or a lane with more budget)
1. Instrument `rewarded_ad_offered` vs `rewarded_ad_watched` conversion per surface (6 rewarded
   surfaces exist) to find which surface has worst decline rate — currently no per-surface
   dashboard, only the aggregate metric in tonight's brief.
2. Check whether `district_inquiry` / `teacher_pro` iap_viewed events have ANY volume yet
   (shipped recently per grep — likely 0 data still). If so this is a discoverability problem,
   not a placement problem — audit `/teacher` traffic into `/upgrade`.
3. Do NOT touch `useAdMob.ts`/`useRewardedAd.ts` without a full read of the surrounding comments
   (native suspend/resume race, rewarded-interstitial split) — high revert risk for a nightly lane.

files_touched: none
next_steps: pull per-surface rewarded funnel from PostHog before next monetization lane; check iap_viewed volume for teacher_pro/district_inquiry to see if lead-gen work already shipped is getting traffic.
