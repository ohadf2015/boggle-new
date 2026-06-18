#!/bin/bash
# gate-isolated.sh — run the lint/test/build gate against ONLY the nightly's
# authored changes, in a throwaway git worktree. Sourced by run.sh.
#
# WHY: the in-place gate runs lint/test/build over the WHOLE working tree, so a
# founder's concurrent WIP (or a half-finished edit from another session) that
# doesn't lint/type-check fails the nightly's gate even when every lane's own
# code is clean. That is exactly what aborted the 2026-05-23 daytime run.
#
# THE SAFETY PROPERTY (proven by test/gate-isolated.test.sh):
#   The founder's working tree is NEVER read for gating and NEVER written. We
#   add a worktree at HEAD (clean committed master), copy ONLY the lane-authored
#   files into it, CoW-clone node_modules, and gate there. A bug in here can
#   therefore only produce a wrong pass/fail — it can NEVER lose founder WIP.
#   And it gates exactly `clean master + authored` = what actually gets committed.
#
# Requires: $PROJECT_DIR, $RUN_LOG, log(). $NIGHTLY_GATE_CMD overridable for tests.
# Returns: 0 gate passed · 1 gate failed · 2 setup failed (caller falls back).

# Build-time files git can't see (gitignored) that `next build` needs in the
# worktree. node_modules is handled separately (CoW clone).
NIGHTLY_GATE_ENV_FILES=(
  "fe-next/.env.local"
  "fe-next/.env"
  "fe-next/.env.production.local"
)

