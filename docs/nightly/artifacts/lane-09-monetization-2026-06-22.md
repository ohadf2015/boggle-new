---
status: research-only
attempted: Orient on education upsell + IAP probe surfaces; audit existing lead-gen and ad tracking
files_touched: none
---

## What exists (don't rebuild)

- **Education lead gen**: fully built — `SchoolLeadForm.tsx` (form + Supabase submit), `/api/education/school-lead/route.ts` (API), `/education/for-schools/page.tsx` (lead section + form), main `/education` page has a linked card.
- **Rewarded ad tracking**: `trackRewardedAdOffered / Watched / Declined` all wired in `useRewardedAd.ts` across 6+ surfaces.
- **RemoveAdsProbe**: `components/ads/RemoveAdsProbe.tsx` — pure analytics IAP interest probe (no real purchase), fires `iap_viewed` + `iap_tapped` with families-suppression guard. Currently wired ONLY in `app/[locale]/settings/PageClient.tsx`.

## Signal from tonight's brief

- `rewarded_ad_watched`: 9 today vs 2.57/d avg (3.5× spike) — positive, not a problem.
- `iap_viewed` fires only from settings — very low sample, can't measure demand where it matters.
- `school_lead_form_viewed` / `school_lead_submitted` defined in growthTracking but no PostHog volume cited — likely near-zero because the for-schools page is a subpage not promoted in-game.

## Ranked backlog for tomorrow

### 1. Surface RemoveAdsProbe on post-game results [HIGH / ~30 min]
Wire `<RemoveAdsProbe>` into ONE results page (e.g. `SinglePlayerResults.tsx` or `DailyResults.tsx`) behind a GrowthBook flag `exp-remove-ads-probe-results-v1`. Pure analytics — no purchase path, no economy change. Adds `iap_viewed{surface:'results'}` to PostHog so we get real demand signal from game players not just settings-visitors.
- Files: `lib/featureFlags.ts` (add flag), one results component, `__tests__/` for the flag branch.
- Guard: `shouldSuppressAdsForTier(tier)` already exists in RemoveAdsProbe — re-use.
- TDD: test flag=off renders nothing, flag=on renders probe.

### 2. "Contact us for district pricing" sticky CTA on for-schools page [MEDIUM / ~20 min]
The for-schools page already has a lead form but it's below the fold. Add a sticky bottom bar (mobile) with "Get district access →" anchoring to `#lead`. Pure UI, no new backend. 5 locales via `t()`.
- Files: `app/[locale]/education/for-schools/page.tsx` (sticky bar component), `translations/*.js` (1 key × 5 langs).
- Guardrail: doesn't paywall anything, honest CTA only.

### 3. In-game "schools" entry point [LOW / ~40 min]
Add a "Using this in class? →" subtle link in the hamburger menu / header drawer pointing to `/education/for-schools`. Teachers who find the game via students have no current path to the lead form without knowing the URL. Would funnel organic teacher traffic to lead capture.

## Revenue data note
`docs/nightly/intel/revenue-latest.json` not present / stale. Founder should run `scripts/nightly/lib/pull-revenue-snapshot.sh` or provision `ADMOB_API_TOKEN` for unattended eCPM tracking. Without this, ad revenue trend is blind to nightly loop.

## Next steps
Tomorrow's lane 09: implement item #1 (RemoveAdsProbe on results) — highest-signal, lowest-risk (pure analytics, flagged, no economy touch). Estimated time: fits within budget if started first with no orientation overhead.
