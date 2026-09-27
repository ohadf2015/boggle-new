status: research-only
files_touched: none

## Why no ship tonight
Checked all 4 preferred playbook items in the prompt — every one already built by prior lanes:
1. Education lead-gen: `/education/for-schools` already has `ForSchoolsPackages` lead form
   at `#lead`, plus `DistrictUpsellStrip` + `TeacherAccessCTA` wired into
   `EducationLandingTemplate` — shared by all 16 education landing pages (not just for-schools).
   The lane-09-prompt's "NO pricing, NO lead capture anywhere" framing is STALE — flag for
   lane 7 to correct in tomorrow's prompt.
2. Ad-UX telemetry: `trackRewardedAdOffered/Watched/Declined` already called from every
   rewarded surface (`RewardedAdGoldButton`, `TimeLowAdPrompt`, `DoubleGoldAdButton`,
   `RetryAssistModal`, `BossRushResults`, `WatchAdForFreezeButton`, `WatchAdButton`,
   `ShareSection`, `MemoryHuntCluePanel`, `useRewardedFeatureUnlock`, `useRewardedAd`).
   No missing-instrumentation gap found.
3. IAP/subscription demand probe: `components/ads/RemoveAdsProbe.tsx` (mounted in
   `settings/PageClient.tsx`) and `components/monetization/SupporterInterestCard.tsx`
   (mounted in `profile/PageClient.tsx`) already exist and fire `iap_viewed/tapped/purchased`.
4. Teacher Pro upsell (`ProGate`, `ClassLimitUpsellModal`, `TeacherProAskBanner`,
   `/teacher/upgrade`) already live per `teacher-pro-surface-map-2026-09-09` memory.

Intel brief signal (rewarded_ad_watched 0/24h vs 7d avg 2.14, reach=0) is too thin to act on
blind — reach=0 means near-zero underlying volume, and a real diagnosis needs a PostHog
breakdown of `rewarded_ad_declined` reasons (no_ad_provider vs daily_limit_reached vs
placeholder_cooldown) which needs a schema-drilled query I did not have budget for tonight.
revenue-latest.json snapshot not present this run (search + supabase sources stale per brief).

## Ranked backlog for tomorrow
1. [S] Correct lane-09 prompt's stale "education upsell = free, no lead capture" framing —
   it's built; redirect lane-09 to AUDIT lead-form conversion (is anyone submitting?) instead
   of re-building capture UI.
2. [M] Query PostHog `rewarded_ad_declined` breakdown by `reason` last 7d — if
   `no_ad_provider` or `placeholder_cooldown` dominates, that's a real fill-rate/config issue
   worth a targeted fix (distinct from the banned reward-VALUE changes).
3. [S] Provision `ADMOB_API_TOKEN` or have founder re-run
   `scripts/nightly/lib/pull-revenue-snapshot.sh` — unattended lanes have had 0 real eCPM
   signal for multiple nights running on qualitative brief alone.
4. [M] Once H5/AdSense is approved, audit `NEXT_PUBLIC_H5_ADS_ENABLED` gate readiness —
   currently OFF; confirm the triple-gate in `useRewardedAd.ts` needs no code change to flip.

next_steps: pick item 2 (PostHog decline-reason breakdown) first tomorrow — cheapest, most
likely to surface a real actionable fill-rate bug; hand item 1 to lane 7 for prompt update.
