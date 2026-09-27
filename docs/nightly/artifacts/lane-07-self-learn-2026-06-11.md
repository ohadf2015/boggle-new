status: shipped
files_touched: docs/nightly/learnings.md (rewrite), docs/nightly/loop-improvements/2026-06-11.md (new), docs/nightly/reports/2026-06-11.md (append)
summary: |
  Rewrote learnings.md from 06-06..06-11 reports. NEW highest-priority watch =
  experiments wired but PostHog flags never created (exp-mp-quickplay-wait-v1,
  exp-invite-arrival-clarity-v1 both dark). Closed AutoHideHeader CLS + INP-noise.
  Ship rates: 04/07=6/6, 06/08=5/6, rest 4/6. Gate clean 2/6.
  loop-improvements top item: digest "FLAG NEEDED" handoff (S, unblocks dark experiments).
next_steps: |
  - Ship scripts/nightly/tools/feedback-tally.sh on a code-budget night.
  - Prompt edits: FLAG-NEEDED block (03), MAX_MCP_CALLS cap (shared), locale-first (05/09).
