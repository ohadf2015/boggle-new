status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, ~135 lines)
  - docs/nightly/loop-improvements/2026-06-26.md (new)
  - docs/nightly/reports/2026-06-26.md (lane-7 block appended)
summary: >
  Rewrote learnings.md from last 6 reports + git log + feedback. Headline:
  baseline-red gate poison (the standing #1 "what to avoid") was FIXED this week
  via d6ae0896d/e759e8624/415c39188. Founder 06-26 word-tower directive partly
  landed b636fab59 (center sway, stuck toasts, HUD overlap, upgrades wired);
  drop-feel + more upgrades still open. Loop self-review: 5 ranked improvements,
  top = hard per-suite Vitest timeout in gate-runner to kill the 900s idle wedge
  that caused 3 TESTS-INCONCLUSIVE nights.
next_steps:
  - Lane 11/05 pick up word-tower drop-feel (green-zone perfect-drop celebrate) + more upgrades
  - Human/infra: hard per-suite Vitest timeout + lane-start stagger + MCP health probe (scripts/nightly/run.sh)
  - Lane 12: adventure game_completed telemetry hole next
  - Did NOT ship mcp-health.sh helper — gate-runner/run.sh not lane-7-edit-safe under 15min budget; queued
