# Lane 07 — Self-learn — 2026-09-10

status: shipped
attempted: rewrite docs/nightly/learnings.md from last 7 nights + write loop-improvements/2026-09-10.md

files_touched:
- docs/nightly/learnings.md (rewritten, 182 lines)
- docs/nightly/loop-improvements/2026-09-10.md (new, 123 lines)
- docs/nightly/reports/2026-09-10.md (appended Lane 7 section)
- docs/nightly/artifacts/lane-07-self-learn-2026-09-10.md (this file)

## Findings

1. **The gate is FIXED — close last week's #1.** The `_gate_ensure_bin` / `command not found` chain no
   longer appears on 09-09 or 09-10. 09-09 shipped `dcb36a657` with 2 real `fe-next/` files, type-checked,
   affected tests green. It DOES still match on 09-06, so the loss streak was 5 nights and the fix landed
   09-09 — closed on 2 clean nights. Do NOT "fix" `gate-isolated.sh:84-96`.

2. **New #1: one lane per night STALLS ~7.9h, then exits rc 75 and is reverted.** Three launched nights,
   three different lanes: 09-06 lane 2 `11-mode-qa` 01:35->09:25 (7h50m) · 09-09 lane 4 `05-landing`
   01:54->09:48 (7h54m) · 09-10 lane 3 `02-perf` 01:33->09:14 (7h41m). Positional, not lane-specific.
   **rc 75 is the EXIT, not the cause** — corrected after an advisor challenge. The 09-10 log holds exactly
   ONE backoff line: `wait 120s would resume past 06:30; aborting (rc=75)` = the deadline guard firing
   instantly on an already-dead lane. A 7.9h `sleeping 120s` loop would leave ~230 lines.
   Mechanism UNPROVEN: lane 3 logged one tool call (an `Explore` subagent) across the whole span, matching
   `machine sleep kills subagents silently`; `caffeinate -i` (run.sh:34) is idle-only, not lid-close-proof.
   FIX = per-lane WALL-CLOCK CAP (works under either mechanism). There is no in-lane usage-wait loop to cap
   (`rg "exit 75|EX_TEMPFAIL" scripts/nightly/run.sh` -> no match; run.sh only classifies at :445/:512).

3. **The usage window may also be depleted at launch** — 09-10 lanes 1+2 burned only 18 min before lane 3
   died. Unmeasured today, so it cannot be separated from finding 2. Needs a preflight probe.

4. **Two carried defects were already fixed and were being re-reported as open**: duplicated run-log lines
   (gone, verified on the 09-10 log) and the silent stranded-ref retry (now WARNs). A third item was
   misfiled entirely: the scheduler's zero-signal lane rotation is by design (`run.sh:421`), not a bug.

## next_steps

- Assign loop-improvement #1: per-lane wall-clock cap (~25-30 min) in run.sh's lane-dispatch block.
  Highest-value change available — recovers ~1 lane/night + ~7.9h wall clock under either mechanism.
- Settle finding 2's mechanism: log a preflight usage-window probe + timestamp every backoff event.
- Ship `scripts/nightly/tools/run-health.sh` (proposed, not built tonight): parses run logs into the
  lane x (launched, duration, files-kept, rc) table. Lane 7 hand-rebuilds it every week via ~6 rg calls.
- Add a "verify carried items before re-carrying" step to `scripts/nightly/prompts/07-self-learn.md`.
  This lane led with a week-stale headline because the previous run copied carried items without checking.
- Denominator honesty: only 3 of 7 nights launched lanes. Any /7 rate in a future report is wrong.
