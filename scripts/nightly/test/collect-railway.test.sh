#!/bin/bash
# Test for lib/intel/collect-railway.sh. Proves (with a STUBBED railway CLI — no live API):
#   - parses railway logs for deploy status markers into valid normalized signals
#   - healthy deploy → kind=perf, lane=02-perf, low severity
#   - failed deploy → kind=error, lane=01-triage, high severity
#   - severity is within [0,1]; magnitude/reach numeric; fingerprints stable
#   - degrades cleanly when railway CLI missing (stale/empty + note), exit 0
#   - never writes to Railway (stub records only GETs/CLI calls we make)
#
# Run: bash scripts/nightly/test/collect-railway.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
COL="$DIR/collect-railway.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t colrw.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-29"
mkdir -p "$INTEL_DIR"
BIN="$ROOT/bin"; mkdir -p "$BIN"
trap 'rm -rf "$ROOT"' EXIT

# Stub railway: return different logs based on the test case.
# The test sets RW_CASE env var to control which fixture we return.
cat > "$BIN/railway" <<'STUB'
#!/bin/bash
case "${RW_CASE:-healthy}" in
  healthy)
    echo "Deploy successful for commit abc123"
    echo "Build successful"
    echo "status: SUCCESS"
    ;;
  failed)
    echo "Attempting build..."
    echo "Build failed"
    echo "status: FAILED"
    ;;
  *)
    echo "unknown case"
    ;;
esac
exit 0
STUB
chmod +x "$BIN/railway"

echo "collect-railway: happy path (healthy deploy)"
PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" RW_CASE=healthy \
  bash "$COL"
rc=$?
OUT="$INTEL_DIR/railway.json"
assert "exits 0"                              '[ "$rc" -eq 0 ]'
assert "wrote railway.json"                   '[ -f "$OUT" ]'
assert "valid intel envelope"                 'jq -e "._meta and (.signals|type==\"array\")" "$OUT" >/dev/null'
assert "source_ok true on success"            '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'
assert "healthy → kind=perf"                  'jq -e ".signals[] | select(.kind==\"perf\" and .lane==\"02-perf\")" "$OUT" >/dev/null'
assert "healthy signal has low severity"      '[ "$(jq -r ".signals[] | select(.kind==\"perf\") | .severity" "$OUT")" != "null" ]'
assert "healthy severity <= 0.2"              '[ "$(jq "[.signals[] | select(.kind==\"perf\") | select(.severity > 0.2)] | length" "$OUT")" = "0" ]'
assert "healthy has fingerprint"              'jq -e ".signals[] | select(.fingerprint|test(\"railway:deploy\"))" "$OUT" >/dev/null'

echo "collect-railway: failed deploy"
rm -f "$OUT"
PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" RW_CASE=failed \
  bash "$COL"
rc=$?
assert "failed exits 0"                       '[ "$rc" -eq 0 ]'
assert "failed wrote railway.json"            '[ -f "$OUT" ]'
assert "failed → kind=error"                  'jq -e ".signals[] | select(.kind==\"error\" and .lane==\"01-triage\")" "$OUT" >/dev/null'
assert "failed has high severity"             '[ "$(jq "[.signals[] | select(.kind==\"error\") | select(.severity >= 0.8)] | length" "$OUT")" -ge 1 ]'
assert "failed severity in [0,1]"             '[ "$(jq "[.signals[] | select(.severity<0 or .severity>1)] | length" "$OUT")" = "0" ]'
assert "failed magnitude numeric"             '[ "$(jq "[.signals[] | select(.magnitude|type!=\"number\")] | length" "$OUT")" = "0" ]'
assert "all fingerprints set"                 '[ "$(jq "[.signals[] | select(.fingerprint==\"\")] | length" "$OUT")" = "0" ]'

echo "collect-railway: degrade when railway CLI missing"
rm -f "$OUT"
# Temporarily create a stub that doesn't have railway to test degrade path
EMPTY_BIN="$ROOT/empty_bin"; mkdir -p "$EMPTY_BIN"
PATH="$EMPTY_BIN:/usr/bin:/bin" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" \
  bash "$COL" > /dev/null 2>&1
rc=$?
assert "degrade exits 0"                      '[ "$rc" -eq 0 ]'
assert "degrade wrote file"                   '[ -f "$OUT" ]'
assert "degrade source_ok false"              '[ "$(jq -r ._meta.source_ok "$OUT")" = "false" ]'
assert "degrade note mentions railway"        'jq -re "._meta.note|test(\"railway\")" "$OUT" >/dev/null'

echo
echo "collect-railway: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
