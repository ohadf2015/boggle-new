status: shipped
attempted: rewrite learnings.md + write loop-improvements/2026-06-09.md from last 7 nightly reports + 37 feedback records + run logs
files_touched:
  - docs/nightly/learnings.md (rewritten, 96 lines)
  - docs/nightly/loop-improvements/2026-06-09.md (new)
  - docs/nightly/reports/2026-06-09.md (lane-7 block appended)
summary: |
  Feedback last 7d (37 records): polish:try x15, idea:build x7 (78% build), night:good x2 / night:meh x2 (below >=3 critique threshold), NEW test:works x2, reddit:* = 0.
  Run health: 04 & 07 = 7/7; 02 & 05 slowest + over-scope timeouts; 06-06 had 6-lane exit-124 (rg EACCES + MCP stall) caught by artifact floor.
  Loop wins SHIPPED this week: usage-limit cascade fix (5cb7f28a0), force-dynamic->revalidate LCP fix, dead_pages.py noindex feed.
next_steps:
  - Lane 02: ship the authored-but-stuck AutoHideHeader CLS 0.29 fix (3 nights unshipped) as a named first-task.
  - Lane 05: hard-cap to ONE polish target + 5 files to stop over-scope timeouts.
  - Build scripts/nightly/tools/lane_stats.sh (flagged, not created tonight — needs log-format verification pass).
  - Re-measure /es + /en multiplayer LCP/INP after 06-09 quickplay overlay changed PageClient hydration height.