# _gate_npm_chain <skip_lint> → the bash -c body that runs the gate inside fe-next.
# skip_lint=1 OMITS `npm run lint`. Used by the baseline-poison salvage: when every
# gate-failing file is NON-authored (a pre-existing lint error on the untouched
# baseline), the authored files are already known lint-clean, so we re-gate them with
# lint skipped to PROVE they are test+build clean — without being blocked by a lint
# error the nightly didn't introduce. build:schemas runs FIRST: `npm run test` imports
# ../dist via the compiled bridge (backend/utils/socketValidation.ts), and a fresh
# worktree has no dist/ yet (this reverted every code lane on 2026-05-26).
_gate_npm_chain() {
  local skip_lint="${1:-0}" build_only="${2:-0}" typecheck_only="${3:-0}" typeonly_notest="${4:-0}" chain=""
  # typeonly_notest=1 → build:schemas + standalone `tsc --noEmit` ONLY (no test, no next-build,
  # no lint). The baseline-red SHIP path uses this to build-verify the authored set after the
  # tests are already PROVEN pre-existing-red (2026-06-18). It deliberately omits the test phase
  # — test:changed would re-pull the same red files into the cone and wrongly block the ship —
  # and next-build (build:fast), which wedges >900s in a fresh worktree (the wedge that, conflated
  # with a real build break, dropped a whole night of build-clean code). tsc gives the type/import
  # verdict wedge-proof in ~54s. build:schemas first (the dist bridge tsc resolves through).
  if [ "$typeonly_notest" = "1" ]; then
    printf '%s' "npm run build:schemas && npx --no-install tsc --noEmit"
    return 0
  fi
  # typecheck_only=1 → the CONCLUSIVE timeout tier: build:schemas + standalone
  # `tsc --noEmit` + test:changed. WHY this exists (2026-06-16): `next build`'s OWN
  # internal "Running TypeScript" phase wedges silently >900s in a fresh worktree —
  # 18x+ slower than a standalone `tsc --noEmit`, which type-checks the SAME project
  # in ~54s (measured: cold, CoW node_modules, no .tsbuildinfo). So when BOTH the full
  # gate and the build-only re-gate wedge in that phase, the old code dropped ALL the
  # night's code (the 06-12/13/16 docs-only salvages). This tier gives the verdict
  # those wedges never produced, FAST and unwedgeable:
  #   • tsc --noEmit  → the type/import verdict next-build's TS phase hangs on, in 54s.
  #   • test:changed  → vitest --changed (both projects); in the worktree the authored
  #     files are uncommitted-vs-HEAD, so this runs EXACTLY the lane-affected tests —
  #     lane-attributed, fast, and it streams progress so it can't trip the idle kill.
  # build:schemas first: the dist bridge (backend/utils/socketValidation.ts) that
  # test:changed's backend suites import has no dist/ in a fresh worktree.
  if [ "$typecheck_only" = "1" ]; then
    printf '%s' "npm run build:schemas && npx --no-install tsc --noEmit && npm run test:changed"
    return 0
  fi
  # build_only=1 → skip lint AND test, run ONLY build:schemas + build:fast. Used by
  # the baseline-aware ship path: when every failing test already fails on clean
  # master (red baseline), `test` short-circuited so the authored set's BUILD was
  # never verified — proving it builds clean before shipping keeps the old "never
  # ship build-breaking code" guarantee even when we deliberately ignore the tests.
  if [ "$build_only" = "1" ]; then
    printf '%s' "npm run build:schemas && { rm -rf .next-nightly 2>/dev/null; NEXT_BUILD_DIR=.next-nightly npm run build:fast; }"
    return 0
  fi
  [ "$skip_lint" = "1" ] || chain="npm run lint && "
  # ORDER: lint → build:schemas → build:fast → test. The BUILD runs BEFORE the
  # test phase so a build verdict (the real lane-breakage signal — type/import errors
  # like an orphaned page that imports missing siblings) is reached even if the test
  # phase overruns its budget. On 2026-06-06 `test` ran first and was SIGKILLed at
  # 1800s, so `next build` never ran and the gate learned nothing before dropping all
  # code. build:schemas still precedes everything (the dist-bridge the tests need).
  #
  # TEST SCOPE (2026-06-17): default to `test:changed` — vitest --changed runs only the
  # MODULE-GRAPH CONE of the authored files (the worktree has them uncommitted-vs-HEAD,
  # so --changed picks them up exactly). WHY: the full `npm run test` suite wedges on
  # pool-timeouts + 4 chronic-red suites (PracticeWheelSandbox, wordHandler.blast*,
  # blastTileGeneration, blastModeManager.thaw) that NO lane touches, hitting the 5400s
  # backstop → rc=124 → the night gets docs-only-salvaged and all code is dropped (the
  # 06-12/13/16/17 losses). The cone skips those unrelated suites while still testing
  # every importer of a changed file. The typecheck_only tier already proved this path
  # fast + correct. Escape hatch: NIGHTLY_GATE_FULL_TEST=1 restores the full suite.
  local test_cmd="npm run test:changed"
  [ "${NIGHTLY_GATE_FULL_TEST:-0}" = "1" ] && test_cmd="npm run test"
  printf '%s' "${chain}npm run build:schemas && { rm -rf .next-nightly 2>/dev/null; NEXT_BUILD_DIR=.next-nightly npm run build:fast; } && ${test_cmd}"
}

# nightly_baseline_ship_decision <authored_fail_file> <baseline_rc> <baseline_fail_file> <authored_allowlist_file>
# Pure decision for the baseline-aware salvage when the gate failed but no authored
# file was pinned as a lint/tsc offender. The three list files hold repo-relative
# failing TEST paths (from nightly_parse_test_failures). Prints ONE verdict:
#   ship          — baseline (clean HEAD) is red on test(s) AND the authored set adds
#                   no NEW failing test → not the nightly's fault; ship (caller does a
#                   build-only re-gate first, so build-breakage is still caught).
#   peel\n<files> — authored set introduced NEW failing test file(s) that ARE authored
#                   → drop just those and re-gate (same as a broken lane lint/tsc file).
#   fallthrough   — undecidable here (HEAD clean, or no comparable test baseline) →
#                   caller uses the existing lint-skip / docs-only salvage (no regression).
nightly_baseline_ship_decision() {
  local af="$1" brc="$2" bf="$3" allow="$4"
  # Baseline gate PASSED → clean HEAD is green → the failure is the lanes' own.
  [ "$brc" = "0" ] && { printf 'fallthrough\n'; return 0; }
  local authored_n baseline_n
  authored_n=$(grep -c . "$af" 2>/dev/null); authored_n=${authored_n:-0}
  baseline_n=$(grep -c . "$bf" 2>/dev/null); baseline_n=${baseline_n:-0}
  # No authored failing tests, or no comparable test-failure baseline (baseline failed
  # at lint/build, not test) → can't conclude "pre-existing" → conservative fallthrough.
  [ "$authored_n" -gt 0 ] || { printf 'fallthrough\n'; return 0; }
  [ "$baseline_n" -gt 0 ] || { printf 'fallthrough\n'; return 0; }
  # NEW failing tests introduced by the authored set = authored − baseline.
  local newf new_n
  newf=$(grep -vxF -f "$bf" "$af" 2>/dev/null || true)
  new_n=$(printf '%s' "$newf" | grep -c . 2>/dev/null); new_n=${new_n:-0}
  if [ "$new_n" -eq 0 ]; then printf 'ship\n'; return 0; fi
  # Some new failures — peel the ones WE authored (never touch non-authored paths).
  local newauth
  newauth=$(printf '%s\n' "$newf" | grep -xF -f "$allow" 2>/dev/null || true)
  if [ -n "$newauth" ]; then printf 'peel\n%s\n' "$newauth"; return 0; fi
  printf 'fallthrough\n'; return 0
}

