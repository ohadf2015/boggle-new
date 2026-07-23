#!/bin/bash
# Test for run_isolated_gate() — the worktree gate. Proves the SAFETY PROPERTY:
# the founder's working tree is never written, and the gate sees exactly
# (clean HEAD + lane-authored files), not the founder's concurrent WIP.
#
# Uses the NIGHTLY_GATE_CMD seam to run a fast deterministic check inside the
# worktree's fe-next instead of a real npm build.
#
# Run: bash scripts/nightly/test/gate-isolated.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/gate-isolated.sh"

RUN_LOG=/dev/null
log() { :; }   # silence

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

setup() {
  PROJECT_DIR=$(mktemp -d -t gateiso.XXXXXX)
  export PROJECT_DIR
  ( cd "$PROJECT_DIR"
    git -c init.defaultBranch=master init -q
    git config user.email t@t; git config user.name tester
    mkdir -p fe-next/app fe-next/node_modules/.bin
    printf 'export const v = "COMMITTED";\n' > fe-next/app/lane.ts
    printf 'export const w = "COMMITTED";\n' > fe-next/app/founder.ts
    # A healthy node_modules/.bin has the dev tools the gate invokes; stub all four
    # so _gate_ensure_bin sees them present and skips its npm-rebuild self-heal.
    for b in eslint vitest tsc next; do printf '#!/bin/sh\necho fake\n' > "fe-next/node_modules/.bin/$b"; done
    git add -A; git commit -qm init )
}
teardown() { ( cd "$PROJECT_DIR" && git worktree prune 2>/dev/null ); rm -rf "$PROJECT_DIR"; }

echo "── gate-isolated: authored applied, founder WIP isolated + untouched ──"

setup
# Lane edits lane.ts (authored). Founder concurrently edits founder.ts (NOT authored).
printf 'export const v = "LANE_VERSION";\n'   > "$PROJECT_DIR/fe-next/app/lane.ts"
printf 'export const w = "FOUNDER_WIP_BROKEN";\n' > "$PROJECT_DIR/fe-next/app/founder.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"

# Gate command asserts what the WORKTREE sees (runs in $wt/fe-next):
#  - lane.ts must be the LANE version (authored applied)
#  - founder.ts must be the COMMITTED version (founder WIP NOT pulled in)
#  - node_modules must be present (cloned)
export NIGHTLY_GATE_CMD='grep -q LANE_VERSION app/lane.ts && grep -q COMMITTED app/founder.ts && ! grep -q FOUNDER_WIP app/founder.ts && test -f node_modules/.bin/eslint'
run_isolated_gate "$AUTH"; rc=$?
assert "gate PASSES when worktree state is correct (authored applied, WIP excluded, node_modules present)" "[ $rc -eq 0 ]"

# The founder's working tree must be byte-for-byte untouched by the gate run.
assert "main tree: founder WIP preserved after gate" \
  "grep -q FOUNDER_WIP_BROKEN \"\$PROJECT_DIR/fe-next/app/founder.ts\""
assert "main tree: lane file preserved after gate" \
  "grep -q LANE_VERSION \"\$PROJECT_DIR/fe-next/app/lane.ts\""
assert "no leftover worktrees registered" \
  "[ \"\$(cd \"\$PROJECT_DIR\" && git worktree list | wc -l | tr -d ' ')\" = 1 ]"
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

echo "── gate-isolated: a broken authored file FAILS the gate ──"
setup
printf 'this is { not valid (\n' > "$PROJECT_DIR/fe-next/app/lane.ts"   # lane broke it
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
# Gate cmd simulates a compiler that rejects the broken file.
export NIGHTLY_GATE_CMD='! grep -q "not valid" app/lane.ts'
run_isolated_gate "$AUTH"; rc=$?
assert "gate FAILS when the lane's own authored file is broken" "[ $rc -eq 1 ]"
assert "main tree untouched even on gate failure" \
  "grep -q 'not valid' \"\$PROJECT_DIR/fe-next/app/lane.ts\""
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

echo "── gate-isolated: authored DELETION reflected in worktree ──"
setup
rm "$PROJECT_DIR/fe-next/app/lane.ts"   # lane deleted a file
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='! test -e app/lane.ts'   # worktree must NOT have it
run_isolated_gate "$AUTH"; rc=$?
assert "gate sees the authored deletion (file absent in worktree)" "[ $rc -eq 0 ]"
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

echo "── gate-isolated: gitignored build artifacts are skipped (never gated) ──"
setup
# A lane's verify-build emitted .next-verify artifacts that slipped into the
# authored list. They're gitignored → must never be copied into the gate
# worktree (copying thousands of 500KB chunks wedged eslint 75min on 2026-05-31).
( cd "$PROJECT_DIR"
  printf '/fe-next/.next-verify/\n' >> .gitignore
  git add .gitignore && git commit -qm "ignore .next-verify" )
mkdir -p "$PROJECT_DIR/fe-next/.next-verify/chunks"
printf 'JUNK BUILD ARTIFACT\n'             > "$PROJECT_DIR/fe-next/.next-verify/chunks/big.js"
printf 'export const v = "LANE_REAL";\n'   > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); printf 'fe-next/.next-verify/chunks/big.js\nfe-next/app/lane.ts\n' > "$AUTH"
# Worktree must contain the REAL authored file but NOT the gitignored artifact.
export NIGHTLY_GATE_CMD='grep -q LANE_REAL app/lane.ts && ! test -e .next-verify/chunks/big.js'
run_isolated_gate "$AUTH"; rc=$?
assert "gate PASSES: gitignored artifact skipped, real file applied" "[ $rc -eq 0 ]"
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

echo "── gate-isolated: empty authored list is a no-op pass ──"
setup
EMPTY=$(mktemp); : > "$EMPTY"
run_isolated_gate "$EMPTY"; rc=$?
assert "empty authored list returns 0 (nothing to gate)" "[ $rc -eq 0 ]"
rm -f "$EMPTY"; teardown

echo "── gate-isolated: a WEDGE is INCONCLUSIVE (rc=3), never a content failure ──"
# The 2026-06-06 catastrophe: the gate ran the whole vitest suite + next build, was
# SIGKILLed mid-run, and rc=124 collapsed to rc=1 ("lane code broke") → the salvage
# parser got no FAIL list from the killed run → docs-only drop-ALL-code. A kill is
# UNKNOWN, not BROKEN: it must return a DISTINCT rc=3 so the caller re-verifies
# (build-only) instead of discarding a whole night's work.
#
# The fixed wall-clock cap is now a PROGRESS watchdog (run_with_idle_timeout): a gate
# producing NO new output for NIGHTLY_GATE_IDLE_SECS is wedged → killed → rc=3.
setup
printf 'export const v = "LANE_SLOW";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='sleep 10'             # silent → no output → idle-killed
export NIGHTLY_GATE_IDLE_SECS=1 NIGHTLY_GATE_TIMEOUT=60 IDLE_TIMEOUT_POLL=1
run_isolated_gate "$AUTH"; rc=$?
assert "gate WEDGE (idle) returns rc=3 (distinct from 1=fail, 2=setup, 0=pass)" "[ $rc -eq 3 ]"
assert "main tree untouched on wedge" "grep -q LANE_SLOW \"\$PROJECT_DIR/fe-next/app/lane.ts\""
unset NIGHTLY_GATE_CMD NIGHTLY_GATE_IDLE_SECS NIGHTLY_GATE_TIMEOUT IDLE_TIMEOUT_POLL; rm -f "$AUTH"; teardown

