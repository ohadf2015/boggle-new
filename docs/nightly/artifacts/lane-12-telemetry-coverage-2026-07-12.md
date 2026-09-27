---
status: shipped
files_touched:
  - fe-next/components/daily/DailyWordHuntResults.tsx (add results_viewed on mount)
  - fe-next/components/daily/__tests__/DailyWordHuntResults.resultsViewed.test.tsx (new test)
next_steps: |
  - Confirm results_viewed volume for word-hunt rises in 3d PostHog check
  - Wire results_viewed for /blast (BlastResultsSummary.tsx fires blast_results_viewed but not canonical results_viewed)
  - results_viewed for /singleplayer classic/survival when played solo (low-traffic, lower priority)
  - Full dead-event backlog drain: adventure_* (0 call sites never-wired), daily_rival_landed, return_visit
---
