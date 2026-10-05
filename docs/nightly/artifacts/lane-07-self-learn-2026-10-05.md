status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 200 lines)
  - docs/nightly/loop-improvements/2026-10-05.md (new)
  - docs/nightly/reports/2026-10-05.md (Lane 7 section appended)
findings:
  - Loop reached the lane phase on only 2 of the last 9 nights (10-01, 10-05).
  - 09-27..09-30 died at lane 1 in ~11s with `MONTHLY SPEND CAP hit (rc=76)`; circuit breaker correct, but zero artifacts shipped.
  - 10-02..10-04 died at `preflight: ABORT — diverged & local-only commits touch non-docs paths` — a repeat of the catalogued Class-4 "off-master preflight hard-abort (silent for days)" incident.
  - 10-05 hung 7h34m inside `preflight: fetching + ff-pulling master...` (01:16:51 -> 08:51:17, no timeout), pushing lanes into 09:00-11:00 daylight contention.
  - CLOSED: last week's #1 (gate drops all lane code). The new `baseline-poisoned gate` path shipped 2/2 nights; 10-01 landed 28 files as 50e281c39.
next_steps:
  - Act on improvement #1-#3 in loop-improvements/2026-10-05.md (all S-effort, all in scripts/nightly/run.sh): artifact+alert on pre-lane abort; route diverged master into the existing isolated-ship path; `timeout 300` on the preflight git pull.
  - Build scripts/nightly/tools/run-health.sh so lane 07 stops hand-rolling the same log-parsing rg pipeline every run.
  - Re-check whether gate rc=134 SIGABRT recurs; only 2 gate runs in this window, so last week's 6/6 is unrefuted, not fixed.