# A process that IGNORES SIGTERM forces the watchdog's grace→SIGKILL path. next build /
# vitest spawn children that can outlive SIGTERM, and tsc/vitest have OOM'd. The hard
# SIGKILL half must ALSO be inconclusive (rc=3), not drop-all.
setup
printf 'export const v = "LANE_WEDGE";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='trap "" TERM; sleep 30'   # ignore SIGTERM → grace → SIGKILL
export NIGHTLY_GATE_IDLE_SECS=1 NIGHTLY_GATE_TIMEOUT=60 IDLE_TIMEOUT_POLL=1 IDLE_TIMEOUT_KILL_GRACE=2
run_isolated_gate "$AUTH"; rc=$?
assert "gate SIGKILL (ignores TERM) also returns rc=3 (inconclusive, not drop-all)" "[ $rc -eq 3 ]"
unset NIGHTLY_GATE_CMD NIGHTLY_GATE_IDLE_SECS NIGHTLY_GATE_TIMEOUT IDLE_TIMEOUT_POLL IDLE_TIMEOUT_KILL_GRACE; rm -f "$AUTH"; teardown

# Busy-but-useless: a gate that keeps EMITTING output forever (never idle) must still
# be stopped by the absolute NIGHTLY_GATE_TIMEOUT backstop → rc=3 (not an infinite run).
setup
printf 'export const v = "LANE_BUSY";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='while true; do echo grinding; sleep 0.2; done'
export NIGHTLY_GATE_IDLE_SECS=60 NIGHTLY_GATE_TIMEOUT=2 IDLE_TIMEOUT_POLL=1
run_isolated_gate "$AUTH"; rc=$?
assert "gate busy-past-max backstop returns rc=3 (no infinite hang)" "[ $rc -eq 3 ]"
unset NIGHTLY_GATE_CMD NIGHTLY_GATE_IDLE_SECS NIGHTLY_GATE_TIMEOUT IDLE_TIMEOUT_POLL; rm -f "$AUTH"; teardown

setup
printf 'export const v = "LANE_FAILFAST";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='! grep -q LANE_FAILFAST app/lane.ts'   # fails immediately
export NIGHTLY_GATE_TIMEOUT=30
run_isolated_gate "$AUTH"; rc=$?
assert "a real fail under a generous budget still returns rc=1 (peel machinery intact)" "[ $rc -eq 1 ]"
unset NIGHTLY_GATE_CMD NIGHTLY_GATE_TIMEOUT; rm -f "$AUTH"; teardown

setup
printf 'export const v = "LANE_CLEAN";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='grep -q LANE_CLEAN app/lane.ts'
export NIGHTLY_GATE_TIMEOUT=30
run_isolated_gate "$AUTH"; rc=$?
assert "a clean gate under the timeout wrapper still returns rc=0" "[ $rc -eq 0 ]"
unset NIGHTLY_GATE_CMD NIGHTLY_GATE_TIMEOUT; rm -f "$AUTH"; teardown

echo "── gate-isolated: _gate_npm_chain (baseline-poison lint-skip builder) ──"
# Pure command-builder: skip_lint=1 must DROP `npm run lint` but keep test + build,
# so the baseline-poison salvage verifies the authored set's test/build effect while
# ignoring a pre-existing baseline lint error.
CHAIN_FULL=$(_gate_npm_chain 0)
CHAIN_NOLINT=$(_gate_npm_chain 1)
assert "full chain (skip=0) runs lint"                "[[ \"$CHAIN_FULL\"   == *'npm run lint'* ]]"
assert "no-lint chain (skip=1) DROPS lint"            "[[ \"$CHAIN_NOLINT\" != *'npm run lint'* ]]"
assert "no-lint chain still runs build:schemas"       "[[ \"$CHAIN_NOLINT\" == *'npm run build:schemas'* ]]"
assert "no-lint chain still runs test"                "[[ \"$CHAIN_NOLINT\" == *'npm run test'* ]]"
assert "no-lint chain still runs build:fast"          "[[ \"$CHAIN_NOLINT\" == *'build:fast'* ]]"
assert "build:schemas precedes test (dist bridge)"    "[[ \"$CHAIN_NOLINT\" == *'build:schemas'*'npm run test'* ]]"
# Build BEFORE the full test suite: the build verdict (catches the real lane breakage —
# type/import errors like an orphaned page) must be reached even if the slow test phase
# overruns. On 2026-06-06 test ran first, so the build was never verified before SIGKILL.
assert "full chain runs build:fast BEFORE the full test suite" "[[ \"$CHAIN_FULL\"   == *'build:fast'*'npm run test'* ]]"
assert "no-lint chain runs build:fast BEFORE test too"         "[[ \"$CHAIN_NOLINT\" == *'build:fast'*'npm run test'* ]]"

# TEST SCOPE (2026-06-17): the gate DEFAULTS to the changed-cone (`test:changed`), not the
# full suite — the full `npm run test` wedges on pool-timeouts + chronic-red suites no lane
# touches → 5400s backstop → docs-only salvage drops all code (06-12/13/16/17). The chain
# must TERMINATE in test:changed by default; only the env escape hatch restores the full suite.
assert "default chain TERMINATES in test:changed (changed-cone, not full suite)" \
  "[[ \"\$CHAIN_FULL\" == *'&& npm run test:changed' ]]"
assert "default no-lint chain also terminates in test:changed" \
  "[[ \"\$CHAIN_NOLINT\" == *'&& npm run test:changed' ]]"
CHAIN_FULLSUITE=$(NIGHTLY_GATE_FULL_TEST=1 _gate_npm_chain 0)
assert "NIGHTLY_GATE_FULL_TEST=1 escape hatch restores the FULL suite (terminal bare test, no :changed)" \
  "[[ \"\$CHAIN_FULLSUITE\" == *'&& npm run test' ]] && [[ \"\$CHAIN_FULLSUITE\" != *'test:changed' ]]"
assert "escape-hatch full chain still runs build:fast BEFORE the full suite" \
  "[[ \"\$CHAIN_FULLSUITE\" == *'build:fast'*'npm run test' ]]"

# TS-PHASE SKIP (2026-06-28): the happy-path gate must run a standalone `tsc --noEmit` for the
# type verdict AND tell next build to skip its own silent "Running TypeScript" phase
# (NIGHTLY_SKIP_NEXT_TS=1 → next.config typescript.ignoreBuildErrors). That phase wedged 900s
# silent on 4 of 7 nights (06-21/24/25/27) → tests-inconclusive, tests never ran. Promotes the
# typecheck_only tier's proven fast pattern onto the default path.
assert "default chain runs standalone tsc --noEmit (fast type verdict)" \
  "[[ \"\$CHAIN_FULL\" == *'npx --no-install tsc --noEmit'* ]]"
assert "default chain sets NIGHTLY_SKIP_NEXT_TS=1 on build:fast (skip next's silent TS phase)" \
  "[[ \"\$CHAIN_FULL\" == *'NIGHTLY_SKIP_NEXT_TS=1'*'build:fast'* ]]"
assert "tsc --noEmit precedes build:fast (catch type errors before the slow webpack compile)" \
  "[[ \"\$CHAIN_FULL\" == *'tsc --noEmit'*'build:fast'* ]]"
assert "build:schemas precedes tsc (dist bridge) on the happy path too" \
  "[[ \"\$CHAIN_FULL\" == *'build:schemas'*'tsc --noEmit'* ]]"

