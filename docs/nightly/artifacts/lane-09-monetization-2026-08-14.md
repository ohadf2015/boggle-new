status: research-only
attempted: audit for a safe monetization ship. All 3 standing priorities already shipped by prior nights:
  1. Education lead-gen: app/[locale]/education/for-schools/page.tsx has full SchoolLeadForm + FAQ +
     competitor comparison table + EducationalOrganization JSON-LD offers. Not a gap.
  2. Ad-UX instrumentation: rewarded_ad_offered/watched/declined all defined (utils/growthTracking.ts:134-136)
     and called from 10 real surfaces (DoubleGoldAdButton, TimeLowAdPrompt, RewardedAdGoldButton,
     BossRushResults, RetryAssistModal, MemoryHuntCluePanel, WatchAdButton, WatchAdForFreezeButton,
     ShareSection, useRewardedFeatureUnlock). Not a gap.
  3. IAP interest-probe scaffolding: components/ads/RemoveAdsProbe.tsx mounted in settings/PageClient.tsx,
     components/monetization/SupporterInterestCard.tsx mounted in profile/PageClient.tsx. Both real, not
     phantom-unwired.
files_touched: none
next_steps: |
  Brief signal `rewarded_ad_watched: 0/24h` (7d avg 0.43) has low reach — before assuming it's a code
  gap, verify `rewarded_ad_offered` is actually firing at comparable volume across all 10 surfaces
  (query posthog growth:rewarded_ad_offered by surface, last 7d). If offered >> watched, that's a
  genuine decline-rate problem worth a UX pass on the CTA copy/timing on whichever surface has the
  worst offered->watched ratio. If offered is ALSO ~0, this is pure traffic (1009 visitors/mo per
  memory admob-decline-is-traffic) and not actionable in this lane.
  Untried this window: teacher/upgrade PageClient pricing-page copy/psychology pass (last touched
  2026-07-16 per pricing-page-psychology memory) — worth a fresh look for conversion friction next run.