# nightly_gate_timeout_route <build_only_rc> → ship | peel | docs-only
# Pure decision for an INCONCLUSIVE (timed-out, rc=3) gate AFTER a fast build-only
# re-gate. A timeout means the slow full vitest suite didn't finish; the build-only
# re-gate (build:schemas + build:fast, no lint/test) gives the verdict the timed-out
# gate never produced:
#   build-only rc=0 → ship       (authored set compiles + type-checks + builds; tests
#                                 unverified this run → ship with a loud alert)
#   build-only rc=1 → peel       (a REAL build break; output now names the offender →
#                                 hand to the existing drop-and-re-gate peel loop)
#   build-only rc=3 → docs-only  (build-only ALSO timed out → unverifiable in budget →
#                                 conservative docs-only salvage, now rare)
# Pulled out of run.sh so the routing is locked by a unit test, not just live orchestration.
nightly_gate_timeout_route() {
  case "${1:-}" in
    0) printf 'ship\n' ;;
    1) printf 'peel\n' ;;
    *) printf 'docs-only\n' ;;
  esac
}

# nightly_gate_typecheck_route <typecheck_rc> → ship | peel | docs-only
# Pure decision for the CONCLUSIVE typecheck tier (build:schemas + tsc --noEmit +
# test:changed) that runs ONLY when BOTH the full gate and the build-only re-gate
# wedged (rc=3 twice) — i.e. next-build's silent TS phase hung but a standalone
# tsc + lane-scoped tests can still give a verdict in ~1 min:
#   tc rc=0 → ship       (authored set type-checks + its affected tests pass; the
#                         full next-build/full-suite stayed unverified → loud alert)
#   tc rc=1 → peel       (a REAL type error or a lane-broken test; output now names
#                         the offender → hand to the drop-and-re-gate peel loop)
#   tc rc=3 → docs-only  (even the 54s tsc tier wedged — should never happen; keep
#                         the conservative last resort)
# Same shape as nightly_gate_timeout_route; pulled out so the routing is unit-locked.
nightly_gate_typecheck_route() {
  case "${1:-}" in
    0) printf 'ship\n' ;;
    1) printf 'peel\n' ;;
    *) printf 'docs-only\n' ;;
  esac
}

