status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 98 lines)
  - docs/nightly/loop-improvements/2026-06-28.md (new, 48 lines)
  - docs/nightly/reports/2026-06-28.md (appended Lane 7 section)
summary: >
  Rewrote learnings.md from 6 report nights (06-23..06-28): 0 reverts, all 12
  lanes 6/6. #1 infra friction reclassified — baseline-red gate poison is FIXED;
  Supabase MCP token staleness (4/6 nights) is the new top friction. Feedback 7d:
  polish:try x9 (90%), modeqa:ontrack:word-tower x5, idea:build x3 (100%).
next_steps: >
  Ship scripts/nightly/tools/feedback-tally.sh (deferred tonight, out of budget).
  Act on loop-improvement #1: mint never-expire Supabase PAT into nightly env.