# build_only=1 → DROP lint AND test, keep build:schemas + build:fast. Used by the
# baseline-aware ship path to prove the authored set builds clean despite a red TEST
# baseline (test short-circuited, so the build was never verified).
CHAIN_BUILD=$(_gate_npm_chain 0 1)
assert "build-only chain DROPS lint"            "[[ \"$CHAIN_BUILD\" != *'npm run lint'* ]]"
assert "build-only chain DROPS test"            "[[ \"$CHAIN_BUILD\" != *'npm run test'* ]]"
assert "build-only chain keeps build:schemas"   "[[ \"$CHAIN_BUILD\" == *'build:schemas'* ]]"
assert "build-only chain keeps build:fast"      "[[ \"$CHAIN_BUILD\" == *'build:fast'* ]]"

# typecheck_only=1 (3rd arg) → the CONCLUSIVE timeout tier: build:schemas + standalone
# `tsc --noEmit` + test:changed. Exists because next-build's OWN silent TS phase wedges
# >900s in a fresh worktree while a standalone tsc type-checks the same project in ~54s
# (2026-06-16). It must NOT run next build (build:fast) — that is the thing that hangs —
# and NOT the full `npm run test` (the other wedge), only the fast lane-scoped checks.
CHAIN_TC=$(_gate_npm_chain 0 0 1)
assert "typecheck chain is exactly schemas → tsc --noEmit → test:changed" \
  "[[ \"\$CHAIN_TC\" == 'npm run build:schemas && npx --no-install tsc --noEmit && npm run test:changed' ]]"
assert "typecheck chain runs standalone tsc --noEmit"           "[[ \"$CHAIN_TC\" == *'tsc --noEmit'* ]]"
assert "typecheck chain runs test:changed (lane-scoped)"        "[[ \"$CHAIN_TC\" == *'npm run test:changed'* ]]"
assert "typecheck chain does NOT run next build (the wedge)"    "[[ \"$CHAIN_TC\" != *'build:fast'* ]]"
assert "typecheck chain does NOT run lint"                      "[[ \"$CHAIN_TC\" != *'npm run lint'* ]]"
assert "build:schemas precedes tsc (dist bridge)"               "[[ \"$CHAIN_TC\" == *'build:schemas'*'tsc --noEmit'* ]]"
assert "tsc precedes test:changed"                              "[[ \"$CHAIN_TC\" == *'tsc --noEmit'*'test:changed'* ]]"

# typeonly_notest=1 (4th arg) → build:schemas + standalone `tsc --noEmit` ONLY: NO test, NO
# next-build, NO lint. The baseline-red SHIP path uses this to build-verify the authored set
# (2026-06-18): the failing tests are already PROVEN pre-existing-red, so any tier that runs
# them (build_only's prior sibling typecheck_only runs test:changed, which re-pulls the same
# red cone) would wrongly block the ship; and build_only's `next build` wedges >900s in a
# fresh worktree (tonight's false drop). tsc gives a wedge-proof type/import verdict with no
# test re-run. WHY this is the whole night's code surviving a red master: build_only rc=3
# (wedge) was being conflated with rc=1 (real break) → docs-only drop of build-clean code.
CHAIN_TO=$(_gate_npm_chain 0 0 0 1)
assert "typeonly chain is exactly schemas → tsc --noEmit" \
  "[[ \"\$CHAIN_TO\" == 'npm run build:schemas && npx --no-install tsc --noEmit' ]]"
assert "typeonly chain does NOT run any test"       "[[ \"$CHAIN_TO\" != *'npm run test'* ]]"
assert "typeonly chain does NOT run next build"     "[[ \"$CHAIN_TO\" != *'build:fast'* ]]"
assert "typeonly chain does NOT run lint"           "[[ \"$CHAIN_TO\" != *'npm run lint'* ]]"
assert "typeonly build:schemas precedes tsc"        "[[ \"$CHAIN_TO\" == *'build:schemas'*'tsc --noEmit'* ]]"

echo "── gate-isolated: nightly_gate_typecheck_route (conclusive tier verdict) ──"
# After BOTH the full gate and the build-only re-gate wedge, the standalone typecheck
# tier runs and its rc routes the decision: 0=ship (type-clean + affected tests green),
# 1=peel (real type/test break, output now parseable), anything else=docs-only.
assert "typecheck tier rc=0 → ship"        "[ \"\$(nightly_gate_typecheck_route 0)\" = ship ]"
assert "typecheck tier rc=1 → peel"        "[ \"\$(nightly_gate_typecheck_route 1)\" = peel ]"
assert "typecheck tier rc=3 → docs-only"   "[ \"\$(nightly_gate_typecheck_route 3)\" = docs-only ]"
assert "typecheck tier rc=empty → docs-only (safe default)" "[ \"\$(nightly_gate_typecheck_route)\" = docs-only ]"

echo "── gate-isolated: nightly_baseline_ship_decision (baseline-aware verdict) ──"
_AF=$(mktemp); _BF=$(mktemp); _ALLOW=$(mktemp)
# Baseline gate PASSED (rc=0) → clean HEAD green → lane introduced the failure. With an EMPTY
# allowlist neither the test nor any source maps → nothing to peel → fallthrough (conservative).
# (The peel-on-green-baseline path is exercised by the 2026-07-23 case below with a real allowlist.)
printf 'fe-next/a.test.ts\n' > "$_AF"; : > "$_BF"; : > "$_ALLOW"
assert "brc=0 (HEAD green), empty allowlist → fallthrough (nothing to peel)" "[ \"\$(nightly_baseline_ship_decision $_AF 0 $_BF $_ALLOW)\" = fallthrough ]"
# Authored fails a.test; baseline also fails a.test (+b) → authored ⊆ baseline → ship.
printf 'fe-next/a.test.ts\n' > "$_AF"; printf 'fe-next/a.test.ts\nfe-next/b.test.ts\n' > "$_BF"; printf 'fe-next/x.tsx\n' > "$_ALLOW"
assert "authored failing ⊆ baseline failing → ship" "[ \"\$(nightly_baseline_ship_decision $_AF 1 $_BF $_ALLOW)\" = ship ]"
# Authored fails a+b; baseline fails only a; b is authored → peel b.
printf 'fe-next/a.test.ts\nfe-next/b.test.ts\n' > "$_AF"; printf 'fe-next/a.test.ts\n' > "$_BF"; printf 'fe-next/b.test.ts\n' > "$_ALLOW"
_DOUT=$(nightly_baseline_ship_decision "$_AF" 1 "$_BF" "$_ALLOW")
assert "NEW authored failing test → peel verdict"      "[[ \"$_DOUT\" == peel* ]]"
assert "peel lists the new authored file"              "[[ \"$_DOUT\" == *'fe-next/b.test.ts'* ]]"
# Authored fails a+b; baseline fails only a; b NOT authored → fallthrough (never peel non-authored).
printf 'fe-next/a.test.ts\nfe-next/b.test.ts\n' > "$_AF"; printf 'fe-next/a.test.ts\n' > "$_BF"; : > "$_ALLOW"
assert "NEW but non-authored failing test → fallthrough" "[ \"\$(nightly_baseline_ship_decision $_AF 1 $_BF $_ALLOW)\" = fallthrough ]"
# Baseline red (rc=1) but NO parseable test failures (failed at lint/build) → no comparable
# test baseline → fallthrough (don't ship on an undecidable baseline).
printf 'fe-next/a.test.ts\n' > "$_AF"; : > "$_BF"; : > "$_ALLOW"
assert "red baseline w/ no test-fail list → fallthrough" "[ \"\$(nightly_baseline_ship_decision $_AF 1 $_BF $_ALLOW)\" = fallthrough ]"
# No authored failing tests → nothing to compare → fallthrough.
: > "$_AF"; printf 'fe-next/a.test.ts\n' > "$_BF"; : > "$_ALLOW"
assert "no authored failing tests → fallthrough" "[ \"\$(nightly_baseline_ship_decision $_AF 1 $_BF $_ALLOW)\" = fallthrough ]"
rm -f "$_AF" "$_BF" "$_ALLOW"

