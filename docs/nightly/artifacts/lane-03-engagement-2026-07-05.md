status: shipped
files_touched:
  - fe-next/lib/experiments.ts (+exp-mp-room-join-loading-v1)
  - fe-next/components/multiplayer/RoomListView.tsx (import useExperiment + joiningRoomCode prop + disabled state + spinner)
  - fe-next/components/multiplayer/CgAwareLobbyChrome.tsx (pass joiningRoomCode to RoomListView)
new_experiment: exp-mp-room-join-loading-v1 (control vs loading-state) — PostHog flag id=219697 created
flag_hygiene: All exp-* keys verified WIRED (rg confirmed per-key); no experiments meet retirement threshold (n too small); old zombie flags (blast-wave-banner-v1 inactive) noted in report
funnel_gap_targeted: game_started→game_completed 52% completion; immediate fix: mp rage-click disabled via join loading state
next_steps: |
  - Wire 2-3 analytics events (results_screen_viewed not yet called from SP results)
  - Add game_abandoned event on quit-confirm confirm path
  - Retire exp-blast-wave-banner-v1 (inactive PostHog flag, wired in code — human review needed)
