status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 165 lines)
  - docs/nightly/loop-improvements/2026-06-08.md (new)
  - scripts/nightly/tools/feedback-tally.sh (new, bash -n clean + smoke-verified)
  - docs/nightly/reports/2026-06-08.md (Lane 7 section appended)
summary: >
  Rewrote learnings from 6 report nights. Key shift: MAX_MCP_CALLS cap shipped
  06-04 ended MCP collapse cascade (0 recurrence 06-07/08); dominant blockers now
  ripgrep EACCES + force-dynamic route LCP. Per-lane ship: 04/06/07/08=7/7,
  05=5/7, 01=4/7, 02=3/7, 03=2/7, 09=2/7. Over-scope is the #1 ship-killer.
  Feedback: polish:try×11 (word-tower/forge/alchemy/sealed-bid each ≥2),
  idea:build 80%, night:meh×1. Codified the feedback-tally pipeline into a script.
next_steps: >
  Land scripts/nightly/tools/rg-or-grep.sh (proposed, not written). Wire
  feedback-tally.sh + rg-or-grep.sh references into lane prompts. Add scope-pledge
  line to lanes 05+09 prompts. Surface GSC OAuth re-consent in manager digest.