echo "── gate-isolated: [locale] dynamic-route brackets parse (2026-07-23 docs-only drop-all) ──"
# The FAIL header for a Next.js dynamic route carries literal [ ] — the parser char class
# MUST include them or the token is unparseable → "no parseable offenders" → docs-only drop-all.
_BR=$(mktemp)
printf ' FAIL  app/[locale]/scrabble-alternative-online/page.test.tsx > meta > title\n' > "$_BR"
assert "parse_test_failures: [locale] test path parses (not empty)" \
  "[ \"\$(nightly_parse_test_failures $_BR)\" = 'fe-next/app/[locale]/scrabble-alternative-online/page.test.tsx' ]"
printf 'app/[locale]/foo/page.tsx(12,3): error TS2322: x\n' > "$_BR"
assert "parse_gate_failures: [locale] tsc error path parses" \
  "[ \"\$(nightly_parse_gate_failures $_BR)\" = 'fe-next/app/[locale]/foo/page.tsx' ]"
printf '[vitest-pool]: Failed to start forks worker for test files app/[locale]/bar/x.test.tsx.\n' > "$_BR"
assert "parse_worker_crashed_tests: [locale] crash path parses" \
  "[ \"\$(nightly_parse_worker_crashed_tests $_BR)\" = 'fe-next/app/[locale]/bar/x.test.tsx' ]"
rm -f "$_BR"

echo "── gate-isolated: nightly_map_test_to_authored_source (failing test → authored source) ──"
_ALLOW=$(mktemp)
printf 'fe-next/app/[locale]/scrabble-alternative-online/page.tsx\nfe-next/server/redisAdapter.ts\n' > "$_ALLOW"
assert "sibling [locale] test → authored page.tsx source" \
  "[ \"\$(nightly_map_test_to_authored_source 'fe-next/app/[locale]/scrabble-alternative-online/page.test.tsx' $_ALLOW)\" = 'fe-next/app/[locale]/scrabble-alternative-online/page.tsx' ]"
printf 'fe-next/components/foo/Bar.tsx\n' > "$_ALLOW"
assert "__tests__/ layout test → parent-dir authored source" \
  "[ \"\$(nightly_map_test_to_authored_source 'fe-next/components/foo/__tests__/Bar.test.tsx' $_ALLOW)\" = 'fe-next/components/foo/Bar.tsx' ]"
printf 'fe-next/other/unrelated.tsx\n' > "$_ALLOW"
assert "test whose source is NOT authored → empty (never peel a stray)" \
  "[ -z \"\$(nightly_map_test_to_authored_source 'fe-next/app/x/page.test.tsx' $_ALLOW)\" ]"
rm -f "$_ALLOW"

echo "── gate-isolated: 2026-07-23 incident — lane broke a committed test that's GREEN on master → peel source ──"
# EXACT shape of the drop-all night: the lane authored page.tsx (source), whose committed sibling
# test page.test.tsx now fails. The SCOPED baseline gate runs ONLY that test on clean HEAD, where
# it PASSES (master still has the keyword title) → baseline rc=0, EMPTY baseline-fail list. This is
# the real value (brc=0), NOT the brc=1 an unrelated pre-existing failure would give. Old behavior:
# `brc=0 → fallthrough` at the top → caller's docs-only drop-all of all 11 files. Fixed: brc=0 means
# the lane introduced every failure → map to the authored source and peel just it, ship the rest.
_AF=$(mktemp); _BF=$(mktemp); _ALLOW=$(mktemp)
printf 'fe-next/app/[locale]/scrabble-alternative-online/page.test.tsx\n' > "$_AF"
: > "$_BF"   # scoped baseline on clean HEAD is GREEN — our test passes on master
printf 'fe-next/app/[locale]/scrabble-alternative-online/page.tsx\nfe-next/server/redisAdapter.ts\n' > "$_ALLOW"
_DOUT=$(nightly_baseline_ship_decision "$_AF" 0 "$_BF" "$_ALLOW")   # brc=0 = the REAL 07-23 value
assert "07-23 (brc=0, HEAD green on the test): NEW [locale] test → peel verdict (was fallthrough/drop-all)" "[[ \"$_DOUT\" == peel* ]]"
assert "07-23: peel names the AUTHORED SOURCE page.tsx, not the test file" \
  "[[ \"\$(printf '%s' \"$_DOUT\" | tail -n +2)\" == 'fe-next/app/[locale]/scrabble-alternative-online/page.tsx' ]]"
assert "07-23: peel does NOT include the unrelated authored redisAdapter (only the offender's source)" \
  "[[ \"$_DOUT\" != *redisAdapter* ]]"
# Guard the reachability regression directly: brc=0 with a mappable authored source MUST NOT fallthrough.
assert "07-23 reachability: brc=0 no longer short-circuits to fallthrough when a source maps" "[[ \"$_DOUT\" != fallthrough ]]"
rm -f "$_AF" "$_BF" "$_ALLOW"

echo "── gate-isolated: nightly_parse_worker_crashed_tests (2026-07-18 false-drop fix) ──"
_WC=$(mktemp)
# A vitest worker that FAILED TO START prints NO `FAIL <path>` header — parse the crash line
# so a baseline worker-crash is treated as INCONCLUSIVE (not green), never a phantom-new failure.
printf '%s\n' \
  'stderr | Error: [vitest-pool]: Failed to start forks worker for test files /tmp/nightly-gate.XXXX/fe-next/components/adventure/__tests__/AdventureView.timerPerf.test.tsx.' \
  '✓ components/other/foo.test.ts (3)' > "$_WC"
assert "worker-start crash line → parses the crashed test path" \
  "[ \"\$(nightly_parse_worker_crashed_tests $_WC)\" = 'fe-next/components/adventure/__tests__/AdventureView.timerPerf.test.tsx' ]"
# Multiple files named in one crash line (vitest batches).
printf '[vitest-pool]: Failed to start forks worker for test files /w/fe-next/a.test.ts, /w/fe-next/b.test.ts.\n' > "$_WC"
assert "one crash line naming 2 files → parses BOTH" \
  "[ \"\$(nightly_parse_worker_crashed_tests $_WC | tr '\n' ' ')\" = 'fe-next/a.test.ts fe-next/b.test.ts ' ]"
# OOM-terminated worker (memory limit) also counts.
printf 'Worker terminated due to reaching memory limit: JS heap out of memory /w/fe-next/heavy.test.tsx\n' > "$_WC"
assert "OOM worker-terminated line → parses the test path" \
  "[ \"\$(nightly_parse_worker_crashed_tests $_WC)\" = 'fe-next/heavy.test.tsx' ]"
# No crash → nothing.
printf '✓ all good\nFAIL components/x/y.test.ts\n' > "$_WC"
assert "no worker-crash line → empty" "[ -z \"\$(nightly_parse_worker_crashed_tests $_WC)\" ]"
rm -f "$_WC"

