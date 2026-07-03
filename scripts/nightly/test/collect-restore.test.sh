#!/bin/bash
# Test for lib/intel/collect-restore.sh — pending restore-queue entries → intel
# signals. Proves:
#   - one signal per pending entry, routed to 01-triage, top severity
#   - resolved entries emit nothing
#   - evidence carries the restore command + backup dir
#   - missing queue file → valid empty envelope (never fails Phase 0)
#
# Run: bash scripts/nightly/test/collect-restore.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t colrestore.XXXXXX)
export INTEL_ROOT="$ROOT/intel" INTEL_DIR="$ROOT/intel/2026-07-03"
mkdir -p "$INTEL_DIR"
Q="$ROOT/restore-queue.ndjson"
trap 'rm -rf "$ROOT"' EXIT

cat > "$Q" <<'NDJSON'
{"tag":"20260702-010005","date":"2026-07-02","files":["fe-next/components/A.tsx","fe-next/hooks/useB.ts"],"backup":"/logs/salvaged-code-20260702-010005","reason":"docs-only salvage: gate failed"}
{"tag":"20260701-010001","date":"2026-07-01","files":["fe-next/x.ts"],"backup":"/logs/dropped-20260701-010001","reason":"peel: error TS2345"}
{"resolve":"20260701-010001","date":"2026-07-02"}
NDJSON

echo "collect-restore: pending → signals"
RESTORE_QUEUE_FILE="$Q" bash "$DIR/collect-restore.sh" >/dev/null 2>&1
OUT="$INTEL_DIR/restore.json"
assert "envelope written"            '[ -f "$OUT" ] && jq -e ._meta "$OUT" >/dev/null'
assert "exactly 1 signal (resolved excluded)" '[ "$(jq ".signals|length" "$OUT")" = "1" ]'
assert "routed to 01-triage"         'jq -re ".signals[0].lane" "$OUT" | grep -qx 01-triage'
assert "top severity"                '[ "$(jq ".signals[0].severity >= 0.9" "$OUT")" = "true" ]'
assert "title names the drop"        'jq -re ".signals[0].title" "$OUT" | grep -qi "restore"'
assert "evidence has restore cmd"    'jq -re ".signals[0].evidence" "$OUT" | grep -q "restore-salvaged-code.sh 20260702-010005"'
assert "evidence has backup dir"     'jq -re ".signals[0].evidence" "$OUT" | grep -q "salvaged-code-20260702"'
assert "fingerprint stable"          'jq -re ".signals[0].fingerprint" "$OUT" | grep -qx "restore:20260702-010005"'

echo "collect-restore: missing queue file"
rm -f "$OUT"
RESTORE_QUEUE_FILE="$ROOT/none.ndjson" bash "$DIR/collect-restore.sh" >/dev/null 2>&1; rc=$?
assert "exits 0"                     '[ "$rc" = "0" ]'
assert "empty envelope written"      '[ "$(jq ".signals|length" "$OUT")" = "0" ]'

echo
echo "collect-restore: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
