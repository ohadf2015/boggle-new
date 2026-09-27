status: research-only
files_touched: docs/nightly/reports/2026-07-08.md, docs/nightly/impact-ledger.ndjson, docs/nightly/artifacts/lane-12-telemetry-coverage-2026-07-08.md
next_steps: |
  Wire results_viewed across active-mode result screens:
  - components/daily/WordWheelGame.tsx (or its results component) — highest traffic (156 completions/14d)
  - components/daily/survival/ results render — 142 completions
  - classic mode results — 98 completions
  - word-hunt results — 52 completions
  Pattern: useEffect(() => { trackGrowthEvent('results_viewed', { mode, score }) }, [])
  Must TDD: assert trackGrowthEvent called with 'results_viewed' on results mount.
  Note: results_viewed is already in GrowthEvent union (growthTracking.ts:46). No new union entry needed.
findings:
  - game_abandon_attempted: neutral (0 fires expected — players let timer run, not quit button)
  - results_viewed: WIRED-BUT-SILENT root cause found — SinglePlayerResults (with the tracking) only
    renders for solo-bots/practice/challenge modes which get 0 traffic. Active modes have no tracking.
  - drill_completed/drill_started: low-traffic-by-context (2 brain-drill game_started in 14d)
  - wheel_signup_cta_viewed: low-traffic-by-context (guest+experiment condition)
