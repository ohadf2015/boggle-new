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
  local skip_lint="${1:-0}" build_only="${2:-0}" chain=""
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
  printf '%s' "${chain}npm run build:schemas && npm run test && { rm -rf .next-nightly 2>/dev/null; NEXT_BUILD_DIR=.next-nightly npm run build:fast; }"
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

# run_isolated_gate <authored_list_file> [skip_lint=0] [baseline=0]
# baseline=1 gates a CLEAN HEAD checkout with NO authored files applied (the
# authored list is ignored / may be empty) — used by run_baseline_gate to learn
# whether master ITSELF is red independent of any lane code.
run_isolated_gate() {
  local authored="$1" skip_lint="${2:-0}" baseline="${3:-0}" build_only="${4:-0}"
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
  log "isolated-gate: gating $(grep -c . "$authored") authored file(s) on a clean HEAD checkout (worktree $wt)$([ "$skip_lint" = "1" ] && printf ' [lint skipped — baseline-poison re-gate]')$([ "$build_only" = "1" ] && printf ' [build-only — verifying authored set builds despite red test baseline]')"
  # Capture the gate's combined output to a file the caller can parse (the
  # drop-and-re-gate salvage needs to know WHICH file failed). Path is exposed
  # via the global NIGHTLY_LAST_GATE_OUTPUT; caller parses then removes it.
  NIGHTLY_LAST_GATE_OUTPUT=$(mktemp -t nightly-gate-out.XXXXXX)
  local rc=0
  if [ -n "${NIGHTLY_GATE_CMD:-}" ]; then
    # Test seam: a deterministic command run inside the worktree's fe-next.
    ( cd "$wt/fe-next" && eval "$NIGHTLY_GATE_CMD" ) > "$NIGHTLY_LAST_GATE_OUTPUT" 2>&1 || rc=1
  else
    # build:schemas FIRST — `npm run test` imports `../dist/backend/utils/schemas`
    # via the compiled-bridge in backend/utils/socketValidation.ts:69. The fresh
    # worktree has no dist/ yet, so 12 handler-test suites fail with "Cannot find
    # module" — that's what reverted every CODE lane on 2026-05-26. Cheap (~3s
    # tsc), then build:fast for the final next build (skip dicts/routes regen).
    #
    # TIMEOUT: lanes get a gtimeout ceiling; the gate must too. A hung lint/test/
    # build (the .next-verify eslint wedge on 2026-05-31 ran 75min) otherwise
    # stalls the whole run with no upper bound. Default 30min, env-overridable.
    local _gto=()
    if command -v gtimeout >/dev/null 2>&1; then _gto=(gtimeout --kill-after=30s "${NIGHTLY_GATE_TIMEOUT:-1800}s")
    elif command -v timeout >/dev/null 2>&1; then _gto=(timeout --kill-after=30s "${NIGHTLY_GATE_TIMEOUT:-1800}s"); fi
    local _body="cd \"\$1/fe-next\" && $(_gate_npm_chain "$skip_lint" "$build_only")"
    "${_gto[@]}" bash -c "$_body" _ "$wt" > "$NIGHTLY_LAST_GATE_OUTPUT" 2>&1 || rc=$?
    [ "${rc:-0}" = "124" ] && log "isolated-gate: TIMED OUT after ${NIGHTLY_GATE_TIMEOUT:-1800}s — killed (treated as gate fail)"
    [ "${rc:-0}" != "0" ] && rc=1
  fi
  cat "$NIGHTLY_LAST_GATE_OUTPUT" >> "$RUN_LOG" 2>/dev/null || true

  _isolated_gate_cleanup "$wt"
  if [ "$skip_lint" = "1" ]; then
    [ "$rc" = "0" ] && log "isolated-gate(no-lint): PASS — authored set is test+build clean" \
                    || log "isolated-gate(no-lint): FAIL — authored set breaks test/build (not just baseline lint)"
  else
    [ "$rc" = "0" ] && log "isolated-gate: PASS" || log "isolated-gate: FAIL (lane code broke lint/test/build)"
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

# run_baseline_gate [skip_lint=0] — gate a CLEAN HEAD checkout with NO authored
# files applied, to learn whether master ITSELF is red (a pre-existing failing
# test/lint that no lane introduced). Output is left in NIGHTLY_LAST_GATE_OUTPUT
# for the caller to parse (same contract as run_isolated_gate). Returns the gate rc.
run_baseline_gate() {
  local skip_lint="${1:-0}" _empty rc
  _empty=$(mktemp -t nightly-baseline-empty.XXXXXX); : > "$_empty"
  log "baseline-gate: gating CLEAN HEAD (no authored files) to detect pre-existing master breakage"
  run_isolated_gate "$_empty" "$skip_lint" 1; rc=$?
  rm -f "$_empty" 2>/dev/null || true
  return $rc
}

_isolated_gate_cleanup() {
  local wt="$1"
  git -C "$PROJECT_DIR" worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
  git -C "$PROJECT_DIR" worktree prune 2>/dev/null || true
}
