---
status: partial
attempted: Flag hygiene (updated triage queue with fresh exposure data), added exp-leaderboard-play-cta-v1 to experiments registry, instrumented 3 analytics event helpers
files_touched:
  - fe-next/lib/experiments.ts
  - fe-next/utils/posthogEngagement.ts
  - docs/nightly/triage-queue.md
next_steps: |
  Wire exp-leaderboard-play-cta-v1 in PageClient.tsx (BLOCKED: file 519/500 lines — refactor first).
  Create PostHog flag 'exp-leaderboard-play-cta-v1' in UI (50/50 rollout).
  Fire trackResultsScreenViewed from SP results page.
  Human: delete show-signup-after-first-win + share-prompt-timing flags from PostHog (both orphaned, recommend retire per triage queue).
---
