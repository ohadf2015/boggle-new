status: shipped
files_touched:
  - fe-next/lib/experiments.ts (new exp-mp-quickplay-eager-disable-v1)
  - fe-next/components/multiplayer/MultiplayerFlow.tsx (wire experiment + pending state)
  - fe-next/utils/growthTracking.ts (register mp_quickplay_eager_shown event)
  - docs/nightly/impact-ledger.ndjson (2 entries: impact check + new ship)
next_steps: human must create PostHog flag exp-mp-quickplay-eager-disable-v1 (control/eager-disable, 50/50, 100% rollout) — env.local key not accessible from lane. Zombie flag exp-mp-room-join-loading-v1 (active PostHog, 0 call sites) still needs human deactivation.
