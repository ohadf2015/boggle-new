---
status: partial
attempted: flag hygiene sweep + new experiment exp-daily-hub-streak-nudge-v1 targeting daily hub rage-click + 3 instrumentation events
files_touched:
  - fe-next/utils/growthTracking.ts (3 new GrowthEvent types)
  - fe-next/lib/experiments.ts (new exp-daily-hub-streak-nudge-v1 definition)
  - fe-next/components/daily/DailyChallengeCube.tsx (useExperiment wire + view/tap tracking)
  - fe-next/translations/en|he|sv|ja|es.js (daily.streakNudge ×5)
posthog_flag: exp-daily-hub-streak-nudge-v1 created (id=211329, 50/50 rollout, both variants live)
next_steps: |
  - landing-modes-cubes-v1 + landing-daily-cube-v1 have no production call sites — deactivate in PostHog (human or lane-01)
  - share-prompt-timing + show-signup-after-first-win running 84d no signal — add to triage-queue for human review
  - word_wheel_touch_miss event defined but not wired — wire in WordWheelGame.tsx onMiss callback (deferred, 1140-line file)
---
