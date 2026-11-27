status: shipped
attempted: rewrite docs/nightly/learnings.md from the last 7 nights' own logs + write docs/nightly/loop-improvements/2026-11-27.md
files_touched:
  - docs/nightly/learnings.md (rewritten, 199 lines)
  - docs/nightly/loop-improvements/2026-11-27.md (new, 110 lines)
  - docs/nightly/reports/2026-11-27.md (STEP-6 append)
headline_finding: |
  ROOT CAUSE of ~56 nights of zero shipped code, measured in the MAIN repo tonight:
    ls fe-next/node_modules       | wc -l -> 996   (packages installed)
    ls fe-next/node_modules/@types| wc -l ->  69
    ls fe-next/node_modules/.bin  | wc -l ->   0   <- ZERO. eslint/tsc/vitest/next/jest all MISSING.
  The isolated gate CoW-clones node_modules (gate-isolated.sh:520), so the clone inherits an empty
  .bin. _gate_ensure_bin (:109) detects it correctly every unit and runs `npm rebuild`, which FAILS
  every time ("'npm rebuild' self-heal failed" on all 13 gate units of 11-26). lint/tsc/test then run
  with no tool binaries -> TS2688 x276/1932/1035/840 (11-23..-26) or TS2307 'zod' + MODULE_NOT_FOUND
  'detect-libc' (11-22). Same cause, different spelling, 5 of 6 gated nights. Gate then drop-alls
  clean lane code. Last window diagnosed this as a classifier bug; it is a provisioning bug.
secondary_findings:
  - master is now 148 behind origin/master (was 134); fetches 01:00 nightly, never merges; ahead=0
  - docs/nightly/feedback/2026-11-20.ndjson is the NEWEST, not 11-06: founder text "Fix them" /
    "And polish it more" sat unread 7 nights (feedback/ is gitignored, .gitignore:81)
  - gate-isolated.sh:51 SETUP grep still matches only 'command not found' - confirmed unpatched
  - scripts/ still dropped as code (no keep entry in run.sh); .gitattributes still absent; 10
    stranded refs/nightly-pending; 56 untracked docs/nightly/artifacts files
next_steps: |
  HUMAN, one command, unblocks everything: cd fe-next && npm ci --prefer-offline
    then verify: ls node_modules/.bin | wc -l   (MUST be >100)
  Then land improvement #3 (keep scripts/nightly as docs in run.sh:~1116) so the loop can ship
  improvements #1/#2/#4/#5 itself. Patches for all of them are in learnings.md Headlines 0-3.
  Tomorrow's lane 7: re-measure .bin count FIRST (avoid-#8 - do not inherit this diagnosis).
