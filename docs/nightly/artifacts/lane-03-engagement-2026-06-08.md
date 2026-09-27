status: partial
attempted: Fix ES multiplayer rage clicks — register new experiment, instrument analytics events, flag stale flags for human review
files_touched:
  - fe-next/lib/experiments.ts (exp-mp-quickplay-wait-v1 added to typed registry)
  - fe-next/utils/growthTracking.ts (mp_quickplay_initiated, mp_quickplay_socket_wait, mp_quickplay_joined events)
  - fe-next/components/multiplayer/MultiplayerFlow.tsx (mp_quickplay_initiated wired in handleQuickPlay)
  - docs/nightly/triage-queue.md (3 stale flags queued for human review)
next_steps:
  - Create PostHog flag exp-mp-quickplay-wait-v1 at 50/50 rollout
  - Wire match-seeking overlay in MultiplayerFlow.tsx (useExperiment + translation keys x5)
  - Wire mp_quickplay_joined in PageClient.tsx onJoined callback
  - Retire share-prompt-timing flag (keep results-page branch, remove hook wiring)
  - Retire show-signup-after-first-win flag (keep after-first-win as hardcoded default)
  - Add mp_signup_sheet_shown event before retiring mp-signup-nudge-copy-v1