# run_isolated_gate <authored_list_file> [skip_lint=0] [baseline=0]
# baseline=1 gates a CLEAN HEAD checkout with NO authored files applied (the
# authored list is ignored / may be empty) — used by run_baseline_gate to learn
# whether master ITSELF is red independent of any lane code.
run_isolated_gate() {
  local authored="$1" skip_lint="${2:-0}" baseline="${3:-0}" build_only="${4:-0}" typecheck_only="${5:-0}" typeonly_notest="${6:-0}"
  if [ "$baseline" != "1" ]; then
    [ -n "$authored" ] && [ -s "$authored" ] || { log "isolated-gate: empty authored list — nothing to gate"; return 0; }
  fi

  local wt; wt=$(mktemp -d -t nightly-gate.XXXXXX)
  rm -rf "$wt"   # 'git worktree add' wants a non-existent path
  if ! git -C "$PROJECT_DIR" worktree add --detach --quiet "$wt" HEAD 2>>"$RUN_LOG"; then
    log "isolated-gate: 'git worktree add' failed — caller should fall back to in-place gate"
    git -C "$PROJECT_DIR" worktree prune 2>/dev/null || true
    return 2
  fi

  # Apply ONLY the lane-authored files onto the clean checkout. A path present in
  # the main working tree is copied; a path the lane DELETED (absent now) is
  # removed in the worktree so the gate sees the deletion too.
  local p _skipped_ignored=0
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    # Never gate a gitignored path. A lane's verify-build can emit build
    # artifacts (e.g. fe-next/.next-verify/**) that slip into the authored list;
    # copying thousands of 500KB+ chunks into the worktree wedged eslint for 75
    # min on 2026-05-31. These are never shippable (git add skips them), so they
    # must never enter the gate either. Defense independent of .gitignore edits.
    if git -C "$PROJECT_DIR" check-ignore -q "$p" 2>/dev/null; then
      _skipped_ignored=$(( _skipped_ignored + 1 )); continue
    fi
    if [ -e "$PROJECT_DIR/$p" ]; then
      mkdir -p "$wt/$(dirname "$p")" 2>/dev/null || true
      cp -p "$PROJECT_DIR/$p" "$wt/$p" 2>>"$RUN_LOG" || true
    else
      rm -f "$wt/$p" 2>/dev/null || true
    fi
  done < "$authored"

  # node_modules: copy-on-write clone (instant on APFS, ~0 real disk). Fall back
  # to a plain copy if the filesystem doesn't support clonefile.
  if [ -d "$PROJECT_DIR/fe-next/node_modules" ]; then
    cp -Rc "$PROJECT_DIR/fe-next/node_modules" "$wt/fe-next/node_modules" 2>>"$RUN_LOG" \
      || cp -R "$PROJECT_DIR/fe-next/node_modules" "$wt/fe-next/node_modules" 2>>"$RUN_LOG" \
      || { log "isolated-gate: node_modules clone failed — falling back to in-place gate"; _isolated_gate_cleanup "$wt"; return 2; }
  fi
  # Build-time env (gitignored → absent from the checkout).
  local envf
  for envf in "${NIGHTLY_GATE_ENV_FILES[@]}"; do
    [ -f "$PROJECT_DIR/$envf" ] && { mkdir -p "$wt/$(dirname "$envf")"; cp -p "$PROJECT_DIR/$envf" "$wt/$envf" 2>/dev/null || true; }
  done

  [ "$_skipped_ignored" -gt 0 ] && log "isolated-gate: skipped $_skipped_ignored gitignored path(s) (build artifacts — never gated/shipped)"
  log "isolated-gate: gating $(grep -c . "$authored") authored file(s) on a clean HEAD checkout (worktree $wt)$([ "$skip_lint" = "1" ] && printf ' [lint skipped — baseline-poison re-gate]')$([ "$build_only" = "1" ] && printf ' [build-only — verifying authored set builds despite red test baseline]')$([ "$typecheck_only" = "1" ] && printf ' [typecheck tier — tsc --noEmit + test:changed; conclusive verdict after a next-build TS wedge]')$([ "$typeonly_notest" = "1" ] && printf ' [typeonly — build:schemas + tsc --noEmit, no test/next-build; baseline-red ship verification]')"
  # Capture the gate's combined output to a file the caller can parse (the
  # drop-and-re-gate salvage needs to know WHICH file failed). Path is exposed
  # via the global NIGHTLY_LAST_GATE_OUTPUT; caller parses then removes it.
  NIGHTLY_LAST_GATE_OUTPUT=$(mktemp -t nightly-gate-out.XXXXXX)
  local rc=0
  # TIMEOUT: lanes get a gtimeout ceiling; the gate must too. A hung lint/test/build
  # (the .next-verify eslint wedge on 2026-05-31 ran 75min) otherwise stalls the run
  # with no upper bound. Default 45min, env-overridable. The wrapper bounds BOTH the
  # real npm chain AND the deterministic test seam, so the timeout path is observable
  # and unit-testable (the seam previously ran unbounded → untestable).
  #
  # A timeout is INCONCLUSIVE (rc=3), NOT a content failure (rc=1). vitest SIGKILLed
  # mid-run prints no per-file FAIL summary, so the salvage parser gets nothing and
  # would otherwise drop ALL authored code (the 2026-06-06 zero-code night). rc=3 lets
  # the caller re-verify with a fast build-only re-gate instead of discarding the work.
  # PROGRESS watchdog instead of a fixed wall-clock cap (2026-06-07): the old fixed
  # 2700s gtimeout SIGKILLed a slow-but-ADVANCING suite, shipping tests UNVERIFIED.
  # run_with_idle_timeout kills only on a true wedge — no new gate output for
  # NIGHTLY_GATE_IDLE_SECS (default 600s, safely past next build's ~4min quiet compile
  # window) — and otherwise runs to completion, so a slow suite now finishes and tests
  # get VERIFIED. NIGHTLY_GATE_TIMEOUT is kept as the far-out absolute backstop
  # (default raised 2700→5400s) against a busy-but-useless hang. An idle/max kill
  # returns 124 → the rc=3 INCONCLUSIVE path below fires exactly as before.
  # shellcheck source=/dev/null
  . "$(dirname "${BASH_SOURCE[0]}")/idle-timeout.sh"
  local _gidle="${NIGHTLY_GATE_IDLE_SECS:-900}" _gmax="${NIGHTLY_GATE_TIMEOUT:-5400}"
  if [ -n "${NIGHTLY_GATE_CMD:-}" ]; then
    # Test seam: a deterministic command run inside the worktree's fe-next, watched by
    # the same idle/max watchdog so a silent `sleep` exercises the idle-kill rc=3 path.
    run_with_idle_timeout "$_gidle" "$_gmax" "$NIGHTLY_LAST_GATE_OUTPUT" -- \
      bash -c 'cd "$1/fe-next" && eval "$2"' _ "$wt" "$NIGHTLY_GATE_CMD" || rc=$?
  else
    # build:schemas FIRST — `npm run test` imports `../dist/backend/utils/schemas`
    # via the compiled-bridge in backend/utils/socketValidation.ts:69. The fresh
    # worktree has no dist/ yet, so 12 handler-test suites fail with "Cannot find
    # module" — that's what reverted every CODE lane on 2026-05-26. Cheap (~3s
    # tsc), then build:fast (next build), then the full test suite last.
    local _body="cd \"\$1/fe-next\" && $(_gate_npm_chain "$skip_lint" "$build_only" "$typecheck_only" "$typeonly_notest")"
    run_with_idle_timeout "$_gidle" "$_gmax" "$NIGHTLY_LAST_GATE_OUTPUT" -- \
      bash -c "$_body" _ "$wt" || rc=$?
  fi
  if [ "${rc:-0}" = "124" ] || [ "${rc:-0}" = "137" ]; then
    # 124 = gtimeout's SIGTERM fired. 137 = SIGKILL — either the --kill-after grace
    # SIGKILLed a child (next build / vitest spawn that ignored/outlived SIGTERM) OR an
    # OOM-kill (tsc/vitest have OOM'd before). Both mean the gate did NOT complete → the
    # verdict is UNKNOWN, not a content failure. The old code only special-cased 124, so
    # a 137 wedge silently fell through to rc=1 → docs-only drop-all (the catastrophe in
    # a different exit code). "timeout-or-OOM" keeps a recurring OOM visible vs a slow night.
    log "isolated-gate: did NOT complete (rc=${rc:-0}: wedged ${NIGHTLY_GATE_IDLE_SECS:-900}s idle, or hit the ${NIGHTLY_GATE_TIMEOUT:-5400}s backstop) — INCONCLUSIVE (rc=3; caller re-verifies build-only, does NOT drop code)"
    rc=3
  elif [ "${rc:-0}" != "0" ]; then
    rc=1
  fi
  cat "$NIGHTLY_LAST_GATE_OUTPUT" >> "$RUN_LOG" 2>/dev/null || true

  _isolated_gate_cleanup "$wt"
  if [ "$rc" = "0" ]; then
    [ "$skip_lint" = "1" ] && log "isolated-gate(no-lint): PASS — authored set is test+build clean" \
                           || log "isolated-gate: PASS"
  elif [ "$rc" = "1" ]; then
    [ "$skip_lint" = "1" ] && log "isolated-gate(no-lint): FAIL — authored set breaks test/build (not just baseline lint)" \
                           || log "isolated-gate: FAIL (lane code broke lint/test/build)"
  fi
  return $rc
}

