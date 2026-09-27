status: shipped
attempted: rewrite learnings.md from last 7 reports + write loop-improvements/2026-06-05.md (meta-review of nightly loop)
files_touched:
  - docs/nightly/learnings.md (rewritten, 91 lines)
  - docs/nightly/loop-improvements/2026-06-05.md (new, 48 lines)
  - docs/nightly/reports/2026-06-05.md (lane-7 section appended)
key_findings:
  - 06-02 MCP-spiral timeout collapse RECURRED (6 lanes rc=124); MAX_MCP_CALLS cap unshipped 11+ nights = #1 infra gap
  - low-MCP lanes (04,07)=6/6; heavy-MCP lanes (02/03/08) stuck at 3/6 — timeouts track MCP call count not difficulty
  - Telegram: night:meh x1 (06-03), idea:build x3 vs pass x1, polish:try flood (sealed-bid x3, word-tower x2)
  - perf WIN idx_web_vitals_player_id shipped; GAP /en/multiplayer CLS 0.057->0.29 (AutoHideHeader null) fix authored unshipped
next_steps:
  - implement MAX_MCP_CALLS=3 cap + intel-snapshot.sh; ship authored /en/multiplayer CLS fix
  - feed polish:try aggregate into lane 05 preamble; build the 3 idea:build-voted concepts
founder_directive_note: party-game admin polish = lane 05 scope (not 07) — noted+skipped; corroborated by polish:try callbacks
