#!/bin/bash
# Test for lib/restore-queue.sh — the dropped-work requeue ledger. Proves:
#   - append writes one valid ndjson entry with tag/files/backup/reason
#   - pending lists an appended entry
#   - a {"resolve":"<tag>"} line removes that entry from pending
#   - pending on a missing file is empty + exits 0 (never blocks a run)
#   - malformed lines are skipped, not fatal
#
# Run: bash scripts/nightly/test/restore-queue.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib" && pwd)"
# shellcheck disable=SC1091
. "$DIR/restore-queue.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t restoreq.XXXXXX)
Q="$ROOT/restore-queue.ndjson"
trap 'rm -rf "$ROOT"' EXIT

FILES="$ROOT/files.list"
printf '%s\n' "fe-next/components/A.tsx" "fe-next/hooks/useB.ts" > "$FILES"

echo "restore-queue: append"
restore_queue_append "$Q" "20260703-010000" "$FILES" "/logs/dropped-20260703-010000" "peel: tsc error TS2345"
assert "queue file created"        '[ -s "$Q" ]'
assert "entry is valid json"       'tail -1 "$Q" | jq -e . >/dev/null'
assert "entry has tag"             'tail -1 "$Q" | jq -re .tag | grep -q 20260703-010000'
assert "entry lists both files"    'tail -1 "$Q" | jq -re ".files|length" | grep -qx 2'
assert "entry has backup dir"      'tail -1 "$Q" | jq -re .backup | grep -q dropped-20260703'
assert "entry has reason"          'tail -1 "$Q" | jq -re .reason | grep -q TS2345'

echo "restore-queue: pending"
OUT=$(restore_queue_pending "$Q")
assert "pending lists the entry"   'echo "$OUT" | jq -re .tag | grep -q 20260703-010000'
assert "pending count is 1"        '[ "$(echo "$OUT" | grep -c .)" = "1" ]'

echo "restore-queue: resolve removes from pending"
echo '{"resolve":"20260703-010000","date":"2026-07-04"}' >> "$Q"
OUT=$(restore_queue_pending "$Q")
assert "resolved entry not pending" '[ -z "$OUT" ]'

echo "restore-queue: robustness"
OUT=$(restore_queue_pending "$ROOT/nonexistent.ndjson"); rc=$?
assert "missing file → empty"       '[ -z "$OUT" ]'
assert "missing file → exit 0"      '[ "$rc" = "0" ]'
echo 'not json at all' >> "$Q"
restore_queue_append "$Q" "20260704-010000" "$FILES" "/logs/dropped-20260704-010000" "salvage"
OUT=$(restore_queue_pending "$Q")
assert "malformed line skipped, new entry pending" 'echo "$OUT" | jq -re .tag | grep -q 20260704-010000'
assert "still exactly 1 pending"    '[ "$(echo "$OUT" | grep -c .)" = "1" ]'

echo
echo "restore-queue: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
