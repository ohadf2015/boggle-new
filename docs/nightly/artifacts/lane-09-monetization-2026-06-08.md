---
status: shipped
files_touched:
  - fe-next/hooks/useRewardedAd.ts
  - fe-next/hooks/__tests__/useRewardedAd.analytics.test.tsx
---

## What shipped

**Fixed missing `rewarded_ad_offered` event in the ad revenue funnel.**

`trackRewardedAdOffered` was defined and exported from `growthTracking.ts` but never
imported or called by `useRewardedAd.ts` — the hook that manages ALL rewarded-ad flows
across every platform (AdMob/CrazyGames/ayeT/simulation). The `offered` event is the
top of the revenue funnel; without it, PostHog shows `rewarded_ad_watched` with no
denominator, making offer-to-watch conversion rate invisible.

Changes:
1. Added `trackRewardedAdOffered` to the import in `useRewardedAd.ts`
2. Called it after all early-return guards pass (daily limit / no-provider / cooldown),
   right after `platform` is resolved — only fires when an ad is actually attempted
3. Passes `{ platform }` as extras so PostHog can segment offer rate by provider
4. Added 2 regression tests confirming it does NOT fire on early-declined paths

## Revenue landscape orientation

- Education upsell already fully built (`DistrictUpsellStrip` + 8 tests, wired in PageClient)
- ayeT offerwall dark — needs human config (see next steps)
- Web H5 ads gated off pending AdSense approval
- AdMob is Android-only; ~377 Android reach 7d; very low rewarded watch count

## Next steps (tomorrow)

1. **PostHog funnel**: after deploy, check `growth:rewarded_ad_offered` event count.
   If ≥1 fires but watched=0 → offer CTA needs UX improvement.
   If offered=0 → offer surface unreachable for Android users (surface bug).
2. **ayeT offerwall**: register at ayeT Studios, get adslot ID, set
   `NEXT_PUBLIC_AYET_OFFERWALL_ENABLED=true` and `NEXT_PUBLIC_AYET_OFFERWALL_ADSLOT=<id>`
   in Vercel env — component auto-shows on profile coins section (already wired).
3. **AdSense**: awaiting Google review, no code action.
4. **Revenue snapshot**: run `scripts/nightly/lib/pull-revenue-snapshot.sh` or
   provision `ADMOB_API_TOKEN` for unattended revenue data.
