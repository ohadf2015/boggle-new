---
status: research-only
files_touched: none
---

## What I found

### Education upsell — already complete
- `DistrictUpsellStrip` (teacher + district dual-CTA with `education_upsell_impression` + `landing_cta_clicked` events) IS imported AND rendered in `education/PageClient.tsx:14,216` — already wired
- `SchoolLeadForm` at `education/for-schools/page.tsx:185` is complete: `school_lead_form_viewed` on mount, `school_lead_submitted` on success, full validation, API at `/api/education/school-lead`
- All 5 locale translation keys for `education.landing.teacherLeadCta.*` + `education.landing.districtCta.*` exist (en.js:11128, he:11694, es:11430, sv:11514, ja:11414)
- **Education upsell funnel is functionally complete.** No code change needed.

### Rewarded ads — ZERO production surfaces
- `useRewardedAd.ts` (536 lines) exists but has ZERO tsx consumers in production code
- `trackAdOffered` / `trackAdWatched` / `trackAdDeclined` helpers defined in `growthTracking.ts:1110-1132` but never called from any component
- `rewarded_ad_watched: 0/24h (7d avg 1.28)` in brief = consistent with no ad offer UI existing
- Hooks available: `useAdMob.ts`, `useInterstitialAd.ts`, `useRewardedFeatureUnlock.ts`, `useAyetVideoAds.ts`, `useCrazyGamesAds.ts`

### Revenue-data hygiene
- Revenue snapshot at `docs/nightly/intel/revenue-latest.json` is likely stale/absent (brief was thin, only 1 signal)
- Founder should run `scripts/nightly/lib/pull-revenue-snapshot.sh` or provision `ADMOB_API_TOKEN`

## Ranked next steps for tomorrow

### 1. Wire rewarded ad offer on one post-game surface [HIGH — biggest gap]
The entire rewarded ad system is built but has no UI entry points. Wire `useRewardedAd` to one post-game result component (e.g., `SinglePlayerResults.tsx` or `WordHuntResultsContent.tsx`) as a "Watch an ad for +N coins" CTA.
- Emit `trackAdOffered({ surface: 'post_game_results', ... })` on render
- Emit `trackAdWatched` / `trackAdDeclined` on resolution
- Behind `NEXT_PUBLIC_H5_ADS_ENABLED` triple-gate (already exists)
- TDD first; ~4-6 files; keep behind flag

### 2. Wire rewarded ad on hint surfaces [MEDIUM]
`useRewardedAd` + hint surfaces in adventure/wordfall: "watch ad to reveal hint" — directly replacing the coin cost with an ad reward option on surfaces that already have hint UI.

### 3. AdSense re-submit [LOW — human op, Lane 08]
E-E-A-T bar cleared 06-17+. Manual action in AdSense dashboard. Not this lane.

### 4. Revenue snapshot freshness [INFRA]
Brief can only see `rewarded_ad_watched` event counts, not AdMob eCPM or earnings. Provision `ADMOB_API_TOKEN` for unattended pull, or run interactive Playwriter snapshot.
