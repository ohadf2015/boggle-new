status: shipped
files_touched:
  - fe-next/utils/growthTracking.ts (added mp_results_viewed | mp_round_ready_clicked | mp_results_exit_clicked event types)
  - fe-next/lib/experiments.ts (added exp-mp-round-feedback-top-v1)
  - fe-next/components/results/ResultsMainContent.tsx (wired experiment + mp_results_viewed useEffect)
next_steps:
  - Wire mp_round_ready_clicked in ResultsPage.tsx handleMarkReady callback
  - Wire mp_results_exit_clicked in ResultsPage.tsx handleExit callback
  - Triage dead flags: share-prompt-timing, show-signup-after-first-win, mp-signup-nudge-copy-v1 (human decision)
  - Deactivate orphan PostHog flag exp-daily-hub-streak-nudge-v1 (in PostHog, not in experiments.ts, 0 callsites)
