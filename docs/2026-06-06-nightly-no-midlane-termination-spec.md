# Nightly: end every lane (and the gate) only when actually done — spec

> Goal (founder): *"fix all of the issues and the timeouts and hard caps so it will
> end every lane only when it is actually done with it and not in the middle."*

## Ground truth — why the 2026-06-06 run shipped ZERO code (10 lanes ran)

Forensics on `run-20260606-010004.log` + the 6 stream sidecars + the 17 dropped
files in `salvaged-code-20260606-010004`:

1. **The GATE killed the night, not the lanes.** The integration gate runs the
   **entire** vitest suite (`test:backend` + `test:frontend`) **plus a full
   `next build`** on the whole authored set. On a 34-file change it ran **30 min →
   SIGKILL at 1800s — twice** (06:25 full chain, 07:06 lint-skip re-gate). It never
   completed either time.
2. **A timeout is treated as a content failure.** `gate-isolated.sh:164`
   `[ "$rc" != "0" ] && rc=1` collapses rc=124 (UNKNOWN — killed mid-test) into
   rc=1 (the lane broke lint/test/build). The two are indistinguishable downstream.
3. **A timeout-killed gate emits no parseable failure summary.** vitest never prints
   its per-file FAIL list when SIGKILLed mid-run → `nightly_parse_gate_failures` and
   `nightly_parse_test_failures` return empty → `_bad` is empty → every salvage branch
   falls through to **docs-only drop-ALL-code** (`run.sh:640 → 675`). The sophisticated
   peel/baseline machinery never gets a file list to act on.
4. **Lanes were WORKING when cut, not spinning.** All 6 timed-out lanes
   (01,02,03,05,06,08) had **zero** time-guard denials and were landing real edits to
   the last second. Of the 17 dropped files, **most were complete** (Word Alchemy,
   Guides, DistrictUpsell); the one genuine partial was
   `juego-de-palabras-multijugador/page.tsx`, orphaned from its 9 sibling components.

So "ends in the middle" has **two** subjects: the **gate** (cut mid-test-run — the
actual catastrophe) and the **lanes** (cut mid-multi-file-change — secondary). The
catastrophic data-loss is 100% the gate path.

## Design principle (per advisor)

"End only when done" cannot mean "delete the caps" — the code documents a 67-min
perl-alarm hang and an MCP-hang epidemic; an unbounded run is a worse failure. The
honest version: **bound only true hangs; land on a clean boundary; never throw away
completed, verified work.** A timeout is *inconclusive*, not *failing*.

## Changes

### Phase 1 — Gate timeout is recoverable, never drop-all (the keystone)

**`lib/gate-isolated.sh`**

- `run_isolated_gate` returns a **distinct rc=3 on timeout** (gtimeout 124), kept
  separate from rc=1 (real lint/test/build failure) and rc=2 (worktree setup failure).
- Apply the same `gtimeout` wrapper to the `NIGHTLY_GATE_CMD` test-seam branch (today
  only the real npm branch is bounded) so the timeout path is unit-testable and the
  seam mirrors production.

**`run.sh`** gate-result `case` (currently 0/1/2 only — add 3):

- **rc=3 (inconclusive / timed out):** do NOT drop code. Run a **build-only re-gate**
  (`run_isolated_gate <authored> 0 0 1` — lint+test skipped, runs only
  `build:schemas && build:fast`, which is minutes not tens-of-minutes and already
  tested). This is the *fast verdict* the night never got:
  - **build-only PASSES** → the authored set is build-clean; the timeout was the slow
    full test suite, not broken code. **Ship it** with a loud `BUILD-VERIFIED /
    TESTS-INCONCLUSIVE` alert + `docs/nightly/TESTS-INCONCLUSIVE-<date>.md`. Work is
    preserved — the goal.
  - **build-only FAILS** → the genuine breakage (e.g. the orphaned page's missing
    import — a build error, caught fast) now produces **complete** output. Set
    `iso_rc=1` and fall into the **existing** drop-and-re-gate peel loop, which will
    name + peel just the broken file(s) and ship the rest.
  - **build-only itself times out (rc=3)** → truly unverifiable → existing docs-only
    salvage (now rare, genuine last resort).
- Routing rc=3 to build-only FIRST also kills the wasteful second full-gate run: the
  old code re-ran the entire lint-skipped chain after a timeout (another 30 min that
  also timed out), because test+build — not lint — is the slow part.

### Phase 2 — Gate completes within budget far more often (reduce timeouts at the source)

**`lib/gate-isolated.sh`** `_gate_npm_chain`:

- **Reorder** the full chain so the build runs **before** the full test suite:
  `lint && build:schemas && build:fast && test`. Today test runs before build, so a
  test-suite overrun means the build verdict (which catches the real lane breakage —
  type/import errors like the orphaned page) is never reached. Build-first means even
  a test-phase overrun leaves a definitive build verdict; combined with Phase 1's rc=3
  → build-only path, a slow-test night still ships verified code.
