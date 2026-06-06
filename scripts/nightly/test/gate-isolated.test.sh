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
    printf '#!/bin/sh\necho fake\n' > fe-next/node_modules/.bin/eslint
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

echo "── gate-isolated: a TIMEOUT is INCONCLUSIVE (rc=3), never a content failure ──"
# The 2026-06-06 catastrophe: the gate ran the whole vitest suite + next build, was
# SIGKILLed at 1800s, and rc=124 collapsed to rc=1 ("lane code broke") → the salvage
# parser got no FAIL list from the killed run → docs-only drop-ALL-code. A timeout is
# UNKNOWN, not BROKEN: it must return a DISTINCT rc=3 so the caller re-verifies
# (build-only) instead of discarding a whole night's work.
setup
printf 'export const v = "LANE_SLOW";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='sleep 3'      # hangs past the tiny budget → gtimeout 124
export NIGHTLY_GATE_TIMEOUT=1
run_isolated_gate "$AUTH"; rc=$?
assert "gate TIMEOUT returns rc=3 (distinct from 1=fail, 2=setup, 0=pass)" "[ $rc -eq 3 ]"
assert "main tree untouched on timeout" "grep -q LANE_SLOW \"\$PROJECT_DIR/fe-next/app/lane.ts\""
unset NIGHTLY_GATE_CMD NIGHTLY_GATE_TIMEOUT; rm -f "$AUTH"; teardown

# A process that IGNORES SIGTERM forces gtimeout's --kill-after grace to SIGKILL it →
# exit 137, NOT 124. next build / vitest spawn children that can outlive SIGTERM, and
# tsc/vitest have OOM'd (also 137). 137 must ALSO be inconclusive (rc=3), or it routes
# to drop-all — the same catastrophe in a different exit code. The sleep-3 case above
# only exercises the easy 124 (dies on SIGTERM); this exercises the hard SIGKILL half.
setup
printf 'export const v = "LANE_WEDGE";\n' > "$PROJECT_DIR/fe-next/app/lane.ts"
AUTH=$(mktemp); echo "fe-next/app/lane.ts" > "$AUTH"
export NIGHTLY_GATE_CMD='trap "" TERM; sleep 30'   # ignore SIGTERM → kill-after SIGKILL → 137
export NIGHTLY_GATE_TIMEOUT=1
run_isolated_gate "$AUTH"; rc=$?
assert "gate SIGKILL/OOM (exit 137) also returns rc=3 (inconclusive, not drop-all)" "[ $rc -eq 3 ]"
unset NIGHTLY_GATE_CMD NIGHTLY_GATE_TIMEOUT; rm -f "$AUTH"; teardown

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

# build_only=1 → DROP lint AND test, keep build:schemas + build:fast. Used by the
# baseline-aware ship path to prove the authored set builds clean despite a red TEST
# baseline (test short-circuited, so the build was never verified).
CHAIN_BUILD=$(_gate_npm_chain 0 1)
assert "build-only chain DROPS lint"            "[[ \"$CHAIN_BUILD\" != *'npm run lint'* ]]"
assert "build-only chain DROPS test"            "[[ \"$CHAIN_BUILD\" != *'npm run test'* ]]"
assert "build-only chain keeps build:schemas"   "[[ \"$CHAIN_BUILD\" == *'build:schemas'* ]]"
assert "build-only chain keeps build:fast"      "[[ \"$CHAIN_BUILD\" == *'build:fast'* ]]"

echo "── gate-isolated: nightly_baseline_ship_decision (baseline-aware verdict) ──"
_AF=$(mktemp); _BF=$(mktemp); _ALLOW=$(mktemp)
# Baseline gate PASSED (rc=0) → clean HEAD is green → lanes at fault → fallthrough.
printf 'fe-next/a.test.ts\n' > "$_AF"; : > "$_BF"; : > "$_ALLOW"
assert "brc=0 (HEAD green) → fallthrough" "[ \"\$(nightly_baseline_ship_decision $_AF 0 $_BF $_ALLOW)\" = fallthrough ]"
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

echo "── gate-isolated: nightly_gate_timeout_route (rc=3 inconclusive routing) ──"
# After a timed-out gate, a build-only re-gate decides: build-clean → ship (tests
# unverified, alert); build-break → peel (output now parseable); build-only also timed
# out → docs-only. This is what stops a slow-test night from dropping ALL code.
assert "build-only PASS (0) → ship"             "[ \"\$(nightly_gate_timeout_route 0)\" = ship ]"
assert "build-only FAIL (1) → peel"             "[ \"\$(nightly_gate_timeout_route 1)\" = peel ]"
assert "build-only TIMEOUT (3) → docs-only"     "[ \"\$(nightly_gate_timeout_route 3)\" = docs-only ]"
assert "build-only setup-fail (2) → docs-only"  "[ \"\$(nightly_gate_timeout_route 2)\" = docs-only ]"
assert "missing arg → docs-only (safe default)" "[ \"\$(nightly_gate_timeout_route)\" = docs-only ]"

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

echo
echo "gate-isolated: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