# nightly_parse_gate_failures <gate_output_file> → repo-relative source paths
# (fe-next/...) that eslint or tsc flagged with an ERROR. Best-effort: handles
# eslint's absolute file-header lines and tsc's `path(line,col): error` form,
# normalises both to repo-relative, de-dups. Prints nothing if it can't parse —
# the caller then falls back to the existing docs-only salvage (never regresses).
#
# 2026-05-27 fixes:
#   • Exclude `node_modules/` — happy-dom/vitest/etc paths appear in test-runner
#     error output and were being dropped as if lane-authored (27/27 drops on
#     2026-05-27 round 1 were noise of this kind).
#   • Anchor extension at non-alpha boundary so `\.js` doesn't swallow `\.json`
#     (the run dropped `fe-next/package.js` — a non-existent file produced by
#     `package.json` truncation under the old `\.(tsx?|jsx?|mjs|cjs)` group).
# Caller is also expected to intersect with the authored allowlist (run.sh)
# so even a stray parse never drops a non-authored file.
nightly_parse_gate_failures() {
  local out="$1"
  [ -n "$out" ] && [ -s "$out" ] || return 0
  {
    # eslint prints the file path as a HEADER on its own line; in the worktree it's
    # absolute and contains /fe-next/… — keep from fe-next/ onward. Match ONLY a
    # whole-line path token (an eslint header), NEVER a path embedded in prose.
    # An earlier substring scrape (`grep -oE '/fe-next/…\.js…'`) matched any path
    # ANYWHERE in the output and flagged it as a lint offender, which then got
    # HARD-REVERTED by drop-and-re-gate. Two real ways that destroyed authored work:
    #   • Babel: "…deoptimised the styling of …/fe-next/translations/en.js as it
    #     exceeds the max of 500KB" — emitted whenever the large i18n bundles change;
    #     nuked en/es/sv.js twice (2026-05-27, 2026-06-05).
    #   • vitest stack frames: "  at …/fe-next/foo.test.tsx:33".
    # Anchoring to a whole-line token rejects both. (warning-only headers still
    # emit — harmless, a warning-only file won't fail the gate.)
    grep -E '^[[:space:]]*[^[:space:]]+\.(tsx|ts|jsx|js|mjs|cjs)[[:space:]]*$' "$out" \
      | sed -E 's/^[[:space:]]*//; s/[[:space:]]*$//' \
      | grep '/fe-next/' \
      | sed -E 's#^.*/(fe-next/)#\1#' \
      | grep -v '/node_modules/'
    # tsc: `components/foo.tsx(12,3): error TS....` (relative to fe-next cwd).
    grep -oE '^[A-Za-z0-9_][A-Za-z0-9_./-]*\.(tsx|ts|jsx|js|mjs|cjs)\([0-9]+,[0-9]+\): error' "$out" \
      | sed -E 's/\([0-9]+,[0-9]+\): error.*$//' \
      | sed -E 's#^#fe-next/#' \
      | grep -v '/node_modules/'
    # next build (build:fast): App Router prints the offending file as a bare `./path`
    # line on its OWN line — a TS error adds a `:line:col` suffix (`./app/foo/page.tsx:5:1`),
    # a webpack module-not-found (orphaned page importing a missing sibling — the canonical
    # gate-timeout partial) prints it WITHOUT one (`./app/foo/page.tsx`, in the error head +
    # "Import trace"). Match both: REQUIRE the leading `./` (Next always emits it) so prose
    # can't match, make `:line:col` optional. Relative to the fe-next cwd. Allowlist-
    # intersected in run.sh, so a stray match is dropped anyway; the `./` anchor + code
    # extension already exclude the `https://nextjs.org/...` doc URL and the trace label.
    grep -oE '^\./[A-Za-z0-9_][][A-Za-z0-9_./-]*\.(tsx|ts|jsx|js|mjs|cjs)(:[0-9]+:[0-9]+)?$' "$out" \
      | sed -E 's/:[0-9]+:[0-9]+$//; s#^\./##' \
      | sed -E 's#^#fe-next/#' \
      | grep -v '/node_modules/'
  } 2>/dev/null | sort -u
}

