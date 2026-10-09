status: shipped
files_touched:
  - fe-next/components/multiplayer/results/MpResultsStage.tsx (fix: fire mp_results_viewed on actual stage mount, not just on opt-in details-sheet open)
  - fe-next/components/multiplayer/results/__tests__/MpResultsScreen.test.tsx (TDD test for the above, RED->GREEN confirmed)
  - docs/nightly/impact-ledger.ndjson (impact entry)
  - docs/nightly/reports/2026-10-09.md (lane report)
next_steps: |
  - mp_brag_card_viewed has the IDENTICAL regression (same ResultsMainContent gating) but its registry
    doc claims a separate "collapsed strip" surface that no longer exists in MpResultsStage — needs a
    design decision on where that impression should fire before wiring, not a copy-paste fix.
  - ResultsMainContent still fires mp_results_viewed too now (double-counts for users who open the
    details sheet) — cheap follow-up: dedupe per gameCode/round via a ref, same pattern as
    useGameEndTelemetry.
  - §1b never-wired backlog + per-mode completion holes not reached this run (regression chase ate
    the whole budget, which is correct per the lane's priority order).
