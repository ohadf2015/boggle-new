status: partial
attempted: Word vault escape-room rework (founder directive) + analytics instrumentation

files_touched:
  - fe-next/components/word-vault/HubFoyer.tsx
  - fe-next/components/word-vault/RoomShell.tsx

shipped:
  1. HubFoyer rework: removed WorldmapPanel modal + hidden "מפת חדרים" link.
     Room corridor now always-visible inline list — all 6 rooms shown on hub screen
     with locked/solved/available state. Players see the full map on arrival.
  2. Analytics: word_vault_hub_visited (fires on hub mount, includes solved_count)
  3. Analytics: word_vault_room_entered (fires on every room entry, includes roomId + is_revisit)
  4. Analytics: word_vault_room_solved (fires on every non-BeatRunner room solve via handleSolve)

not_shipped:
  - Goal 2 (new typed A/B experiment): deferred — Hebrew-only + admin demo has no traffic to decide; flag hygiene first
  - Dead flag hygiene: grep verification showed all 3 suspected flags ARE actively wired in code — no triage entries added
  - Puzzle rework (founder directive part 2: "rework the puzzles"): architectural work beyond one lane's budget

next_steps:
  - Puzzle rework: riddle depth audit (cipher jars 1.2, logic-sequence 1.4 feel thin); add multi-step reveal, wrong-answer feedback, hint system
  - HubFoyer atmosphere: add storyBeat tease text under each room title (first ~40 chars), room-number stylized as "חדר א" etc
  - A/B experiment target: vault_hub_visited → vault_room_entered drop-off (use new events once data accumulates)
