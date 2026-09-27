#!/bin/bash
# Unit test for nightly_artifact_contract() — the Mandatory-Minimum-Artifact
# block prepended to every lane prompt so a lane NEVER produces nothing (a
# timed-out lane that wrote only this artifact still ships it; docs/ is
# gate-clean by construction). Run: bash scripts/nightly/test/artifact-contract.test.sh
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/headless.sh"

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi; }

echo "nightly_artifact_contract unit test"
out=$(nightly_artifact_contract "05" "2026-05-29")

assert "names the lane-specific artifact path" "printf '%s' \"\$out\" | grep -qF 'docs/nightly/artifacts/lane-05-2026-05-29.md'"
assert "headlines the contract"                "printf '%s' \"\$out\" | grep -q 'MANDATORY MINIMUM ARTIFACT'"
assert "instructs write-first"                 "printf '%s' \"\$out\" | grep -qi 'before any'"
assert "forbids producing nothing"             "printf '%s' \"\$out\" | grep -qi 'never exit'"
assert "lists a status field"                  "printf '%s' \"\$out\" | grep -qi 'status:'"

# Different lane id flows through to the path.
out2=$(nightly_artifact_contract "02" "2026-05-29")
assert "lane id is substituted, not hardcoded" "printf '%s' \"\$out2\" | grep -qF 'lane-02-2026-05-29.md'"

echo
echo "PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN ✓" || echo "FAILURES ✗"
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
