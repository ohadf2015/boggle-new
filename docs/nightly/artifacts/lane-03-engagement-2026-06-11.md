status: shipped
attempted: audit active feature flags for hygiene, add one new experiment targeting MP rage-click funnel drop, instrument 2-3 missing analytics events
files_touched:
  - fe-next/translations/ja.js (added quickPlay.seekingMatch + seekingMatchSub)
  - fe-next/translations/es.js (added quickPlay.seekingMatch + seekingMatchSub)
  - fe-next/app/[locale]/multiplayer/PageClient.tsx (trackInviteConsumed import + onJoined call)
  - fe-next/utils/growthTracking.ts (extended InviteConsumedProps.path union to include 'direct')
  - docs/nightly/triage-queue.md (3 stale flags + 2 PostHog flags needed)
  - docs/nightly/reports/2026-06-11.md (lane 03 section appended)
next_steps:
  - CREATE PostHog flags exp-invite-arrival-clarity-v1 and exp-mp-quickplay-wait-v1 at 50/50 rollout (bash helper cannot create flags — manual action required)
  - After 7+ days: measure invite_consumed rate vs prior 83% drop; declare exp-invite-arrival-clarity winner
  - Kill mp-signup-nudge-copy-v1 (0/77 converts) and the two 70d stale flags after human review
