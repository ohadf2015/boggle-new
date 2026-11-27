status: research-only
attempted: check for shipped trial/upsell work on master first, then pick 1-2 safe monetization actions.
files_touched: none

findings:
- for-schools lead-capture + pricing ($49/teacher/yr, $9/mo Pro, $39/term classroom) already shipped and mature
  (app/[locale]/education/for-schools/page.tsx, ForSchoolsPackages, GTM events) — last touched #1990 (card-required wording).
  No gap found worth a diff tonight.
- Rewarded-ad telemetry (offered/watched/declined) already wired on all known surfaces: useRewardedAd.ts,
  useRewardedFeatureUnlock.ts, DoubleGoldAdButton, RewardedAdGoldButton, MemoryHuntCluePanel, ShareSection, WatchAdButton.
- IAP interest probes already shipped and rendered on real pages: RemoveAdsProbe (app/[locale]/settings/PageClient.tsx),
  SupporterInterestCard (app/[locale]/profile/PageClient.tsx, SinglePlayerResults.tsx behind flag
  `supporter-card-sp-results`).
- Brief signal (rewarded_ad_watched 0/24h) scored 0.1/reach=0 by the intel collector itself — too weak to act on;
  likely a quiet-period read, not a real regression. Did not spend budget chasing it via PostHog given the low score
  and the stale search/supabase sources flagged this run.

next_steps:
- Nothing safe-and-new identified tonight without duplicating already-shipped work. Next lane 09 run: before
  proposing, re-grep `rg -l 'ForSchoolsPackages|SupporterInterestCard|RemoveAdsProbe'` to confirm this list is still
  current, then look one layer deeper — e.g. check `supporter-card-sp-results` flag rollout % via PostHog (cheap
  one-off query, skipped tonight for time) to see if it's still at a test percentage months later.
- If AdMob revenue snapshot stays stale, founder should provision ADMOB_API_TOKEN so this lane gets real reach
  numbers instead of a 0.1-scored PostHog-only signal.
