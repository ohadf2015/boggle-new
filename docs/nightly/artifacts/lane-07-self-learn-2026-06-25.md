status: shipped
attempted: Rewrite learnings.md from last 7 reports + write loop-improvements/2026-06-25.md meta-review.
files_touched:
  - docs/nightly/learnings.md (rewritten, 102 lines, under 200 cap)
  - docs/nightly/loop-improvements/2026-06-25.md (new meta-review)
  - docs/nightly/reports/2026-06-25.md (appended Lane 7 block)
key_findings:
  - Core 6 lanes (02,05,07,08,09,10) shipped 100%, 0 reverts in window.
  - GATE-RUNNER is now #1 failure source, not lane code — 3/6 nights failed for runner reasons (06-22+06-24 full-Vitest 900s idle wedge / exit 124; 06-23 baseline-red tests poisoned suite).
  - Both lane reverts (01,06) were the same 06-22 exit-75 usage cascade (infra).
  - Feedback flat-positive — polish:try 8/pass 1, modeqa:ontrack x2, zero dissatisfaction.
top_loop_fix: Scope gate tests to changed files (vitest related) + hard per-suite kill — kills both the idle-wedge and baseline-red poison.
next_steps:
  - Build scripts/nightly/tools/changed-test-scope.sh (spec in loop-improvements; needs a code lane with budget).
  - Lane 01 triage the 3 baseline-red suites (DrillWordLimits, PracticeWheelSandbox, WordTowerCrane).
  - Add lane-start stagger + concurrency cap to run.sh vs shared Claude quota.
