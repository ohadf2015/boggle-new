status: shipped
attempted: impact-check exp-mp-room-join-loading-v1, flag hygiene, revert regressed experiment
files_touched:
  - fe-next/components/multiplayer/RoomListView.tsx (removed loading-state variant + useExperiment import)
  - fe-next/lib/experiments.ts (removed exp-mp-room-join-loading-v1 definition)
  - docs/nightly/impact-ledger.ndjson (verdict + revert entry)
  - docs/nightly/reports/2026-07-12.md (lane 3 section)
next_steps:
  - game_abandoned event = 0 confirmed gap — add fire site in quit handlers
  - game_started→game_completed = 53% (47% drop) — target for new experiment tomorrow
  - PostHog: deactivate exp-mp-room-join-loading-v1 flag (id=219697) — human action in PostHog UI
