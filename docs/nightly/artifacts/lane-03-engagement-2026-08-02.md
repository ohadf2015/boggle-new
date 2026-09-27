status: shipped
files_touched: fe-next/components/multiplayer/RoomListView.tsx, fe-next/utils/posthogEngagement.ts, fe-next/components/multiplayer/__tests__/RoomListView.joiningRoomCode.test.tsx
next_steps: |
  - Flag hygiene sweep found nothing to retire (all exp-* keys already wired; exp-mp-lobby-connect-feedback-v1 already cleaned up 07-26). Memory item "unwired experiments" is stale — clear it.
  - No new typed A/B experiment shipped this run by design: top brief signal (rageclick on /multiplayer) was a genuine bug (dropped joiningRoomCode prop), fixed directly instead of gated behind a flag.
  - Watch new events mp_room_join_clicked / mp_room_join_blocked for 3 days — mp_room_join_blocked trending to ~0 confirms the fix; check impact-ledger entries.
  - Remaining brief rageclick items (word-wheel practice, practice/classic, both reach=1, low signal) not investigated this run — pick up next time if reach grows.
