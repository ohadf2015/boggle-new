status: research-only
files_touched: none

attempted: checked the 3 preferred STEP-3 options from the brief before writing code.

findings:
1. Education lead-gen (preferred #1) — ALREADY BUILT. `app/[locale]/education/for-schools/page.tsx`
   has a full funnel: hero CTA -> `#lead` anchor -> `ForSchoolsPackages` (lead form, "Get a school
   quote") -> closing CTA. JSON-LD offers (Free/Pro $9mo/Schools $49/teacher-yr) are honest and
   already correct ("Lead capture via Get a school quote — no public checkout"). No gap found.
2. Ad-UX event wiring (preferred #2) — rewarded_ad_offered/watched/declined/lifecycle all defined
   in utils/growthTracking.ts and called from 7 sites (DoubleGoldAdButton, RewardedAdGoldButton,
   useRewardedAd, useRewardedFeatureUnlock, ShareSection, MemoryHuntCluePanel, WatchAdButton).
   Brief's only intel signal (rewarded_ad_watched 0/24h, score 0.06, reach=0) reads as low
   overnight traffic, not a missing-instrumentation bug — not actionable without real volume.
3. IAP interest-probe scaffolding (preferred #3) — ALREADY BUILT. `components/ads/RemoveAdsProbe.tsx`
   fires `iap_viewed`/`iap_tapped` (pure analytics, no purchase path), gated off for Families tier
   via `shouldSuppressAdsForTier`. Currently a 5-line UNCOMMITTED diff already in flight on this
   exact file from another concurrent lane tonight (`git diff --stat` showed +5/-4) — did not touch
   it to avoid colliding with that in-progress edit.

next_steps (ranked, for tomorrow):
- RemoveAdsProbe call sites VERIFIED: mounted on `settings` (app/[locale]/settings/PageClient.tsx:506)
  and `practice_results` (components/singleplayer/results/PracticeResults.tsx:425) surfaces already —
  not a gap. Next candidate surface to add once the in-flight edit lands: daily/MP results screens
  where ad-fatigue is highest (check `iap_viewed` reach per surface in PostHog first).
- Revisit the AdMob revenue snapshot once `revenue-latest.json` / `ADMOB_API_TOKEN` is live — all 3
  intel sources (revenue, search, supabase) were stale this run per the brief, so tonight's single
  signal (score 0.06) is too thin to act on.
- No gap found in education or ad-event-wiring tonight; re-run this lane's STEP-3 checklist against
  origin/master fresh each night rather than assuming yesterday's gaps still exist — both "gaps"
  the brief suggested were already shipped.
