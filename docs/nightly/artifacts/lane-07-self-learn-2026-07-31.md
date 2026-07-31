status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 98 lines)
  - docs/nightly/loop-improvements/2026-07-31.md (new, 64 lines)
  - docs/nightly/reports/2026-07-31.md (Lane 7 block appended)
summary: |
  Rewrote learnings from 7 nights of run-log timings (measured, not report-quoted).
  Two corrections to last night's conclusions:
  1. Gate false-drops were NOT 0 this window. 07-30 dropped 8 code files after a
     2h22m re-gate loop. Root cause found in the log: every offender the parser
     named was non-authored, so the peel loop ignored them, re-gated without lint,
     still hit rc=1, and classified that as "unattributable" -> docs-only salvage.
     The residual rc=1 was the 4 known baseline-red test files. Those files are now
     a proven code-DROP cause, not a tax -> promoted to #1 open watch.
  2. Pre-lane stall is intermittent (07-25 5h03m, 07-29 4h23m) not chronic — the
     other 5 nights reached lane 1 in 14s..52m. MCP probe measures ~100s/attempt
     normally (07-26/30/31); only 07-29 degraded to ~1h51m under load. Last night's
     learnings generalized one pathological night into a rule.
next_steps:
  - Assign the 4 baseline-red test files to a lane (STEP 0 override) — highest ROI.
  - Add the gate "all offenders non-authored -> SHIP" terminal state in scripts/nightly/lib/gate.sh.
  - Lane 11 needs an escalate-on-repeat prompt rule: 6 consecutive identical verdicts,
    blocked only on a visual-QA screenshot no lane owns.
  - Ship browser-consent-seed.sh + lane-report-guard.sh (proposed, deliberately not
    created this run — finalize cutoff was near and a half-written script poisons the gate).
