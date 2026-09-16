status: shipped
files_touched:
  - docs/nightly/learnings.md (rewritten, 199 lines)
  - docs/nightly/loop-improvements/2026-09-16.md (new, 116 lines)
  - docs/nightly/reports/2026-09-16.md (Lane 7 section appended)
summary: |
  Two headline changes vs last week, and one self-correction made BEFORE shipping.

  HEADLINE 1 (good news) — the ~7.9h per-lane stall is CLOSED. The per-lane wall-clock cap
  that lane 07 proposed in loop-improvements/2026-09-10.md actually SHIPPED and is visible
  in the 09-16 log: "time-guard armed -> idle-kill @ 1500s no-output, finalize @ +24m, hard
  backstop @ +30m, file-cap=8" plus "no MCP -> idle leash raised to 1500s". No hard rc-75
  stall since 09-10; 09-16 ran lanes 1-6 in 41 minutes. Caveat recorded honestly: the guard
  is confirmed live only in the 09-16 log, and 09-15 lane 6 still ran 2h49m, so soft stalls
  stay on the watch list.

  HEADLINE 2 (the new #1) — lane code FAILED typecheck and was CORRECTLY dropped on 4 of 6
  completed nights (09-10, 09-12, 09-14, 09-15), 26-39 authored files each.
  MY FIRST READING WAS WRONG AND IS CORRECTED IN BOTH SHIPPED FILES. I initially wrote that
  the gate was false-dropping innocent code, on the strength of 192 ECONNREFUSED errors to
  localhost:3000 in the gate output. A discriminating grep overturned that: on 09-10, 09-14
  AND 09-15 the log reads "gate-timeout: standalone typecheck tier FAILED (tsc/test:changed)
  — the authored set has a real type/test break", then "drop-and-re-gate: conclusive
  typecheck tier named an offender". The baseline-aware path at run.sh:851 fired correctly
  every time and on 09-10 explicitly refused to ship. The gate is doing its job.
  ROOT CAUSE IS UPSTREAM, IN THE LANE PROMPTS: they tell every lane that
  `npx eslint <changed files>` is a sufficient self-check, and eslint does not type-check.
  This is already in memory as gauntlet-gate-needs-tsc-2026-09-12.

  SEPARATE AND STILL REAL: the gate's failure output is ~90% environmental noise
  (ECONNREFUSED 127.0.0.1:3000 x96 + ::1:3000 x96 from integration tests needing a dev
  server the isolated gate never starts, plus "[vitest] No 'init' export is defined on the
  '@sentry/nextjs' mock" x18). That noise is why the gate needs 4-6 retries and a separate
  "conclusive typecheck tier" to name an offender at all, and why the gate phase now costs
  3-5h/night — longer than every lane combined.
  Also: rc=134 SIGABRT on the gate 6/6 nights, an OOM signature mislabelled as "wedged".
next_steps: |
  1. (S, HIGHEST IMPACT) Replace `npx eslint <changed files>` with `npx tsc --noEmit` in the
     shared lane-prompt self-check block in scripts/nightly/run.sh. Add: "if you touched any
     .ts/.tsx, cd fe-next && npx tsc --noEmit before declaring done; if red, fix it or
     git checkout -- the file." Targets the 4-of-6 code-drop rate directly.
  2. (S) Exclude dev-server-dependent tests from the isolated gate's vitest run — 192
     guaranteed-noise refused connections per night. scripts/nightly/run.sh ~:716 +
     fe-next/vitest.config.ts.
  3. (S) Fix the @sentry/nextjs vi.mock to export `init` — 18 errors/night from one export.
  4. (S) Grep for `heap out of memory` / `Abort trap` before printing "wedged" on rc=134/124,
     and run the gate with NODE_OPTIONS=--max-old-space-size=8192.
  5. (S) Cap gate retries at 2 then alert — reclaims 2-4h/night.
  6. (M) Score the lane scheduler on files-kept-per-run, not launch frequency: lane 10 keeps
     7 files/run but launches 2/7, while lane 09 keeps exactly 1 file/run and launches 6/6.
  7. (S) Rewrite the lane 09 monetization prompt — 1 file kept on 6 of 6 nights is a prompt
     ceiling, not a scope ceiling, and it is the lane tied to the revenue priority.
  8. Ship scripts/nightly/tools/gate-failure-triage.sh + lane-yield.sh — both pipelines were
     hand-typed this lane and recur every self-learn night.
verification: docs-only lane; no code files touched, so no lint/typecheck applies.
