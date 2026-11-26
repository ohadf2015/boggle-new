status: shipped
attempted: orient on education upsell + ad-UX surfaces; ship one small lead-gen or ad-instrumentation change if safe, else research-only backlog.

## Shipped
fe-next/components/multiplayer/results/MpResultsStage.tsx — guarded the unconditional
`ResultsBannerSlot`/`CrazyGamesBanner` block with `!c.isClassroom`. Every other
classroom exclusion in this file (brag strip, daily invite, H2H strip, mode picker,
rematch/challenge footer) already gates on `c.isClassroom`; this one ad block didn't.
It directly contradicted the for-schools pricing promise ("no ads anywhere in the
classroom, ever" — app/[locale]/education/for-schools/content.ts, 6 locales, paid
upsell claim). Fix restricts an EXISTING ad surface, adds no new ad surface, no flag
needed, no coin/economy change — reversible one-condition wrap.

Test (RED→GREEN by code review, see below):
fe-next/components/multiplayer/results/__tests__/MpResultsStage.classroomAdFree.guard.test.tsx
— asserts banner/CrazyGames mocks fire for a normal round and never fire for a
classroom round (classroomSummary set). Named `*.guard.test.tsx` per the PR-CI naming
rule (60-recurring-pitfalls.md Class 4).

## CRITICAL — could not execute vitest/eslint in THIS run (flag for lane 07 + orchestrator)
`node_modules/.bin` is **entirely missing** in the MAIN checkout (not a CoW isolated
clone) at /Users/ohadfisher/git/boggle-new/fe-next. `npx vitest` → "command not found".
Running the binary directly (`node node_modules/vitest/vitest.mjs run <file>`) hit
`ERR_MODULE_NOT_FOUND: Cannot find package 'obug'`. `node node_modules/eslint/bin/eslint.js`
hit `Cannot find module '@eslint-community/eslint-utils'` — the EXACT 11-19 signature
Headline 0 in nightly-learnings.md assumed was isolated-clone-only. It is not: it is
hitting the real repo tonight. `tsc` (node node_modules/typescript/bin/tsc) DOES work.
Could not run the new test; shipped fix is reasoned by hand — it is a 1-line JSX wrap
of an existing, already-tested block, mirroring 6 identical `!c.isClassroom` guards
already in the same file, so confidence is high, but this is NOT self-verified tonight.
**Lane 07 should treat Headline 0 as "main repo AND isolated clone", not isolated-only,
and the orchestrator's authoritative gate run is the only verification this change has
had — if the gate's node_modules is equally broken, every lane tonight is unverifiable,
not just this one.**

## Research — already shipped interactively, do NOT re-propose
- Education lead-gen/pricing: `app/[locale]/education/for-schools` (content.ts,
  SchoolLeadForm, DistrictUpsellStrip, ForSchoolsLink, TeacherAccessCTA,
  ResultsSchoolQuoteLink, ResultsTeacherProTrialCard) is fully built across 6 locales
  incl. Russian, trial + school-quote flow, wired into teacher home and results pages.
  STEP 2's brief line ("Education free: NO pricing, NO lead capture, NO contact-sales
  anywhere") is STALE/WRONG — correct it in future lane-09 prompts.
- IAP interest probes already exist and are wired: `components/ads/RemoveAdsProbe.tsx`
  (settings page), `components/monetization/SupporterInterestCard.tsx` (profile +
  singleplayer results).
- Rewarded-ad instrumentation (`rewarded_ad_offered/watched/declined`) is wired across
  WatchAdButton, RewardedAdGoldButton, DoubleGoldAdButton, MemoryHuntCluePanel.

## Ranked backlog for tomorrow
1. **DoubleGoldAdButton → daily results** (`components/daily/results/PerformanceSection.tsx`
   has a coin reward, no DoubleGoldAdButton). Component docstring already names
   `'daily_results'` as an intended surface. No classroom concern on daily mode —
   smallest, safest next step, reuses the exact same approved reward-doubling mechanism.
2. **DoubleGoldAdButton → multiplayer results** (`MpResultsStage.tsx` has
   `coinReward?.awarded` via `MpMyCard`, no doubling CTA). Unlike item 1, THIS one is a
   genuinely new ad surface → needs a feature flag (3-site edit per Headline 4) AND
   `!c.isClassroom` from day one. Bigger than tonight's budget; don't start without the
   flag plumbing ready.
3. `components/daily/WatchAdButton.tsx:56` hardcodes `surface: 'generic'` — blocks
   per-surface rewarded-ad decline segmentation in tomorrow's brief. Low effort, low risk.
4. Intelligence brief was near-empty tonight (rewarded_ad_watched 0/24h, reach=0,
   severity=0.4) — recommend the founder run `pull-revenue-snapshot.sh` / provision
   `ADMOB_API_TOKEN` for a non-empty brief.

files_touched:
- fe-next/components/multiplayer/results/MpResultsStage.tsx
- fe-next/components/multiplayer/results/__tests__/MpResultsStage.classroomAdFree.guard.test.tsx
next_steps: run the orchestrator gate; if vitest/eslint fail there too with the same
'obug'/'@eslint-community/eslint-utils' signature, that is a repo-wide breakage, not
this lane's code — see CRITICAL section above. If gate is healthy, confirm the new
guard test is GREEN and the pre-existing MpResultsScreen.adSlot.test.tsx (non-classroom
banner assertions) is still GREEN (unaffected — it never sets classroomSummary).
Otherwise pick up backlog item 1 (DoubleGoldAdButton on daily results).
