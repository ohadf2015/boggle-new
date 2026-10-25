status: research-only
attempted: looked for a safe education-upsell or ad-UX lever to ship; found both already built.
files_touched: none

findings:
- Education lead-gen is DONE: components/education/landing/LandingSchoolLead.tsx + SchoolLeadForm
  already ship a real inline form (no pricing claims), impression tracking (useUpsellImpression,
  cta: district_upsell), and a /education/for-schools link. Nothing broken, nothing to add safely
  tonight without duplicating it.
- Rewarded-ad funnel is heavily instrumented already: trackRewardedAdOffered/Watched/Declined wired
  in 10+ surfaces (DailyChallenge, WatchAdButton, DoubleGoldAdButton, TimeLowAdPrompt,
  RewardedAdGoldButton, MemoryHuntCluePanel, BlastGame, BoostButton...). hooks/useAdMob.ts/
  useRewardedAd.ts carry extensive incident-derived hardening comments (visibility-reconcile grace,
  immersive-mode tradeoff, rewarded-interstitial vs rewarded-video namespace bug). This is the
  single riskiest code in the repo to touch blind in a 10-min lane — skipped on purpose.
- Brief's "rewarded_ad_watched 0/24h" is explained by code comments, not a new bug: AdMob native is
  the ONLY provider with real fill (web H5 ads gated off pending AdSense; CrazyGames iframe-only).
  0 in a 24h window is consistent with low native session volume, not necessarily a regression.
  Did NOT touch ad code without real eCPM/fill data to confirm a problem exists.
- IAP "remove ads" already has a full real path: components/ads/RemoveAdsProbe.tsx (web, honest
  "coming soon", iap_viewed/iap_tapped tracked) + app/api/purchases/remove-ads/play/route.ts (real
  Play Billing verify + grant_remove_ads RPC) — already live on native.
- Teacher Pro funnel already wired: ProFramingSection + TeacherProCheckoutCta on education landing,
  iap_viewed on teacher/upgrade page for both teacher_pro and district_inquiry products.
- Revenue snapshot infra is the actual gap: docs/nightly/intel/revenue-latest.json absent,
  ADMOB_API_TOKEN unset -> brief runs on a single thin PostHog metric with no eCPM/fill context.

next_steps:
- Founder: run scripts/nightly/lib/pull-revenue-snapshot.sh once (Playwriter, interactive) and/or
  provision ADMOB_API_TOKEN so future lane-09 runs get real fill-rate/eCPM signal instead of one
  PostHog counter.
- Once that data exists: break rewarded_ad_watched down BY SURFACE (10+ surfaces wired) to find if
  one placement underperforms, rather than reading the aggregate as a single signal.
- If a future lane wants a genuinely new monetization slice: the gap is NOT lead-gen or ad
  telemetry (both done) — it's conversion on the ALREADY-CAPTURED school leads (no CRM/follow-up
  visible) or a second education upsell surface beyond the landing page (e.g. teacher HQ idle
  moments). Both are bigger than one 10-min lane; scope before attempting.
