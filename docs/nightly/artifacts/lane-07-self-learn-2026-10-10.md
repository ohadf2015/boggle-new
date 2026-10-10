# Lane 07 — self-learn (2026-10-10)

status: shipped
attempted: rewrite docs/nightly/learnings.md from the 2026-10-05..10-10 reports + run logs, and write the loop self-review

files_touched:
- docs/nightly/learnings.md (rewritten, 194 lines)
- docs/nightly/loop-improvements/2026-10-10.md (new, 112 lines)
- docs/nightly/reports/2026-10-10.md (appended Lane 7 section)
- docs/nightly/artifacts/lane-07-self-learn-2026-10-10.md (this file)

headline findings:
- Lanes reached the lane phase on 5 of 6 nights (was 2 of 9 last window). The dirty-tree
  isolated-ship path fixed last week's #2 (diverged-master preflight ABORT) and, by skipping
  ff-pull, removed #3 (the 7h34m untimed `git pull`). Both CLOSED.
- NEW #1: the isolated gate is all-or-nothing on the authored set. On 10-09 ONE type error
  (`oneMoreCrown` TS2353/TS2741 in fe-next/components/word-craft/gems/GemHuntPageClient.tsx)
  failed the gate 7 times over 3h07m and dropped all 23 authored files from 8 lanes.
- The dropped 10-09 code is RECOVERABLE: ~/logs/lexi-nightly/salvaged-code-20261009-010003,
  restore via scripts/nightly/restore-salvaged-code.sh 20261009-010003.
- `supabase` MCP fails its npx boot probe 5 of 6 nights; run-intel serves stale collectors nightly.
- Telegram callbacks: still zero; feedback ndjson stops 2026-07-26 (76 days). Outbound cards work.

next_steps:
1. Restore + fix the 10-09 salvage (one missing `oneMoreCrown` key in two sites), re-gate, ship.
2. Implement per-file gate bisect in scripts/nightly/run.sh (~L1000) + the proposed
   scripts/nightly/tools/gate-bisect.sh helper. NOT written tonight — needs the run.sh wiring
   in the same change, which exceeds this lane's budget.
3. Cap the gate repair loop at 2 attempts / no-progress detection.
4. Pre-lane abort (rc=76) must write docs/nightly/artifacts/run-aborted-<date>.md — carried unfixed.
