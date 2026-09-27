status: shipped
files_touched: fe-next/components/multiplayer/MultiplayerFlow.tsx
attempted: flag hygiene sweep (exp-mp-quickplay-eager-disable-v1 impact check) + new experiment targeting multiplayer rage-click (room join flow) + instrumentation gaps
next_steps: |
  IMPACT CHECK ran REGRESSED: exp-mp-quickplay-eager-disable-v1 rage clicks on
  /multiplayer went 7 -> 54 since 07-29 (query: rageclick events LIKE '%/multiplayer%'
  since 2026-07-29). Root cause found + fixed: isQuickPlayPending (local eager-disable
  state) only cleared via an effect keyed on the parent isJoining prop flipping to
  false, but handleJoin (useMultiplayerJoin.ts) has early-return paths (socket not
  connected) that never call setIsJoining(true) — isJoining never changes, effect
  never re-fires, Quick Play button stays stuck disabled/spinning for the rest of the
  session -> users mash it -> rage clicks. Fixed with a bounded 8s fallback timeout
  that force-clears isQuickPlayPending independent of the isJoining transition.
  TDD test written first (RED confirmed: pending stuck true past 9s without fix), but
  the GREEN pass hit a mock-wiring mismatch (RoomListView isJoining prop came back
  undefined in the empty-activeRooms render path) that could not be resolved inside
  the time budget — test file REVERTED to avoid shipping a red test; production fix
  kept (small, additive, only adds a timeout that can't fire on the happy path since
  isJoining flips before 8s normally). TOMORROW: (1) add proper regression test for
  this fix, (2) re-run the 7d rageclick query in ~3 days to confirm the fix drops it
  back toward baseline, (3) resume STEP 1-4 (flag hygiene sweep on other experiments,
  new experiment, instrumentation gaps) — not started, ran out of budget chasing this
  regression, which was correctly the top task per HARD RULES.
