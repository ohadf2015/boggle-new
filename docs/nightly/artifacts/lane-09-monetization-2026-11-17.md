status: research-only
attempted: add honest "for schools / contact sales" lead-capture CTA — ABORTED after orientation found it already fully shipped.

## orientation findings (grep, not speculation)
All four STEP-3 playbook options are already built + wired on master:
1. **Edu lead-gen**: `app/[locale]/education/for-schools/{page.tsx,content.ts}` (680 lines),
   `app/api/education/school-lead/route.ts`, `components/education/{SchoolLeadForm,DistrictUpsellStrip,
   ForSchoolsLink,TeacherAccessCTA,ClassLimitUpsellModal,results/ResultsSchoolQuoteLink,
   results/ResultsTeacherProTrialCard}.tsx` — linked from education hub, teacher profile, about, guides,
   SEO callout, games-for-teachers landing. Nothing missing to add here without duplicating.
2. **Ad-UX instrumentation**: `rewarded_ad_offered/watched/declined/lifecycle` all defined
   (`utils/growthTracking.ts:233-249`) and called from 8+ real surfaces (`RewardedAdGoldButton`,
   `DoubleGoldAdButton`, `WatchAdButton`, `ShareSection`, `MemoryHuntCluePanel`, `useClueAd`, etc.) —
   not a wiring gap.
3. **IAP/supporter-interest probe**: `components/monetization/SupporterInterestCard.tsx` +
   `components/ads/RemoveAdsProbe.tsx` both exist AND are mounted (SinglePlayerResults, profile
   PageClient, settings PageClient) — not unwired-but-typed, already live.
4. Trial offer (the 2026-11-07 founder ask) — shipped interactively 2026-11-16 (`dae168fa5`,
   per nightly learnings doc) — confirmed not to re-propose.

Brief signal (`rewarded_ad_watched: 0/24h, 7d avg 0`) has severity 0.4 / reach 0 — too thin to act
on blind; search+supabase sources were stale this run too. Did not chase it tonight: a 0-watched
reading could be a real regression or just low sample, and diagnosing needs the (missing) revenue
snapshot or AdMob token, not a guess-and-edit.

files_touched: none
next_steps:
- Founder: run `scripts/nightly/lib/pull-revenue-snapshot.sh` (Playwriter) or provision
  `ADMOB_API_TOKEN` so lane 09 gets real eCPM/fill-rate data instead of a 0.1-score stub.
- If `rewarded_ad_watched` truly stayed at 0 for 24h+ (not just a reporting gap), that is a bug,
  not a monetization-feature gap — route to lane 02/11 to check `useRewardedAd.ts` ad-provider
  init on the next run with real data.
- Lane 09 should widen its grep next time to `components/monetization`, `components/ads`,
  `for-schools`, `SupporterInterestCard`, `RemoveAdsProbe` before proposing — this surface is done,
  further monetization value is more likely in: (a) diagnosing why `rewarded_ad_watched` reads 0,
  (b) a schools-landing conversion-copy pass (hand off to lane 05/08, not lane 09 scope), or
  (c) checking `school-lead` submission volume in Supabase to see if the funnel is actually
  converting leads, which lane 09 did not have time to query tonight.