- Raise the default `NIGHTLY_GATE_TIMEOUT` 1800 → **2700** (45 min) so a normal full
  run completes; the rc=3 path is the safety net for genuine overruns, not the
  common case.

### Phase 3 — Let working lanes finish (budget bumps ONLY)

Forensics: all 6 timed-out lanes were *working, not spinning*, at the kill. Working
lanes need **more runway**, not an earlier cutoff. So Phase 3 is deliberately small:

**`lib/lanes/0X-*.sh`** — bump ONLY the lanes that were mid-*code-implementation* at
the kill (landing real edits, ran out of clock): **05-landing 1200→1500, 06-seo
900→1200, 08-adsense 900→1200**. Deliberately NOT bumping 01-triage / 02-perf /
03-engagement: the forensic shows those were *querying / writing artifacts* at the kill
(research-spend the 60% research-window already bounds) — more budget feeds re-discovery,
not a finished fix, and the gate now ships their build-clean partials anyway. Per-lane
SIGTERM stays the hard backstop for true hangs (the 67-min perl-alarm regression).

**Explicitly NOT doing** (advisor — these fight the goal / are unvalidated):
- ~~move finalize 80%→75%~~ — cuts working lanes off *sooner* = more mid-feature kills.
- ~~deny-all-mutating-at-HARD~~ — no evidence `claude -p` reverts-and-exits under heavy
  denial (every observed lane was *working*, never denied); with kill-after=10s a
  "revert then END" instruction can't reliably complete before SIGKILL. Phase 1's peel
  already drops a broken partial, making this redundant. Revisit only after observing
  a denied lane's real behavior.

### Measurement (RESOLVED 2026-06-06)

Measured on this machine (`npm run test` and `npm run build:fast`, run concurrently so
contended — real sequential numbers are lower):

- **Full test suite: 23,941 tests / 2,469 files — ALL GREEN** (master is NOT
  baseline-red). vitest self-reported **783s (13 min)** internal duration; the cost is
  dominated by `environment 2571s` + `setup 1987s` (cold happy-dom per-file startup
  across 2,473 files), not assertions (`tests 1213s`). Little safe headroom to cut.
- **next build: ~7 min** of CPU (846s wall was contention-inflated).
- Gate runs `lint → build:schemas → build:fast → test` **sequentially**:
  ≈ 2 + 0.1 + ~9 + ~13 = **~24–38 min** (cold-cache dependent). The old **1800s** budget
  was *under* this — the direct cause of the mid-test SIGKILL on 2026-06-06.

**Decisions locked:**
- `NIGHTLY_GATE_TIMEOUT` default **1800 → 2700 (45 min)**: a normal night completes;
  only cold/slow nights overflow.
- rc=3→build-only→**ship to master** with a loud `TESTS-INCONCLUSIVE` alert: rc=3 is a
  *rare* safety net (not the default), and shipping build-verified, no-new-failure work
  to master matches the existing baseline-red precedent. A branch/PR detour is
  unnecessary at this frequency.
- Test-scoping (`vitest related`) stays out of scope — the suite completes within budget;
  the `environment`/`setup` cold-start cost (not assertions) is the slow part and would
  need a vitest-pool change, tracked separately if rc=3 turns out frequent in practice.

## Out of scope (explicitly)

- Scoping the test run to `vitest related <authored>` — correctness risk (a regression
  caught only by a non-importing test) and unnecessary once Phase 1 makes a slow-test
  night graceful. Revisit only if the gate still times out after Phases 1–2.
- Per-lane incremental commits — lanes don't commit; run.sh owns the single commit.

## Tests (TDD — extend existing harnesses)

- `test/gate-isolated.test.sh`: rc=3 on timeout (seam + `NIGHTLY_GATE_TIMEOUT=1`,
  `NIGHTLY_GATE_CMD='sleep 3'`); rc=1 still on real fail; rc=0 still on pass; chain
  reorder asserts `build:fast` precedes `npm run test`; build-only chain unchanged.
- `test/lane-time-guard.test.sh`: past HARD, a non-finalization Bash is denied while
  `git checkout -- x`/`eslint` are allowed; a docs/artifact write still allowed.
- New `test/gate-timeout-salvage.test.sh` (or extend gate-isolated): assert the run.sh
  decision routes rc=3 → build-only, and a build-only PASS ships while a build-only
  FAIL routes to peel. (Decision extracted to a pure helper so it is unit-testable.)

## Acceptance

- A gate timeout never drops all code: it either ships build-verified work
  (tests-inconclusive alert) or peels the named build-breaker and ships the rest.
- `gate-isolated.test.sh` + `lane-time-guard.test.sh` green; new salvage test green.
- The 2026-06-06 scenario replayed (slow full test, build-clean authored set) ships the
  code instead of docs-only.