# nightly_parse_test_failures <gate_output_file> → repo-relative TEST FILE paths
# (fe-next/...) that vitest reported as FAIL. The drop-and-re-gate parser above
# only catches lint/tsc errors (`file(line,col): error`); a failing TEST emits no
# such line, so a test that ALREADY fails on untouched master left `_bad` empty,
# the lint-skip re-gate reran the same red test, and the run collapsed to docs-only
# (the 2026-06-02/03 zero-code nights). This parser feeds the baseline-aware salvage:
# compare the authored gate's failing tests against a clean-HEAD baseline's — a test
# red on master is NOT the nightly's fault.
#
# Vitest prints a per-failure header:  " FAIL  <path>.test.tsx > describe > it"
# (ANSI-coloured; path relative to fe-next, the gate's cwd, or absolute inside the
# worktree). Strip ANSI, pull the path token, normalise to fe-next/…, drop
# node_modules. Best-effort: prints nothing if unparseable (caller stays safe).
nightly_parse_test_failures() {
  local out="$1"
  [ -n "$out" ] && [ -s "$out" ] || return 0
  sed -E $'s/\x1b\\[[0-9;]*m//g' "$out" 2>/dev/null \
    | grep -oE 'FAIL +[A-Za-z0-9_./-]+\.(test|spec)\.(tsx|ts|jsx|js|mjs|cjs)' \
    | sed -E 's/^FAIL +//' \
    | awk '{ if ($0 ~ /\/fe-next\//) sub(/^.*\/fe-next\//,"fe-next/"); else if ($0 !~ /^fe-next\//) $0="fe-next/"$0; print }' \
    | grep -v '/node_modules/' \
    | sort -u
}

