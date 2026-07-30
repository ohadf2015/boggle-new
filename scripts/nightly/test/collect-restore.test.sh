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

echo "collect-restore: age escalation (fresh vs stale)"
Q2="$ROOT/restore-queue-age.ndjson"
TODAY=$(date +%Y-%m-%d)
OLD=$(date -j -v-5d +%Y-%m-%d 2>/dev/null || date -d "5 days ago" +%Y-%m-%d 2>/dev/null || echo "2000-01-01")
cat > "$Q2" <<NDJSON
{"tag":"fresh-tag","date":"$TODAY","files":["fe-next/f.tsx"],"backup":"/logs/salvaged-code-fresh","reason":"docs-only salvage: gate failed"}
{"tag":"stale-tag","date":"$OLD","files":["fe-next/s.tsx"],"backup":"/logs/salvaged-code-stale","reason":"docs-only salvage: gate failed"}
NDJSON
rm -f "$OUT"
RESTORE_QUEUE_FILE="$Q2" bash "$DIR/collect-restore.sh" >/dev/null 2>&1
assert "fresh entry stays severity 0.95"  '[ "$(jq -r ".signals[] | select(.fingerprint==\"restore:fresh-tag\") | .severity" "$OUT")" = "0.95" ]'
assert "fresh title not marked STALE"      '! jq -re ".signals[] | select(.fingerprint==\"restore:fresh-tag\") | .title" "$OUT" | grep -q "STALE"'
assert "stale entry escalated to 0.99"     '[ "$(jq -r ".signals[] | select(.fingerprint==\"restore:stale-tag\") | .severity" "$OUT")" = "0.99" ]'
assert "stale title marked STALE"          'jq -re ".signals[] | select(.fingerprint==\"restore:stale-tag\") | .title" "$OUT" | grep -q "STALE RESTORE"'
assert "stale evidence flags Class 4"      'jq -re ".signals[] | select(.fingerprint==\"restore:stale-tag\") | .evidence" "$OUT" | grep -q "Class 4"'

echo "collect-restore: missing queue file"
rm -f "$OUT"
RESTORE_QUEUE_FILE="$ROOT/none.ndjson" bash "$DIR/collect-restore.sh" >/dev/null 2>&1; rc=$?
assert "exits 0"                     '[ "$rc" = "0" ]'
assert "empty envelope written"      '[ "$(jq ".signals|length" "$OUT")" = "0" ]'

echo
echo "collect-restore: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
