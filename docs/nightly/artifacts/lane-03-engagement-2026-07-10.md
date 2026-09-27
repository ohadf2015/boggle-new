status: shipped
files_touched:
  - fe-next/lib/experiments.ts (added exp-mp-round-progress-header-v1 definition)
  - fe-next/components/results/ResultsMainContent.tsx (wired hook + progress pill JSX)
  - fe-next/utils/growthTracking.ts (registered mp_round_gap_nudge_seen + mp_round_progress_header_shown event types)
next_steps:
  - Add fire sites for mp_round_gap_nudge_seen and mp_round_progress_header_shown
  - Triage ≥14d experiments (exp-mp-round-feedback-top-v1/17d, exp-wordhunt-hint-v1/20d, exp-game-abandon-confirm-v1/21d, etc.) — all wired, need human PostHog p-values
  - Investigate rage-click root cause on /en homepage (5 users, score 0.823)
  - Check exp-mp-round-progress-header-v1 sentiment delta after 7 days (baseline 1.5/3)
