status: shipped
attempted: Impact-check homepage-click-feedback-v1, flag hygiene sweep, new experiment targeting Hebrew word-hunt rage clicks, wordhunt_invalid_submitted instrumentation event
files_touched:
  - fe-next/lib/experiments.ts (added exp-wordhunt-clue-shake-v1)
  - fe-next/components/daily/DailyWordHuntSurvival.tsx (useExperiment + shake wiring + trackGrowthEvent)
  - fe-next/utils/growthTracking.ts (added wordhunt_invalid_submitted to GrowthEvent)
  - docs/nightly/impact-ledger.ndjson (verdict + 2 new entries)
  - docs/nightly/triage-queue.md (zombie flag exp-mp-room-join-loading-v1)
  - docs/nightly/reports/2026-07-22.md (lane report)
next_steps:
  - HUMAN: deactivate exp-mp-room-join-loading-v1 in PostHog (0 call sites, zombie)
  - Check exp-wordhunt-clue-shake-v1 rage-click delta in 7d
  - wordhunt_invalid_submitted event surfaces per-variant breakdown in PostHog by 07-29
