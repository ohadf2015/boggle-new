status: shipped
attempted: rewrite docs/nightly/learnings.md from last 7 nights + write docs/nightly/loop-improvements/2026-10-12.md

files_touched:
- docs/nightly/learnings.md (rewritten, 196 lines)
- docs/nightly/loop-improvements/2026-10-12.md (new, 7 ranked improvements)
- docs/nightly/reports/2026-10-12.md (appended Lane 7 section)
- scripts/nightly/lib/preflight.sh (improvement #1 — shipped, not just proposed)
- scripts/nightly/test/preflight.test.sh (7-assert regression guard for #1)

headline_finding: >
  The 2026-10-11 run produced NOTHING and left no report. Cause: the clean-tree
  preflight path still runs `git pull --ff-only` and still hard-ABORTS when the
  diverged local-only commits touch non-docs paths (preflight.sh:240-250). The
  previous learnings rewrite incorrectly declared this closed — the 10-06 fix only
  covered the DIRTY-tree path. The abort was dead code: the isolated-ship branch 20
  lines below already handles the identical case (the founder's unpushed code).

shipped_fix: >
  preflight.sh — on ff-only failure with non-docs local commits, log and fall
  through instead of `return 1`. Local is left untouched; the existing
  `origin/master..HEAD` check then sets NIGHTLY_ISOLATED_SHIP=1 + NIGHTLY_FOUNDER_BASE,
  so git-ship cherry-picks only the nightly's own commit onto a fresh origin/master.
  Net -12/+19 lines, no new state, single source of truth for the isolated-ship signal.
  Verified: `bash -n` clean; test suite RED on the old code (PASS=54 FAIL=4) and
  GREEN on the new (PASS=58 FAIL=0). Outside fe-next, so gate-neutral.

window_summary: >
  7 scheduled nights, lanes ran on 5, **code shipped on 2**. 76 authored files produced TWO code commits.
  10-06 shipped; 10-10 shipped after a gate repair (88f710507); **10-08 PASSED the gate and still shipped 0
  of its 15 files** (`nothing to commit after excluding generated artifacts` — `c547ba1df` is a residual
  *docs* ship that this file's predecessor misreported as a code ship for a week); 10-09 authored 23 and
  shipped 0; 10-07 died on the spend cap; 10-11 never started.

second_finding: >
  Two items the predecessor listed as "missing" already exist. `nightly_bisect_offenders`
  (lib/gate-isolated.sh:373 ← run.sh:1143, with a test) IS a per-file bisect — it logged 3 lines on 10-10
  (shipped) vs 1 on 10-09 (dropped 23), so the work is debugging one invocation, not building the feature.
  Rule added to learnings: grep for the helper before proposing to write it.

next_steps:
- Make a gate PASS that commits 0 of N>0 authored code files an ERROR with the excluded-path list, never `treating as no-change`. Ranked #2, S-effort, recovers a second lost night per window.
- Debug the EXISTING `nightly_bisect_offenders` (its `quick` typecheck oracle likely goes inconclusive under a `next build` TS wedge) — do not rewrite it. Ranked #3.
- Progress check on the gate repair loop — abort when attempt N's failing set is no smaller than N-1's. 10-09 burned 4h09m across 3 tiers while the error only moved. Ranked #4.
- Write `docs/nightly/artifacts/run-aborted-<date>.md` on every early exit (spend cap, preflight, circuit breaker). Both 10-07 and 10-11 are invisible outside the raw log. Carried unfixed for 2 windows.
- `merge=union` in `.gitattributes` for impact-ledger.ndjson / mode-readiness.md / perf-baseline.json — unstrands the same 3 `refs/nightly-pending/` refs warned on every run for ~70 nights.
- Lane 11: stop re-auditing the blast reconnect-mid-wave MAJOR. 3 nights spent confirming a 6-file + gating-condition + TDD-test fix that cannot fit a 15-min lane. Move to the human queue.
- Lane 02: `$host`-filter PostHog web-vitals in the collector, not the lane — 5 consecutive nights lost ~10 min each disproving cross-tenant imposketch.io LCP rows.
