status: shipped
attempted: Investigate rage clicks on /he/daily/word-hunt, clean up decided flags, add one new typed experiment targeting funnel gap, instrument 2-3 missing analytics events
files_touched:
  - fe-next/lib/experiments.ts (added exp-wordhunt-hint-v1 experiment definition)
  - fe-next/components/daily/WordHuntResultsContent.tsx (wired exp-wordhunt-hint-v1 + wordhunt_results_loaded + wordhunt_leaderboard_tap)
  - fe-next/utils/growthTracking.ts (added wordhunt_results_loaded + wordhunt_leaderboard_tap to GrowthEvent union)
  - docs/nightly/triage-queue.md (flagged 3 dead flags + 1 blocked flag for human action)
  - docs/nightly/reports/2026-06-21.md (appended lane 03 section)
posthog_flags_created:
  - wordhunt-crosspromo-position (id:210327) — was wired, missing flag; back-filled
  - wheel-signup-offer-v1 (id:210328) — was wired, missing flag; back-filled
  - wheel-replay-cta-v1 (id:210329) — was wired, missing flag; back-filled
  - exp-wordhunt-hint-v1 (id:210330) — new experiment this lane
next_steps:
  - Human: kill 3 dead flags in PostHog (share-prompt-timing, show-signup-after-first-win, mp-signup-nudge-copy-v1)
  - Human: refactor leaderboard/PageClient.tsx below 500 lines to unblock exp-leaderboard-play-cta-v1
  - Future lane: implement real player-path tap in TabbedDailyLeaderboard so the hint can return
  - Monitor: wordhunt_leaderboard_tap volume — high rate confirms dead-interaction hypothesis
