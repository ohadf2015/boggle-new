status: shipped
attempted: rewrite docs/nightly/learnings.md from the last 7 nights + write the loop meta-review
files_touched:
  - docs/nightly/learnings.md (rewritten, 178 lines)
  - docs/nightly/loop-improvements/2026-08-13.md (new)
  - docs/nightly/reports/2026-08-13.md (appended Lane 7 block)
headline: 08-10/08-11/08-12 ran ZERO lanes — preflight hard-aborted at 01:01 (off-master + dirty tree,
  founder branches feat/polar-payments, feat/polar-legal-copy, improve/2026-08-11). 16-line logs, no
  Telegram alert. 3 of 7 nights totally lost. Separately, all 3 gating nights ended in docs-only salvage,
  but 08-08 (14 files) and 08-09 (19 files) were BOTH restored to master — net code loss from the gate: 0.
corrections_to_prior_learnings:
  - the 08-08/08-09 drops were NOT the 4 baseline-red test files; terminal cause is an undiagnosed
    fallback/typecheck-tier WEDGE (the in-place fallback has a working .bin and still failed all 3 nights)
  - do NOT claim "the loop shipped nothing" — the dropped code round-tripped via the restore path
  - 4 baseline-red files confirmed still tracked via `git ls-files`, but demoted from #1
next_steps:
  - ship improvement #2 first (3-line Telegram alert on preflight abort) — cheapest, recovers most loss
  - then #1 (worktree pinned to origin/master); prototype the gate inside the worktree first, since
    symlinked node_modules breaks turbopack and vitest config resolution here
  - next lane 7 run: build scripts/nightly/tools/loop-health.sh BEFORE investigating anything
