status: partial
files_touched: docs/nightly/impact-ledger.ndjson, docs/nightly/triage-queue.md, docs/nightly/reports/2026-08-13.md
next_steps: |
  Top rage-click signal (/en/multiplayer?room=XXXXXX, score 0.896) root-caused but NOT fixed:
  the ?room= deep-link auto-join (hooks/useMultiplayerSession.ts:98-179 -> components/multiplayer/MultiplayerFlow.tsx:261-267
  handleInvitationAutoJoin -> handleJoin) skips JoinRoomModal entirely and shows zero loading/joining UI,
  unlike the manual join button (JoinRoomModal.tsx:219 has isJoining state) and room-card join
  (RoomListView.tsx:355-366 disables + tracks trackMpRoomJoinBlocked). On failure the room-gone toast
  is 5s + easy to miss, room= is silently stripped from URL (PageClient.tsx:368), lobby returns to
  normal all-enabled state with no persistent error -> reads as frozen -> rage clicks.
  Next lane: add a "joining room..." toast/spinner at the MultiplayerFlow.tsx:261-267 auto-join call site,
  behind a NEW typed flag (do not reuse/re-wire the reverted exp-mp-lobby-connect-feedback-v1 -- that
  ES-only variant caused rageclicks to INCREASE 6->22/7d, see memory mp-flow-friction-and-results-choreography-2026-08-01).
  Full detail in docs/nightly/triage-queue.md under "## 2026-08-13 (lane 03 engagement)".
  Also still open: full flag-hygiene sweep for decided-winner (p<0.05, n>=1000/arm) active experiments
  was not reached this run (would need experiment-results queries per active flag) -- ~15 active flags
  in lib/experiments.ts untouched, e.g. exp-mp-quickplay-eager-disable-v1, exp-wordhunt-clue-shake-v1.
