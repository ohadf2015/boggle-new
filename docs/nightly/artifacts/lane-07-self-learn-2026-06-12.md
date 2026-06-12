status: shipped
files_touched: docs/nightly/learnings.md (rewritten, 150 lines), docs/nightly/loop-improvements/2026-06-12.md (new), docs/nightly/reports/2026-06-12.md (appended Lane 7 section)
summary: Rewrote learnings from 06-07..06-12 reports + feedback (polish:try x8/pass x2, idea:build x4). Dominant finding: 3 experiments wired-but-dark (no PostHog flags) — biggest loop leak, worsening. Wrote loop-improvements with 6 ranked fixes (FLAG NEEDED digest block #1, locale-first ordering #2).
next_steps: ship scripts/nightly/tools/feedback_tally.sh (S) as first action next lane-7 run; chase the FLAG NEEDED digest block into prompts/03-engagement.md; verify lane 03 actually emits flag handoff.