# nightly_gate_has_unattributed_failures <gate_output_file> → exit 0 (true) iff the gate
# output contains a CODE-level failure that nightly_parse_test_failures CANNOT see as a
# `FAIL <path>` line — so the baseline-aware 'ship' verdict ("every FAIL-line test also fails
# on clean HEAD") is UNSAFE: a NEW authored breakage may be hidden from the comparison.
#
# The 2026-06-11 near-miss: the authored growthTracking→isAndroid break surfaced as an
# "Unhandled Rejection" (a rejected promise from a mock missing an export) with NO `FAIL`
# line → 'ship' fired on only the pre-existing baseline-red FAIL files → it nearly shipped
# test-broken code (a coincidental build-only rc=3 was the only thing that stopped it).
#
# DISCRIMINATION (deliberate, do not "simplify" away): a vitest worker OOM / startup crash
# ALSO prints under an "Unhandled Error" header (`Worker terminated … JS heap out of memory`
# / `ERR_WORKER_OUT_OF_MEMORY` / `Failed to start … worker`). That is INFRA noise, not a
# hidden authored break, and worker OOM is a recurring full-suite flake here. Treating it as
# unattributed would fire this guard on virtually every red-master night (those run the full
# suite → OOM co-occurs) and silently revert the 2026-06-02/03 baseline-red-ship fix that
# stops zero-code nights. So: an Unhandled REJECTION always blocks; an Unhandled ERROR blocks
# ONLY when it is not a worker-OOM/crash. OOM-only inconclusiveness is handled elsewhere via
# the rc=3 timeout routing, not here. Returns 1 (false) on empty/missing output.
nightly_gate_has_unattributed_failures() {
  local out="$1"
  [ -n "$out" ] && [ -s "$out" ] || return 1
  # A rejected promise (e.g. a mock missing an export) — always a code-level hidden failure.
  LC_ALL=C grep -qaE 'Unhandled Rejection' "$out" 2>/dev/null && return 0
  # An unhandled error that is NOT a vitest worker OOM/startup crash is also code-level.
  if LC_ALL=C grep -qaE 'Unhandled Error' "$out" 2>/dev/null; then
    LC_ALL=C grep -qaE 'ERR_WORKER_OUT_OF_MEMORY|Worker terminated|Failed to start [^[:space:]]* worker' "$out" 2>/dev/null || return 0
  fi
  return 1
}

