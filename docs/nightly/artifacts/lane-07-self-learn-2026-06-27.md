status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 190 lines)
  - docs/nightly/loop-improvements/2026-06-27.md (new)
  - docs/nightly/reports/2026-06-27.md (lane-7 section appended)
attempted: Rewrite learnings.md from 6 reports + 6 run logs + feedback aggregate; write loop meta-review.
outcome: |
  Window 2026-06-22..06-27. 0 code reverts; core 7 lanes 6/6.
  3 big wins captured: baseline-red gate fix, turbopack->webpack flip, app-wide CWV.
  Feedback: idea:build x12 (up from x1/35d), polish:try x40/pass x3, modeqa:ontrack x4, zero reddit.
  6 loop improvements ranked (top: MCP token preflight refresh + scope-gate-tests-to-changed-files).
  2 helper scripts proposed (mcp-health-refresh.sh, feedback-aggregate.sh) -- NOT shipped, flagged for infra night.
next_steps: |
  - Build mcp-health-refresh.sh preflight (lane 02/infra): validate Supabase+Sentry tokens before fan-out.
  - Scope gate Vitest to changed files (kill TESTS-INCONCLUSIVE).
  - Lane 04: emit buildable ideas with named mode+file (idea:build appetite spiked).
  - Lane 11: schedule word-tower modular split (3 files >500L) before more wiring.
