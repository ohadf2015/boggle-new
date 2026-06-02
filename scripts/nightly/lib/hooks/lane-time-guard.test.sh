#!/bin/bash
# TDD for lane-time-guard.sh — the PreToolUse hook that mechanically enforces the
# nightly lane time-budget + file-scope cap (the root-cause fix for the recurring
# exit-124 timeout epidemic: prompt text could not make a clock-blind agent stop).
#
# Run: bash scripts/nightly/lib/hooks/lane-time-guard.test.sh
# Pure bash (no framework) so it runs in the nightly's gate and on a bare shell.
set -uo pipefail

HOOK="$(dirname "$0")/lane-time-guard.sh"
PASS=0
FAIL=0

# run_hook <tool_json> — feeds JSON on stdin, echoes the hook's stdout, sets RC.
run_hook() {
  OUT=$(printf '%s' "$1" | bash "$HOOK" 2>/dev/null)
  RC=$?
}

assert_contains() { # <haystack> <needle> <label>
  if printf '%s' "$1" | grep -qF "$2"; then
    PASS=$((PASS+1)); echo "  ✓ $3"
  else
    FAIL=$((FAIL+1)); echo "  ✗ $3"; echo "    expected to contain: $2"; echo "    got: $1"
  fi
}
assert_not_contains() { # <haystack> <needle> <label>
  if printf '%s' "$1" | grep -qF "$2"; then
    FAIL=$((FAIL+1)); echo "  ✗ $3"; echo "    expected NOT to contain: $2"; echo "    got: $1"
  else
    PASS=$((PASS+1)); echo "  ✓ $3"
  fi
}
assert_rc() { # <expected> <label>
  if [ "$RC" = "$1" ]; then PASS=$((PASS+1)); echo "  ✓ $2"; else FAIL=$((FAIL+1)); echo "  ✗ $2 (rc=$RC want $1)"; fi
}

# Fixed clock anchors (epoch seconds). START=1000000000 (≈2001), FINALIZE=+720s,
# HARD=+900s — i.e. a 15-min cap with finalize at 80%.
START=1000000000
FINALIZE=1000000720
HARD=1000000900

new_env() { # writes a fresh deadline + fileset, exports the env for one case
  DEAD=$(mktemp); printf '%s %s %s\n' "$START" "$FINALIZE" "$HARD" > "$DEAD"
  FSET=$(mktemp); : > "$FSET"
  export LEXI_LANE_DEADLINE_FILE="$DEAD" LEXI_LANE_FILESET_FILE="$FSET" LEXI_LANE_FILE_CAP="${1:-8}"
}

EDIT_A='{"tool_name":"Edit","tool_input":{"file_path":"/repo/fe-next/components/A.tsx"}}'
EDIT_B='{"tool_name":"Edit","tool_input":{"file_path":"/repo/fe-next/components/B.tsx"}}'
BASH_T='{"tool_name":"Bash","tool_input":{"command":"npx tsc --noEmit"}}'

echo "TEST 1: no deadline file → inert no-op (allow, empty output)"
unset LEXI_LANE_DEADLINE_FILE LEXI_LANE_FILESET_FILE LEXI_FAKE_NOW LEXI_LANE_FILE_CAP 2>/dev/null || true
run_hook "$EDIT_A"
assert_rc 0 "exits 0"
assert_not_contains "$OUT" "deny" "no deny"
assert_not_contains "$OUT" "additionalContext" "no context injected"

echo "TEST 2: before finalize, new file under cap → allow + time context, records file"
new_env 8; export LEXI_FAKE_NOW=$((START+60))
run_hook "$EDIT_A"
assert_rc 0 "exits 0"
assert_not_contains "$OUT" '"permissionDecision":"deny"' "not denied"
assert_contains "$OUT" "additionalContext" "context injected"
assert_contains "$OUT" "until finalize" "mentions finalize countdown"
assert_contains "$(cat "$LEXI_LANE_FILESET_FILE")" "A.tsx" "file recorded in working set"

echo "TEST 3: after finalize cutoff, NEW file → DENY"
new_env 8; export LEXI_FAKE_NOW=$((FINALIZE+30))
run_hook "$EDIT_B"
assert_contains "$OUT" '"permissionDecision":"deny"' "new file denied after finalize"
assert_contains "$OUT" "cutoff" "deny reason mentions the cutoff"

echo "TEST 4: after finalize cutoff, EXISTING in-flight file → ALLOW (finish it)"
new_env 8; export LEXI_FAKE_NOW=$((FINALIZE+30))
printf '/repo/fe-next/components/A.tsx\n' > "$LEXI_LANE_FILESET_FILE"
run_hook "$EDIT_A"
assert_not_contains "$OUT" '"permissionDecision":"deny"' "in-flight file NOT denied"
assert_contains "$OUT" "additionalContext" "still nudged to finish+end"

echo "TEST 5: after HARD limit, any edit → DENY (stop now)"
new_env 8; export LEXI_FAKE_NOW=$((HARD+5))
printf '/repo/fe-next/components/A.tsx\n' > "$LEXI_LANE_FILESET_FILE"
run_hook "$EDIT_A"
assert_contains "$OUT" '"permissionDecision":"deny"' "denied past hard limit"
assert_contains "$OUT" "END" "tells agent to END"

echo "TEST 6: before finalize but at file cap, NEW file → DENY (scope cap)"
new_env 2; export LEXI_FAKE_NOW=$((START+60))
printf '/repo/fe-next/x.tsx\n/repo/fe-next/y.tsx\n' > "$LEXI_LANE_FILESET_FILE"
run_hook "$EDIT_B"
assert_contains "$OUT" '"permissionDecision":"deny"' "new file denied at cap"
assert_contains "$OUT" "cap" "deny reason mentions cap"

echo "TEST 7: before finalize at cap, EXISTING file → ALLOW (finish what's open)"
new_env 2; export LEXI_FAKE_NOW=$((START+60))
printf '/repo/fe-next/x.tsx\n/repo/fe-next/y.tsx\n' > "$LEXI_LANE_FILESET_FILE"
run_hook '{"tool_name":"Edit","tool_input":{"file_path":"/repo/fe-next/x.tsx"}}'
assert_not_contains "$OUT" '"permissionDecision":"deny"' "existing file allowed even at cap"

echo "TEST 8: Bash after finalize → allowed (verify/revert), with wrap-up context"
new_env 8; export LEXI_FAKE_NOW=$((FINALIZE+30))
run_hook "$BASH_T"
assert_not_contains "$OUT" '"permissionDecision":"deny"' "Bash never denied (needs git/tsc)"
assert_contains "$OUT" "additionalContext" "Bash gets wrap-up context after finalize"

echo "TEST 9: docs/ artifact write is NEVER blocked (the 'never give up' floor)"
new_env 2; export LEXI_FAKE_NOW=$((HARD+5))   # past even the hard limit + at cap
printf '/repo/fe-next/x.tsx\n/repo/fe-next/y.tsx\n' > "$LEXI_LANE_FILESET_FILE"
run_hook '{"tool_name":"Write","tool_input":{"file_path":"/repo/docs/nightly/artifacts/lane-08-2026-06-02.md"}}'
assert_not_contains "$OUT" '"permissionDecision":"deny"' "artifact/docs write allowed past hard limit + at cap"
assert_contains "$OUT" "additionalContext" "still gets a wrap-up nudge"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" = "0" ]
