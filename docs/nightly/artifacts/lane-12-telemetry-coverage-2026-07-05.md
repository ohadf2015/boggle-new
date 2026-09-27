---
status: shipped
attempted: audit PostHog event coverage vs GrowthEvent registry, triage DEAD/CRATERED/newly-dead, fix highest-value never-wired event
files_touched:
  - fe-next/components/singleplayer/game/hooks/useSinglePlayerCore.ts
  - fe-next/components/singleplayer/game/hooks/__tests__/useSinglePlayerCore.quitTracking.test.ts
next_steps: investigate results_viewed wired-but-silent (0 volume despite 214 SP completions/14d); fix posthog-coverage.sh awk to skip comment lines (false-positive DEAD ~57→42)
---