echo "── gate-isolated: baseline-aware SHIP after worker-crash union (2026-07-18 regression) ──"
# END-TO-END reproduction of the 2026-07-18 false docs-only drop of 11 build-clean files:
# authored gate FAILS 3 pre-existing-broken adventure tests; baseline gate FAILS 2 by FAIL-line
# but its worker CRASHED on the 3rd (timerPerf) → no FAIL header. WITHOUT the union the decision
# saw timerPerf as a NEW authored failure (non-authored → neither ship nor peel → fallthrough →
# drop-all). WITH the union (as run.sh now does) timerPerf counts as failing-on-baseline → ship.
_AF=$(mktemp); _BFRAW=$(mktemp); _BOUT=$(mktemp); _ALLOW=$(mktemp)
printf 'fe-next/components/adventure/__tests__/AdventureView.integration.test.tsx\nfe-next/components/adventure/__tests__/AdventureView.music.test.tsx\nfe-next/components/adventure/__tests__/AdventureView.timerPerf.test.tsx\n' > "$_AF"
# Simulated baseline gate output: 2 real FAIL lines + a worker-start crash on timerPerf.
printf '%s\n' \
  ' FAIL  components/adventure/__tests__/AdventureView.integration.test.tsx > x' \
  ' FAIL  components/adventure/__tests__/AdventureView.music.test.tsx > y' \
  'Error: [vitest-pool]: Failed to start forks worker for test files /w/fe-next/components/adventure/__tests__/AdventureView.timerPerf.test.tsx.' > "$_BOUT"
: > "$_ALLOW"  # none authored (adventure tests are not in the nightly's authored set)
# OLD path (FAIL lines only) → fallthrough (the bug).
nightly_parse_test_failures "$_BOUT" > "$_BFRAW"
assert "WITHOUT crash-union → fallthrough (the 2026-07-18 bug)" \
  "[ \"\$(nightly_baseline_ship_decision $_AF 1 $_BFRAW $_ALLOW)\" = fallthrough ]"
# NEW path (FAIL lines UNION worker-crashes) → ship (the fix).
nightly_parse_worker_crashed_tests "$_BOUT" >> "$_BFRAW"; sort -u -o "$_BFRAW" "$_BFRAW"
assert "WITH crash-union → ship (fix: baseline worker-crash = inconclusive, not new failure)" \
  "[ \"\$(nightly_baseline_ship_decision $_AF 1 $_BFRAW $_ALLOW)\" = ship ]"
rm -f "$_AF" "$_BFRAW" "$_BOUT" "$_ALLOW"

echo "── gate-isolated: nightly_baseline_test_tokens (targeted baseline filters) ──"
# The full-suite baseline gate WEDGED on 2026-06-13 (a network integration test hung in
# the 3278-test suite → rc=3 inconclusive → misread as 'HEAD green' → docs-only DROP of
# build-clean lane code). Fix: gate clean HEAD running ONLY the authored gate's failing
# test files, passed as vitest positional (substring) filters. The failing wordHandler.*
# files touch no network, so a scoped run can't wedge → real rc=1 + FAIL lines → PROVEN
# pre-existing → ship. Tokens are basenames (path-bug-proof: the parser drops backend/'s
# segment, but a basename filter matches in whichever vitest project owns the file).
_TT=$(mktemp)
printf 'fe-next/handlers/__tests__/wordHandler.blast.test.ts\nfe-next/handlers/__tests__/wordHandler.mergedEmits.test.ts\n' > "$_TT"
_TOKENS=$(nightly_baseline_test_tokens "$_TT")
assert "tokens are basenames (dir stripped)"        "[[ \"$_TOKENS\" == *'wordHandler.blast.test.ts'* ]]"
assert "tokens include the 2nd failing file"        "[[ \"$_TOKENS\" == *'wordHandler.mergedEmits.test.ts'* ]]"
assert "tokens drop the backend/handlers path"      "[[ \"$_TOKENS\" != *'/'* ]]"
assert "tokens are space-joined on one line"        "[ \"\$(printf '%s' \"$_TOKENS\" | wc -l | tr -d ' ')\" = 0 ]"
# Empty / missing input → empty token string (caller then runs the full-suite baseline).
: > "$_TT"
assert "empty fail list → empty tokens"             "[ -z \"\$(nightly_baseline_test_tokens $_TT)\" ]"
assert "missing file → empty tokens (no crash)"     "[ -z \"\$(nightly_baseline_test_tokens /nonexistent.XXX)\" ]"
# De-dup: the same file failing under multiple describe blocks must yield ONE token.
printf 'fe-next/handlers/__tests__/wordHandler.blast.test.ts\nfe-next/handlers/__tests__/wordHandler.blast.test.ts\n' > "$_TT"
assert "duplicate paths collapse to one token"      "[ \"\$(nightly_baseline_test_tokens $_TT | tr ' ' '\n' | grep -c blast)\" = 1 ]"
rm -f "$_TT"

echo "── gate-isolated: nightly_gate_timeout_route (rc=3 inconclusive routing) ──"
# After a timed-out gate, a build-only re-gate decides: build-clean → ship (tests
# unverified, alert); build-break → peel (output now parseable); build-only also timed
# out → docs-only. This is what stops a slow-test night from dropping ALL code.
assert "build-only PASS (0) → ship"             "[ \"\$(nightly_gate_timeout_route 0)\" = ship ]"
assert "build-only FAIL (1) → peel"             "[ \"\$(nightly_gate_timeout_route 1)\" = peel ]"
assert "build-only TIMEOUT (3) → docs-only"     "[ \"\$(nightly_gate_timeout_route 3)\" = docs-only ]"
assert "build-only setup-fail (2) → docs-only"  "[ \"\$(nightly_gate_timeout_route 2)\" = docs-only ]"
assert "missing arg → docs-only (safe default)" "[ \"\$(nightly_gate_timeout_route)\" = docs-only ]"

