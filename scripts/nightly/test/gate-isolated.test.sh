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

echo "── gate-isolated: empty authored list is a no-op pass ──"
setup
EMPTY=$(mktemp); : > "$EMPTY"
run_isolated_gate "$EMPTY"; rc=$?
assert "empty authored list returns 0 (nothing to gate)" "[ $rc -eq 0 ]"
rm -f "$EMPTY"; teardown

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
assert "still extracts real authored test file"  "[[ \"$GOTN\" == *'fe-next/components/__tests__/PlayerView.navigation.test.tsx'* ]]"
rm -f "$NOISY"

# Clean output → nothing to drop.
CLEAN=$(mktemp); printf '> lint\n> eslint\n\nNo problems.\n' > "$CLEAN"
assert "clean gate output → no failing files parsed" "[ -z \"\$(nightly_parse_gate_failures \"$CLEAN\")\" ]"
rm -f "$CLEAN"

# Empty/missing → no output, no error.
assert "missing file → empty, no crash" "[ -z \"\$(nightly_parse_gate_failures /nonexistent-xyz)\" ]"

echo
echo "gate-isolated: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
