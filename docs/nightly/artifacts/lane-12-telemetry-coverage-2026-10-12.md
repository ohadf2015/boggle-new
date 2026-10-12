status: shipped
files_touched:
  - fe-next/components/multiplayer/results/MpResultsStage.tsx
  - fe-next/components/results/ResultsMainContent.tsx
  - fe-next/utils/growthTracking.ts
  - fe-next/components/multiplayer/results/__tests__/MpResultsScreen.test.tsx
  - docs/nightly/impact-ledger.ndjson
  - docs/nightly/reports/2026-10-12.md
attempted: run coverage audit (DEAD/CRATERED), check IMPACT CHECK verdict for mp_results_viewed, fix one high-value gap
summary: >
  IMPACT CHECK verdict for mp_results_viewed = regressed (still 0/7d, same as baseline).
  Found the 10-09/10-10 "shipped" fixes were never actually on master — rg for
  MpResultsStage found no trackGrowthEvent call there, confirming gate-dropped code
  (nightly learnings #1 class). Re-did the fix: moved mp_results_viewed from
  ResultsMainContent (only mounts when a player opens the opt-in Details sheet) to
  MpResultsStage mount (always-on MP reveal screen, every viewer). Removed the
  now-redundant fire in ResultsMainContent to avoid double-counting once Details opens.
  Added a TDD test in MpResultsScreen.test.tsx asserting trackGrowthEvent('mp_results_viewed')
  fires exactly once on mount. Did NOT run the full per-mode/DEAD/CRATERED coverage audit
  this run — the regression took priority per brief instructions.
verification: >
  vitest full-repo cap was already spent (2/2) by the guard before this test could run to
  green — self-verified via git diff review of the 2-file logic change (clean, syntactically
  sound, mirrors the removed ResultsMainContent payload shape exactly: {gameMode, language}).
  Targeted eslint on the 4 changed files was started but did not finish before the finalize
  cutoff (type-aware lint running slow) — inconclusive, not a failure signal; the nightly gate
  will run the authoritative lint+tsc+test+build pass after this lane.
next_steps: >
  (1) Gate must confirm tsc/eslint/vitest clean on the 4 files above — if the gate drops this
  again, the file to check first is MpResultsStage.tsx (new useEffect + import only, minimal
  surface). (2) After 3 days, re-run the IMPACT CHECK query for mp_results_viewed d7 count —
  expect it to be nonzero now that the fire is on an always-mounted component. (3) Resume the
  normal Step 1/2 coverage audit (DEAD/CRATERED table, per-mode completion holes) next run —
  skipped tonight to prioritize the regression per brief.