echo "── gate-isolated: nightly_gate_has_unattributed_failures (FAIL-line parse blind spots) ──"
# The baseline-aware 'ship' verdict compares FAIL-line test files only. A code-level failure
# with NO 'FAIL <path>' line is invisible to it. On 2026-06-11 the authored growthTracking→
# isAndroid break surfaced as an Unhandled Rejection → the FAIL-line parser saw only pre-existing
# baseline-red files → 'ship' → it nearly shipped test-broken code (a coincidental build-only
# rc=3 stopped it). This detector lets the ship path refuse. CRITICAL DISCRIMINATION: a vitest
# worker OOM ALSO prints under an "Unhandled Error" header — that is infra noise, not a hidden
# authored break, and flagging it would fire on every full-suite red-master night (reverting the
# 06-02/03 baseline-red-ship fix). So a REJECTION always blocks; an ERROR blocks only when it is
# NOT a worker-OOM/crash; OOM-only inconclusiveness is left to the rc=3 timeout routing.
_UO=$(mktemp)
printf 'FAIL  components/x/__tests__/a.test.tsx > does a thing\n⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯\nError: [vitest] No "isAndroid" export is defined on the "@/utils/platform" mock.\n' > "$_UO"
assert "Unhandled Rejection (hidden authored break) → BLOCK ship (true)" "nightly_gate_has_unattributed_failures $_UO"
printf 'FAIL  components/x/__tests__/a.test.tsx\n⎯⎯⎯ Unhandled Error ⎯⎯⎯\nError: ReferenceError: foo is not defined in test setup\n' > "$_UO"
assert "Unhandled Error that is NOT a worker crash → BLOCK ship (true)" "nightly_gate_has_unattributed_failures $_UO"
# A worker OOM prints under an Unhandled Error header but is INFRA — must NOT block (preserve baseline-red ship).
printf 'Test Files  5 failed | 2638 passed\n⎯⎯⎯ Unhandled Error ⎯⎯⎯\nCaused by: Error: Worker terminated due to reaching memory limit: JS heap out of memory\n' > "$_UO"
assert "Worker terminated (OOM) → infra, NOT blocking (false)" "! nightly_gate_has_unattributed_failures $_UO"
printf "⎯⎯⎯ Unhandled Error ⎯⎯⎯\nSerialized Error: { code: 'ERR_WORKER_OUT_OF_MEMORY' }\n" > "$_UO"
assert "ERR_WORKER_OUT_OF_MEMORY → infra, NOT blocking (false)" "! nightly_gate_has_unattributed_failures $_UO"
printf 'Failed to start threads worker. Timeout waiting for worker to respond.\n' > "$_UO"
assert "Failed to start ... worker (startup crash) → infra, NOT blocking (false)" "! nightly_gate_has_unattributed_failures $_UO"
# This night's real output: BOTH an Unhandled Rejection (growthTracking) AND an OOM Unhandled Error → rejection wins → BLOCK.
printf '⎯ Unhandled Rejection ⎯\nError: [vitest] No "isAndroid" export defined on mock.\n⎯ Unhandled Error ⎯\nError: Worker terminated due to reaching memory limit\n' > "$_UO"
assert "rejection + OOM-error together (the real 06-11 case) → BLOCK (true)" "nightly_gate_has_unattributed_failures $_UO"
# A clean failure set — only real FAIL-line tests, every one attributable — does NOT block.
printf 'FAIL  components/x/__tests__/a.test.tsx > does a thing\n  AssertionError: expected 1 to be 2\nTest Files  1 failed | 2638 passed\n' > "$_UO"
assert "only attributable FAIL lines → NOT blocking (false)" "! nightly_gate_has_unattributed_failures $_UO"
: > "$_UO"
assert "empty gate output → NOT blocking (no evidence, false)" "! nightly_gate_has_unattributed_failures $_UO"
assert "missing gate output file → NOT blocking (false)" "! nightly_gate_has_unattributed_failures /nonexistent/gate.out"
rm -f "$_UO"

echo "── gate-isolated: lint-skipped re-gate still gates the AUTHORED worktree ──"
# The baseline-poison ship decision rides on run_isolated_gate <auth> 1 passing only
# when the authored set is test+build clean. Prove the skip_lint path still applies
# authored files + reflects their pass/fail (the seam stands in for the npm chain).
setup
printf 'export const v = "LANE_OK";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='grep -q LANE_OK app/lane.ts'   # authored applied → pass
run_isolated_gate "$AUTH" 1; rc=$?
assert "skip_lint re-gate PASSES when authored set is clean (test+build proxy)" "[ $rc -eq 0 ]"
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

setup
printf 'export const v = "LANE_BROKEN_TEST";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='! grep -q LANE_BROKEN_TEST app/lane.ts'   # authored breaks test → fail
run_isolated_gate "$AUTH" 1; rc=$?
assert "skip_lint re-gate FAILS when authored set breaks test/build → docs-only salvage" "[ $rc -eq 1 ]"
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

echo "── gate-isolated: nightly_parse_gate_failures (drop-and-re-gate salvage) ──"

# Realistic mixed eslint (absolute worktree path header) + tsc (relative) output,
# modelled on the real 2026-05-24 gate failure.
GOUT=$(mktemp)
cat > "$GOUT" <<'EOF'
> fe-next@0.1.0 lint
> eslint

/private/var/folders/dc/x/T/nightly-gate.XXXX.abcd/fe-next/lib/wordTower/__tests__/towerColumn.test.ts
  135:1  error  '../towerColumn' import is duplicated  no-duplicate-imports

/private/var/folders/dc/x/T/nightly-gate.XXXX.abcd/fe-next/components/wordTower/WordTowerScene.tsx
  265:6  warning  React Hook useEffect has a missing dependency

✖ 4 problems (1 error, 3 warnings)

components/landing/LandingView.tsx(231,33): error TS2322: Type '{ isAdmin: boolean; }' is not assignable.
EOF
GOT=$(nightly_parse_gate_failures "$GOUT" | tr '\n' ',')
assert "extracts eslint file (abs worktree path → repo-relative)" "[[ \"$GOT\" == *'fe-next/lib/wordTower/__tests__/towerColumn.test.ts'* ]]"
assert "extracts tsc file (relative path(line,col) → repo-relative)" "[[ \"$GOT\" == *'fe-next/components/landing/LandingView.tsx'* ]]"
assert "does not emit npm preamble / problem-count lines as files" "[[ \"$GOT\" != *'eslint'*'.js'* ]] || true"
rm -f "$GOUT"

# 2026-05-27 regression: parser dropped 27 files including node_modules/* and
# `package.js` (extension swallow of `package.json`). Lock both fixes.
NOISY=$(mktemp)
cat > "$NOISY" <<'EOF'
> fe-next@0.1.0 test
> vitest run

 FAIL  components/__tests__/PlayerView.navigation.test.tsx
  ● PlayerView › navigation › advances
    TypeError: foo is undefined
      at /private/var/folders/dc/x/T/nightly-gate.XXXX/fe-next/node_modules/happy-dom/lib/window/DetachedWindowAPI.js:42
      at /private/var/folders/dc/x/T/nightly-gate.XXXX/fe-next/node_modules/vitest/dist/chunks/base.C9_VThnT.js:101
      at /private/var/folders/dc/x/T/nightly-gate.XXXX/fe-next/components/__tests__/PlayerView.navigation.test.tsx:33

Some message referencing /private/var/folders/dc/x/T/nightly-gate.XXXX/fe-next/package.json directly.
EOF
GOTN=$(nightly_parse_gate_failures "$NOISY" | tr '\n' ',')
assert "excludes node_modules/happy-dom paths"   "[[ \"$GOTN\" != *'/node_modules/happy-dom/'* ]]"
assert "excludes node_modules/vitest paths"      "[[ \"$GOTN\" != *'/node_modules/vitest/'* ]]"
assert "does NOT match package.js (from package.json truncation)" "[[ \"$GOTN\" != *'fe-next/package.js'* ]]"
# A failing TEST file appears in vitest output only as a " FAIL <path>" header and
# in stack frames ("  at …/PlayerView.navigation.test.tsx:33") — both PROSE, not an
# eslint header. The lint/tsc parser must NOT scrape them (that was the same
# stack-frame/prose false-positive that, via Babel notes, destroyed i18n files);
# failing TEST files are surfaced by nightly_parse_test_failures + baseline salvage.
assert "does NOT scrape failing test file from vitest header/stack frame (prose)" "[[ \"$GOTN\" != *'PlayerView.navigation.test.tsx'* ]]"
rm -f "$NOISY"

# 2026-05-27 + 2026-06-05 regression: Babel emits an informational note naming the
# large translation bundles by path ("deoptimised the styling of …/fe-next/
# translations/en.js as it exceeds the max of 500KB") whenever they change. The
# old substring scrape matched that PROSE path and flagged en/es/sv.js as lint
# offenders, then drop-and-re-gate HARD-REVERTED them — destroying authored i18n
# while the real failure was an unrelated test. A lint offender is only ever an
# eslint HEADER (a whole-line path); prose-embedded paths must be ignored.
BABEL=$(mktemp)
cat > "$BABEL" <<'EOF'
> fe-next@0.1.0 build
> next build

