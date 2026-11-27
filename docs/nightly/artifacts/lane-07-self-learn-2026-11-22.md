status: shipped
attempted: Rewrite docs/nightly/learnings.md from the last 7 nights' evidence (re-deriving the error histogram from EACH night's own gated log rather than inheriting last night's root cause) and write docs/nightly/loop-improvements/2026-11-22.md.

files_touched:
  - docs/nightly/learnings.md (rewritten, 200 lines — at cap; all three DO-NOT-EDIT sections preserved verbatim)
  - docs/nightly/loop-improvements/2026-11-22.md (new, 110 lines)
  - docs/nightly/reports/2026-11-22.md (STEP-6 append — NOTE: this dir is gitignored, .gitignore:82, so the append will not reach master)

## Key findings (all re-derived tonight, none inherited)

1. ROOT CAUSE IS ONE THING WITH THREE FACES, and the gate recognises only one.
   The CoW `node_modules` clone (gate-isolated.sh:520-525, `cp -Rc`/`cp -R`) is not a working install:
     - 11-15/-16 -> `error TS2688: Cannot find type definition file` (1449 / 1656 lines, 100% of all errors)
     - 11-17     -> `.bin` symlinks missing; `npm rebuild` self-heal FAILED; 5 peel units, all FAIL
     - 11-19     -> `Cannot find module '@eslint-community/eslint-utils'` from inside node_modules/eslint
   Last night's file called TS2688 "the cause of all zero-code days". It reads ZERO on 11-17 and 11-19.
   The toolchain-error predicate at gate-isolated.sh:51 (verified tonight) greps only
   `command not found|not found$`, which none of these print -> every one falls through to
   "lane code broke lint/test/build" -> drop-all. On 11-17 the gate LOGGED that it would treat this as a
   SETUP failure and then failed the lane on the very next line.
   Fix is 3 lines, emitted as a patch in learnings.md Headline 0 (scripts/ is dropped as code, so it
   cannot be edited from a lane).

2. NEW: four of the last seven nights produced NO COMMIT AT ALL (11-16, -19, -20, -21), not just no code.
   11-20: the whole run died inside lane 2 (11-mode-qa) — no integration step, lane 01's 7 kept files lost,
   artifact floor lost. 11-21: MONTHLY SPEND CAP (rc=76) 15 min in, circuit breaker, 0 files authored.

3. NEW AND MISLEADING: the 11-21 run authored 0 files and printed `residual ship OK (6f09959c5)`.
   That sha is the founder's `fix(auth): paint the sheet Google button` (#2029) — not a nightly commit.
   A run that shipped nothing reported success with a foreign sha.

4. Confirmed still open: `scripts/` not in the ship keep-set (rg -c 'scripts/nightly' run.sh -> 6, all
   LIB_DIR/_restore_cmd strings); no .gitattributes; 10 stranded refs/nightly-pending/; 83 salvage stamps;
   docs/nightly/reports/ gitignored at .gitignore:82.

5. Lanes are NOT the problem and have not been for 31 nights. Tonight lanes 1-5 ran clean in 49 min
   (01:21->02:10) keeping 5/3/2/3/4 files, zero exit-124, zero idle-kills. Master merged 150 commits in
   7 days from interactive sessions. The repo is healthy; only the loop fails.

next_steps:
  - APPLY THE 3-LINE PATCH to scripts/nightly/lib/gate-isolated.sh:51 (learnings.md Headline 0). Highest
    value change available; a lane cannot do it because scripts/ is reverted as lane code.
  - Add `scripts/nightly` to the ship keep-set in run.sh (~:1179) so the loop can repair itself.
  - Trap-commit docs/nightly/artifacts/ on ANY exit, so a mid-lane death (11-20) or spend cap (11-21)
    still leaves the floor.
  - Assert the shipped sha: git rev-parse it, require `chore(nightly)` in its subject, print
    `lane=<name> kept=<n> code=<n> sha=<sha>`, tg_alert when 0 files authored yet a ship is reported.
  - Investigate why lane 11 (mode-qa) killed the 11-20 run before scheduling it again.
  - Founder decision needed on the monthly spend cap — it blocked an entire night.
