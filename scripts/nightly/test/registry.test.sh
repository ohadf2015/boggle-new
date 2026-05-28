#!/bin/bash
# Test for lib/intel/registry.sh — the extensibility contract. Proves:
#   - INTEL_SOURCES is non-empty and every entry is "id:script:timeout"
#   - intel_registry_lint accepts well-formed entries, returns them
#   - a malformed entry is SKIPPED (warned), not fatal — the phase still runs
#   - every registered collector script actually exists on disk
#
# Run: bash scripts/nightly/test/registry.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

# shellcheck disable=SC1090
. "$DIR/registry.sh"

echo "registry: shape"
assert "INTEL_SOURCES non-empty"            '[ "${#INTEL_SOURCES[@]}" -gt 0 ]'
assert "every entry has 3 colon fields"     'for e in "${INTEL_SOURCES[@]}"; do n=$(awk -F: "{print NF}" <<<"$e"); [ "$n" -eq 3 ] || exit 1; done'
assert "every timeout numeric"              'for e in "${INTEL_SOURCES[@]}"; do t="${e##*:}"; [[ "$t" =~ ^[0-9]+$ ]] || exit 1; done'

echo "registry: lint passes clean set"
LINTED=$(intel_registry_lint); rc=$?
assert "lint returns 0 on clean registry"   '[ "$rc" -eq 0 ]'
assert "lint echoes every entry"            '[ "$(printf "%s\n" "$LINTED" | grep -c .)" = "${#INTEL_SOURCES[@]}" ]'

# NOTE: that every registered collect-*.sh actually exists on disk is asserted by
# run-intel.test.sh (P1c) — it's a driver-runtime invariant, not a parsing one.

echo "registry: malformed entry is skipped, not fatal"
INTEL_SOURCES=( "good:collect-posthog.sh:90" "broken-no-timeout:collect-x.sh:abc" "alsobad" )
LINTED=$(intel_registry_lint 2>/dev/null); rc=$?
assert "lint returns nonzero when bad lines" '[ "$rc" -ne 0 ]'
assert "well-formed entry still emitted"     '[ "$(printf "%s\n" "$LINTED" | grep -c "^good:")" = "1" ]'
assert "malformed entries dropped"           '[ "$(printf "%s\n" "$LINTED" | grep -c .)" = "1" ]'

echo
echo "registry: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
