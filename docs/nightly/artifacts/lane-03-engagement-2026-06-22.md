status: partial
files_touched:
  - fe-next/utils/growthTracking.ts (added GrowthEvent types: mp_lobby_ready_toggled, mp_lobby_game_starting, game_feedback_dismissed)
  - fe-next/player/hooks/usePlayerLobby.ts (wired mp_lobby_ready_toggled in toggleReady)
  - docs/nightly/triage-queue.md (appended 3 dead-flag entries for human retire)
next_steps:
  - Wire mp_lobby_game_starting in handleGameStarting in usePlayerLobby.ts
  - Wire game_feedback_dismissed in useGameFeedback.ts dismiss()
  - Define + wire exp-mp-lobby-tips-v1 experiment (targets mp_round 2/3 sentiment)
  - Retire 3 dead flags: share-prompt-timing, show-signup-after-first-win, mp-signup-nudge-copy-v1