[BABEL] Note: The code generator has deoptimised the styling of /private/var/folders/dc/x/T/nightly-gate.ABCD/fe-next/translations/en.js as it exceeds the max of 500KB.
[BABEL] Note: The code generator has deoptimised the styling of /private/var/folders/dc/x/T/nightly-gate.ABCD/fe-next/translations/es.js as it exceeds the max of 500KB.

/private/var/folders/dc/x/T/nightly-gate.ABCD/fe-next/components/blast/RealOffender.tsx
  10:5  error  'x' is not defined  no-undef
EOF
GOTB=$(nightly_parse_gate_failures "$BABEL" | tr '\n' ',')
assert "ignores Babel deoptimised-note path (en.js prose, not an eslint header)" "[[ \"$GOTB\" != *'fe-next/translations/en.js'* ]]"
assert "ignores Babel deoptimised-note path (es.js prose)"                       "[[ \"$GOTB\" != *'fe-next/translations/es.js'* ]]"
assert "still extracts the real eslint header offender"                          "[[ \"$GOTB\" == *'fe-next/components/blast/RealOffender.tsx'* ]]"
rm -f "$BABEL"

# next build (build:fast) type errors — the rc=3 build-only re-gate's output. App
# Router prints the offending file as a `./path:line:col` header on its own line
# (module-not-found surfaces the SAME way: "Type error: Cannot find module './x'").
# This is the canonical gate-timeout partial: an orphaned page importing missing
# siblings. The peel loop must name it to drop JUST it and ship the rest — without
# this, a build-break after a timeout fell to docs-only drop-all.
NEXTBUILD=$(mktemp)
cat > "$NEXTBUILD" <<'EOF'
> fe-next@0.1.0 build:fast
> next build

   ▲ Next.js 16.0.0

   Creating an optimized production build ...
Failed to compile.

./app/[locale]/juego-de-palabras-multijugador/page.tsx:5:1
Type error: Cannot find module './components/HeroAnimated' or its corresponding type declarations.

  3 | import { TopBackLink } from '@/components/navigation/TopBackLink';
  4 | import { HowToPlayCard } from '@/components/common/HowToPlayCard';
> 5 | import { HeroAnimated } from './components/HeroAnimated';
EOF
GOTNB=$(nightly_parse_gate_failures "$NEXTBUILD" | tr '\n' ',')
assert "extracts next-build type-error file (./path:line:col → fe-next/…)" "[[ \"$GOTNB\" == *'fe-next/app/[locale]/juego-de-palabras-multijugador/page.tsx'* ]]"
assert "does NOT emit the import-source prose line as a file"              "[[ \"$GOTNB\" != *'HeroAnimated'*'.tsx'* ]] || true"
rm -f "$NEXTBUILD"

# next build webpack module-not-found: an orphaned page importing a missing sibling
# trips this BEFORE the TS type-check, so there is NO `:line:col` header — the failing
# file is a bare `./path` line (in the error head + the "Import trace"). Parse it so the
# canonical gate-timeout partial is peelable, not dropped-all. Bare-path matches are
# allowlist-intersected in run.sh, so a stray prose hit is harmless.
MNF=$(mktemp)
cat > "$MNF" <<'EOF'
> fe-next@0.1.0 build:fast
> next build

Failed to compile.

./app/[locale]/juego-de-palabras-multijugador/page.tsx
Module not found: Can't resolve './components/HeroAnimated'

https://nextjs.org/docs/messages/module-not-found

Import trace for requested module:
./app/[locale]/juego-de-palabras-multijugador/page.tsx
EOF
GOTMNF=$(nightly_parse_gate_failures "$MNF" | tr '\n' ',')
assert "extracts module-not-found bare-path file (./path → fe-next/…)" "[[ \"$GOTMNF\" == *'fe-next/app/[locale]/juego-de-palabras-multijugador/page.tsx'* ]]"
assert "does NOT emit the nextjs.org docs URL as a file"               "[[ \"$GOTMNF\" != *'nextjs.org'* ]]"
rm -f "$MNF"

# Clean output → nothing to drop.
CLEAN=$(mktemp); printf '> lint\n> eslint\n\nNo problems.\n' > "$CLEAN"
assert "clean gate output → no failing files parsed" "[ -z \"\$(nightly_parse_gate_failures \"$CLEAN\")\" ]"
rm -f "$CLEAN"

# Empty/missing → no output, no error.
assert "missing file → empty, no crash" "[ -z \"\$(nightly_parse_gate_failures /nonexistent-xyz)\" ]"

echo "── gate-isolated: nightly_parse_test_failures (baseline-aware salvage) ──"
# Vitest prints a per-failure header " FAIL  <path>.test.tsx > describe > it",
# ANSI-coloured, path relative to fe-next (the gate cwd) or absolute in the worktree.
# The baseline-aware salvage compares these failing TEST files against a clean-HEAD
# baseline; the lint/tsc parser above can't see test failures, which is how a
# pre-existing red test on master sank the 2026-06-02/03 runs to docs-only.
TOUT=$(mktemp)
printf '%b' '\033[41m\033[1m FAIL \033[22m\033[49m __tests__/chatHandler.test.js\033[2m > \033[22mChat Handler > broadcasts\n' > "$TOUT"
printf '%b' ' FAIL  handlers/__tests__/friendsHandler.test.ts > friendsHandler > sends\n' >> "$TOUT"
printf '%b' ' FAIL  /private/var/folders/x/T/nightly-gate.ABCD/fe-next/components/__tests__/Foo.test.tsx > Foo > renders\n' >> "$TOUT"
printf '%b' ' FAIL  app/api/x/__tests__/route.test.ts > POST > does\n' >> "$TOUT"
printf 'AssertionError: expected foo at node_modules/vitest/dist/chunks/base.js:101\n' >> "$TOUT"
TGOT=$(nightly_parse_test_failures "$TOUT" | tr '\n' ',')
assert "parses ANSI-coloured FAIL line (relative path → fe-next/)" "[[ \"$TGOT\" == *'fe-next/__tests__/chatHandler.test.js'* ]]"
assert "parses plain FAIL line (.test.ts)"                         "[[ \"$TGOT\" == *'fe-next/handlers/__tests__/friendsHandler.test.ts'* ]]"
assert "normalises ABSOLUTE worktree path → repo-relative"        "[[ \"$TGOT\" == *'fe-next/components/__tests__/Foo.test.tsx'* ]]"
assert "parses app/api route.test.ts"                             "[[ \"$TGOT\" == *'fe-next/app/api/x/__tests__/route.test.ts'* ]]"
assert "does NOT emit node_modules/vitest as a failing test file" "[[ \"$TGOT\" != *'node_modules'* ]]"
rm -f "$TOUT"
assert "clean test output → no failing tests parsed" "[ -z \"\$(printf 'all green\\n' > /tmp/_clean_t.$$; nightly_parse_test_failures /tmp/_clean_t.$$; rm -f /tmp/_clean_t.$$)\" ]"
assert "missing file → empty, no crash"              "[ -z \"\$(nightly_parse_test_failures /nonexistent-xyz)\" ]"

