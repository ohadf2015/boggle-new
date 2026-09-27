---
status: research-only
attempted: Audited education upsell + rewarded ad surfaces + IAP probe placement. All infrastructure already live; gap is exposure (RemoveAdsProbe fires only on low-traffic Settings page).
files_touched: none
next_steps: |
  HIGHEST LEVERAGE — ship next run:
  1. Wire RemoveAdsProbe to post-game results + practice hub.
     - Component: components/ads/RemoveAdsProbe.tsx (tracks iap_viewed/iap_tapped; currently Settings-only)
     - Add surface='results'|'practice' variant, gate behind PostHog flag 'show-iap-probe-results'
     - TDD: probe appears when flag ON, absent when OFF
     - ~5 files max; NO economy change, NO billing, pure analytics signal
  2. After AdSense approval: flip NEXT_PUBLIC_H5_ADS_ENABLED=true to unlock web rewarded path
     (ayeT/GameDistribution routes exist, just gated; rewarded avg 0.86/day is Android-only)

  EDUCATION UPSELL — already complete, nothing to build:
  - DistrictUpsellStrip: education landing PageClient.tsx:216
  - DistrictUpsellBanner: teacher dashboard
  - SchoolLeadForm: for-schools page → app/api/education/school-lead → school_leads table + admin email + admin viewer
  - Check school_leads table for unactioned leads.

  DEAD FLAGS to kill in PostHog (reduces noise in brief):
  - share-prompt-timing (~72d, ~0 exp)
  - show-signup-after-first-win (41, inconclusive)
  - mp-signup-nudge-copy-v1 (0/77 converts)

  REVENUE SNAPSHOT stale: run scripts/nightly/lib/pull-revenue-snapshot.sh or
  provision ADMOB_API_TOKEN for unattended revenue data.
---