# nightly_baseline_test_tokens <fail_test_file> → space-joined vitest positional
# filters (test-file basenames) for a TARGETED baseline gate. The 2026-06-13 outage:
# the baseline gate ran the FULL 3278-test suite on clean HEAD, a network integration
# test (wikipediaTimeout.integration) WEDGED it → rc=3 inconclusive → the decision read
# "no comparable baseline" → docs-only DROP of build-clean lane code. Scoping the baseline
# to ONLY the authored gate's failing test files (none of which touch the network) makes it
# deterministic: a real rc=1 + FAIL lines instead of a hang. We emit BASENAMES, not paths,
# on purpose: nightly_parse_test_failures drops a backend test's `backend/` segment (vitest
# runs cwd=fe-next/backend), so the parsed path can't be resolved on disk — but a basename
# is a valid vitest substring filter that matches in whichever project owns the file.
# De-dupes (one file, many failing describes → one filter). Prints nothing on empty/missing.
nightly_baseline_test_tokens() {
  local f="$1"
  [ -n "$f" ] && [ -s "$f" ] || return 0
  awk -F/ 'NF{print $NF}' "$f" 2>/dev/null | sort -u | tr '\n' ' ' | sed 's/ *$//'
}

# run_baseline_gate [skip_lint=0] [targeted_tokens=""] — gate a CLEAN HEAD checkout with
# NO authored files applied, to learn whether master ITSELF is red (a pre-existing failing
# test/lint that no lane introduced). Output is left in NIGHTLY_LAST_GATE_OUTPUT for the
# caller to parse (same contract as run_isolated_gate). Returns the gate rc.
#
# When targeted_tokens is non-empty, the test phase is SCOPED to just those vitest filters
# (build:schemas still runs first for the dist bridge) — this is the wedge-proof baseline
# the 2026-06-13 fix added: it can't hang on an unrelated slow/networked suite, so a red
# master yields rc=1 + FAIL lines (→ proven pre-existing → ship) instead of rc=3 (→ drop).
run_baseline_gate() {
  local skip_lint="${1:-0}" targeted_tokens="${2:-}" _empty rc
  _empty=$(mktemp -t nightly-baseline-empty.XXXXXX); : > "$_empty"
  if [ -n "$targeted_tokens" ]; then
    log "baseline-gate: gating CLEAN HEAD scoped to the authored gate's failing test file(s) [$targeted_tokens] — wedge-proof pre-existing-red check"
    # Run BOTH vitest projects with the filters (each project runs only its matching files;
    # the other matches nothing → passes fast). `;`-separate + AND the rcs so a red in EITHER
    # project propagates to a non-zero gate rc; combined output feeds the FAIL-line parser.
    # build:schemas precedes the tests (the dist bridge handler suites import ../dist/...).
    local _saved_cmd="${NIGHTLY_GATE_CMD:-}" _had_cmd=0
    [ -n "${NIGHTLY_GATE_CMD:-}" ] && _had_cmd=1
    export NIGHTLY_GATE_CMD="npm run build:schemas && { npm run test:backend -- $targeted_tokens; _bk=\$?; npm run test:frontend -- $targeted_tokens; _fe=\$?; [ \$_bk -eq 0 ] && [ \$_fe -eq 0 ]; }"
    run_isolated_gate "$_empty" "$skip_lint" 1; rc=$?
    if [ "$_had_cmd" = 1 ]; then export NIGHTLY_GATE_CMD="$_saved_cmd"; else unset NIGHTLY_GATE_CMD; fi
  else
    log "baseline-gate: gating CLEAN HEAD (no authored files) to detect pre-existing master breakage"
    run_isolated_gate "$_empty" "$skip_lint" 1; rc=$?
  fi
  rm -f "$_empty" 2>/dev/null || true
  return $rc
}

_isolated_gate_cleanup() {
  local wt="$1"
  git -C "$PROJECT_DIR" worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
  git -C "$PROJECT_DIR" worktree prune 2>/dev/null || true
}
