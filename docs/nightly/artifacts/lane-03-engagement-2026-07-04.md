status: research-only
attempted: Full flag hygiene audit (all wired experiments >7d), rage-click root-cause analysis for /en/multiplayer, triage-queue updates for 3 stale items, experiment proposal documented
files_touched:
  - docs/nightly/triage-queue.md (3 new entries: exp-results-replay-cta-v1 retirement, landing-modes-cubes-v1 kill-switch, exp-mp-room-join-loading-v1 proposal with full spec)
next_steps: |
  Implement exp-mp-room-join-loading-v1 per spec in triage-queue.md 2026-07-04:
  1. experiments.ts: add entry (variants: control, loading-state)
  2. RoomListView: joiningRoomCode? prop + disabled card + spinner when variant=loading-state
  3. CgAwareLobbyChrome: pass joiningRoomCode to RoomListView (1 line)
  4. posthog-experiment.sh ensure exp-mp-room-join-loading-v1 control loading-state
  5. Add events: mp_room_card_clicked, mp_room_join_loading_shown
  Retire exp-results-replay-cta-v1 if PostHog shows inconclusive (32d).
