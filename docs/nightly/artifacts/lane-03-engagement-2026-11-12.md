status: shipped
files_touched:
  - fe-next/lib/experiments.ts (new typed experiment: exp-wordtower-placing-nudge-v1)
  - fe-next/components/wordTowerV2/LetterRow.tsx (blocked-tap nudge + telemetry)
  - fe-next/components/wordTowerV2/__tests__/LetterRow.test.tsx (updated + new test)
next_steps: |
  PostHog flag exp-wordtower-placing-nudge-v1 created live (id 357738,
  status=created) via posthog-experiment.sh ensure. Flag hygiene sweep (goal 1) and the
  instrumentation-gap pass (goal 3) were SKIPPED this run — only goal 2 (one
  new experiment) landed, scoped to the single highest-score brief item
  (rage clicks on /he/word-tower/daily, reach=7). No decided-flag removals
  attempted; no new raw instrumentation events beyond the one the fix itself
  required (growth:wordtower_placing_tap_blocked, which doubles as both the
  new event AND the new experiment's signal).
