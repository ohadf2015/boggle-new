#!/bin/bash
# Test for compose_failure_digest() — proves a failed-but-ran night still produces
# a useful digest naming the failure + lane work. Pure string composition, no net.
# Run: bash scripts/nightly/test/failure-digest.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/failure-digest.sh"

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1));
           else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi; }

echo "── failure-digest ──"

TODAY="2026-05-22"
RUN_LOG="/tmp/run-x.log"
LANE_SUMMARY_TEXT=$'  ✅ 01-triage — 3 files\n  ⚠️  03-engagement — cap exceeded, reverted\n  ❌ 04-competitor — exit 124'
MSG=$(compose_failure_digest "Gate failed twice (lint) — all lane changes dropped.")

assert "names the date"             "printf '%s' \"\$MSG\" | grep -q '2026-05-22'"
assert "flags it did NOT ship"      "printf '%s' \"\$MSG\" | grep -q 'did NOT ship'"
assert "includes the failure reason" "printf '%s' \"\$MSG\" | grep -q 'Gate failed twice'"
assert "lists lane results (triage)" "printf '%s' \"\$MSG\" | grep -q '01-triage'"
assert "lists a reverted lane"       "printf '%s' \"\$MSG\" | grep -q 'cap exceeded'"
assert "states nothing pushed"       "printf '%s' \"\$MSG\" | grep -q 'Nothing committed or pushed'"
assert "reassures WIP intact"        "printf '%s' \"\$MSG\" | grep -q 'WIP left intact'"
assert "points to the log"           "printf '%s' \"\$MSG\" | grep -q '/tmp/run-x.log'"

# Graceful when no lane results were recorded (e.g. very early abort).
unset LANE_SUMMARY_TEXT
MSG2=$(compose_failure_digest "Lane churn 47 files > 30 sanity cap.")
assert "churn reason present"        "printf '%s' \"\$MSG2\" | grep -q 'sanity cap'"
assert "fallback when no lanes"      "printf '%s' \"\$MSG2\" | grep -q 'no lane results recorded'"

echo
echo "failure-digest: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
