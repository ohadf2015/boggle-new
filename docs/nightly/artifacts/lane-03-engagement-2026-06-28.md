status: partial
files_touched:
  - fe-next/lib/experiments.ts (added exp-mp-score-gap-nudge-v1)
  - fe-next/components/results/ResultsMainContent.tsx (wired gap-nudge variant + render)
  - fe-next/translations/en.js (results.mpGapNudge)
  - fe-next/translations/he.js (results.mpGapNudge)
  - fe-next/translations/sv.js (results.mpGapNudge)
  - fe-next/translations/ja.js (results.mpGapNudge)
  - fe-next/translations/es.js (results.mpGapNudge)
next_steps: |
  - Run: bash scripts/nightly/lib/posthog-experiment.sh ensure exp-mp-score-gap-nudge-v1 control gap-nudge "MP between-round score gap nudge"
  - Add mp_round_completed to GrowthEvent type in growthTracking.ts + fire in ResultsMainContent
  - Note exp-daily-hub-streak-nudge-v1 in triage-queue: PostHog flag live but 0 call sites in code (unwired dead experiment)
  - Note dead flags for human retire: share-prompt-timing (wired, 89d old), show-signup-after-first-win (wired, 89d old), mp-signup-nudge-copy-v1 (UNWIRED, flag live)
  - eslint fe-next/components/results/ResultsMainContent.tsx fe-next/lib/experiments.ts
