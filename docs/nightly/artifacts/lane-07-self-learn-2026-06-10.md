status: shipped
attempted: rewrite learnings.md from last 6 reports + write loop-improvements/2026-06-10.md meta-review
files_touched:
  - docs/nightly/learnings.md (rewritten, 97 lines)
  - docs/nightly/loop-improvements/2026-06-10.md (new, 50 lines)
  - docs/nightly/reports/2026-06-10.md (appended Lane 7 section)
key_findings:
  - AutoHideHeader CLS 0.29 watch CLOSED (spacer-div shipped 06-10, 3rd carry-night)
  - NEW /es/multiplayer INP 244->614ms regression, suspected QuickPlaySeekingOverlay (lane-03 06-09) -> bisect next run
  - Gate clean-rate only 2/6; 4/6 salvage/docs-only (timeout/OOM/baseline-red)
  - lanes 05/09 file-cap silently drops ES locale 3/6 nights -> proposed locale-first ordering
  - feedback last 7d: polish:try x9, polish:pass x2 (word-vault clean, crossword MIXED), idea:build x4/pass x0, night:meh x1
next_steps:
  - measure exp-invite-arrival-clarity-v1 delta; build winning variant (83% invite drop)
  - ship practice_session_abandoned event (proposed 06-07, still unshipped)
  - consider safe_search.sh helper (rg + git grep fallback) for lane 01 EACCES
