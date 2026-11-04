status: shipped
files_touched:
  - fe-next/lib/education/telemetry.ts (new trackJoinCodeStepRefused + student_join_code_refused event)
  - fe-next/components/education/join/useJoinFlow.ts (wired at both advance() refusal branches)
  - fe-next/lib/education/__tests__/telemetry.test.ts (4 new TDD tests, green)
  - docs/nightly/reports/2026-11-04.md (Lane 2 section appended)
  - docs/nightly/impact-ledger.ndjson (1 entry appended)
next_steps: |
  No flag cleanup or new experiment shipped this run — brief's top items were rage-click
  signals (/en/join, /en/multiplayer), not decided-flag data, and the join flow's own code
  looked already well-handled on read (reserved confirm-slot height, disabled-only-while-
  submitting GO button, inline refusals). Closed the actual instrumentation gap instead:
  step-1 code refusals (too-short / known-invalid, hit via "Next" before any submit POST)
  had ZERO telemetry, which is exactly the kind of blind spot that produces an unexplained
  rage-click report. New event is `student_join_code_refused` {reason, code_length,
  code_charset}. Tomorrow: query it (see impact-ledger query_hint) — if reason=invalid
  dominates and clusters on a few attempts per session, that's the real rage-click driver
  and a good candidate for a typed experiment (e.g. inline "did you mean the code on the
  projector?" hint). /en/multiplayer rage clicks (score 0.53) untouched — next lane's pick.
