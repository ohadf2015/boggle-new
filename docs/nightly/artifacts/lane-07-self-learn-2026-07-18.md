status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 90 lines)
  - docs/nightly/loop-improvements/2026-07-18.md (new, 49 lines)
  - docs/nightly/reports/2026-07-18.md (appended Lane 7 block)
summary: >
  Rewrote learnings.md from the 07-12..07-18 window. This week's headline flipped
  from gate false-negatives (fixed 07-14 by c3973c715, held: 1 salvage 07-15 then 0)
  to PREFLIGHT ABORTS: 07-16 degraded (git divergence, recovered via retry), 07-17
  LOST entirely (repo on feat/pricing-psychology-i18n + dirty tree, no report).
  Crossword graduated (55→90%, Released-ready); lane 11 rotated to shiritori (42%).
  New SPEED pattern: Framer `initial` serialized into SSR renders opacity:0 → kills
  LCP candidate; fix = initial={false}. Supabase MCP now 22 nights dry, 6 migrations
  backlogged.
next_steps:
  - Ship scripts/nightly/tools/preflight-warn.sh (pre-midnight dirty-tree/off-master
    Telegram warn) — spec'd in loop-improvements #2, deferred tonight (needs crontab wire).
  - Human: mint never-expire SUPABASE_ACCESS_TOKEN into nightly env (unblocks 6 migrations).
  - Add preflight-abort Telegram alert to run.sh (loop-improvements #1).