echo "── gate-isolated: run_baseline_gate gates CLEAN HEAD (ignores working-tree mods) ──"
# The baseline gate must see committed HEAD, NOT the founder's working-tree edits —
# that's what lets it tell "master is already red" from "the lane broke it".
setup
# Working tree diverges from HEAD; baseline gate must see the COMMITTED value.
printf 'export const v = "WORKTREE_LANE_EDIT";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
export NIGHTLY_GATE_CMD='grep -q COMMITTED app/lane.ts && ! grep -q WORKTREE_LANE_EDIT app/lane.ts'
run_baseline_gate 0; rc=$?
assert "baseline gate PASSES gating clean HEAD (committed content, working-tree edit excluded)" "[ $rc -eq 0 ]"
assert "main tree untouched by baseline gate" "grep -q WORKTREE_LANE_EDIT \"\$PROJECT_DIR/fe-next/app/lane.ts\""
unset NIGHTLY_GATE_CMD; teardown

setup
# A pre-existing failure on HEAD itself → baseline gate FAILS (this is the signal
# that proves "master is red", licensing the ship-anyway path in run.sh).
( cd "$PROJECT_DIR" && printf 'export const broken = (\n' > fe-next/app/lane.ts && git commit -qam "red on HEAD" )
export NIGHTLY_GATE_CMD='! grep -q "broken = (" app/lane.ts'   # committed HEAD is broken → fail
run_baseline_gate 0; rc=$?
assert "baseline gate FAILS when HEAD itself is broken (red-master signal)" "[ $rc -eq 1 ]"
unset NIGHTLY_GATE_CMD; teardown

echo "── gate-isolated: toolchain error (missing tool binary) is SETUP-failed, not code-failed ──"
# 2026-07-21 false-drop: node_modules/.bin lost its eslint/vitest symlinks (concurrent
# npm installs), the CoW clone inherited the breakage, `npm run lint` died with
# "sh: eslint: command not found" (rc 127), the gate flattened it to rc=1, drop-and-re-gate
# found no offender and DROPPED 14 build-clean files. A missing-tool failure is an
# ENVIRONMENT failure (rc=2 → in-place fallback), never a content failure (rc=1 → drop).

# (a) Pure classifier — the discriminator, locked without a worktree.
TC_OUT=$(mktemp)
printf 'sh: eslint: command not found\n' > "$TC_OUT"
assert "classifier: 'command not found' → toolchain error (true)" "nightly_gate_output_is_toolchain_error \"$TC_OUT\""
printf 'sh: 1: vitest: not found\n' > "$TC_OUT"
assert "classifier: dash '<tool>: not found' → toolchain error (true)" "nightly_gate_output_is_toolchain_error \"$TC_OUT\""
printf 'app/foo.tsx(12,3): error TS2304: Cannot find name x.\n' > "$TC_OUT"
assert "classifier: a real tsc error is NOT a toolchain error (false)" "! nightly_gate_output_is_toolchain_error \"$TC_OUT\""
: > "$TC_OUT"
assert "classifier: empty output is NOT a toolchain error (false)" "! nightly_gate_output_is_toolchain_error \"$TC_OUT\""
rm -f "$TC_OUT"

# (b) End-to-end via the seam: a gate that fails with "command not found" → rc=2, code untouched.
setup
printf 'export const v = "LANE_VERSION";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='echo "sh: eslint: command not found"; exit 127'
run_isolated_gate "$AUTH"; rc=$?
assert "gate FAILING with 'command not found' returns rc=2 (setup), NOT rc=1 (drop)" "[ $rc -eq 2 ]"
assert "main tree lane file untouched on toolchain-error gate" \
  "grep -q LANE_VERSION \"\$PROJECT_DIR/fe-next/app/lane.ts\""
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

# (c) Regression guard: a REAL content failure (no command-not-found) still returns rc=1.
setup
printf 'export const v = "LANE_BROKEN";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='echo "app/lane.ts(1,1): error TS1005"; exit 1'
run_isolated_gate "$AUTH"; rc=$?
assert "a real content failure (no missing-tool signature) still returns rc=1 (peel intact)" "[ $rc -eq 1 ]"
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

echo "── gate-isolated: a native toolchain CRASH (Abort trap: 6 / SIGABRT) is INCONCLUSIVE, not code-failed ──"
# 2026-07-09 + 07-14 false-drops: `npm run build:fast` died with "Abort trap: 6" (SIGABRT,
# exit 134) under memory pressure — a NATIVE crash of the build toolchain (V8/SWC/esbuild),
# NOT lane code. The gate only special-cased 124/137, so 134 flattened to rc=1 → drop-and-
# re-gate found no offender → DROPPED a whole night to docs-only. A native crash means the
# gate did NOT complete → INCONCLUSIVE (rc=3; caller re-verifies build-only, never drops).

# (a) Pure classifier — the discriminator, locked without a worktree.
NC_OUT=$(mktemp)
printf '_: line 1: 86632 Abort trap: 6           NEXT_BUILD_DIR=.next-nightly npm run build:fast\n' > "$NC_OUT"
assert "classifier: 'Abort trap: 6' → native crash (true)" "nightly_gate_output_is_native_crash \"$NC_OUT\""
printf 'zsh: Bus error: 10  node build\n' > "$NC_OUT"
assert "classifier: 'Bus error: 10' → native crash (true)" "nightly_gate_output_is_native_crash \"$NC_OUT\""
printf 'sh: line 1: 42 Segmentation fault: 11  tsc\n' > "$NC_OUT"
assert "classifier: 'Segmentation fault: 11' → native crash (true)" "nightly_gate_output_is_native_crash \"$NC_OUT\""
printf 'app/foo.tsx(12,3): error TS2304: Cannot find name x.\n' > "$NC_OUT"
assert "classifier: a real tsc error is NOT a native crash (false)" "! nightly_gate_output_is_native_crash \"$NC_OUT\""
printf 'sh: eslint: command not found\n' > "$NC_OUT"
assert "classifier: a missing-tool line is NOT a native crash (false)" "! nightly_gate_output_is_native_crash \"$NC_OUT\""
: > "$NC_OUT"
assert "classifier: empty output is NOT a native crash (false)" "! nightly_gate_output_is_native_crash \"$NC_OUT\""
rm -f "$NC_OUT"

# (b) End-to-end via the seam: a gate that exits 134 (SIGABRT) → rc=3, code untouched.
setup
printf 'export const v = "LANE_VERSION";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='echo building; exit 134'
run_isolated_gate "$AUTH"; rc=$?
assert "gate exiting 134 (SIGABRT) returns rc=3 (inconclusive), NOT rc=1 (drop)" "[ $rc -eq 3 ]"
assert "main tree lane file untouched on native-crash gate" \
  "grep -q LANE_VERSION \"\$PROJECT_DIR/fe-next/app/lane.ts\""
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

# (c) End-to-end: npm remapped the crashed child's 134 to its own rc=1, but the output
# still carries the shell's "Abort trap: 6" crash line → string net catches it → rc=3.
setup
printf 'export const v = "LANE_VERSION";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='echo "_: line 1: 999 Abort trap: 6  npm run build:fast"; exit 1'
run_isolated_gate "$AUTH"; rc=$?
assert "gate exiting 1 but printing 'Abort trap: 6' returns rc=3 (crash string net)" "[ $rc -eq 3 ]"
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

# (d) Regression guard: a REAL content failure (exit 1, no crash signature) still returns rc=1.
setup
printf 'export const v = "LANE_BROKEN";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='echo "app/lane.ts(1,1): error TS1005"; exit 1'
run_isolated_gate "$AUTH"; rc=$?
assert "a real content failure (no crash signature) still returns rc=1 (peel intact)" "[ $rc -eq 1 ]"
unset NIGHTLY_GATE_CMD; rm -f "$AUTH"; teardown

echo
echo "gate-isolated: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
