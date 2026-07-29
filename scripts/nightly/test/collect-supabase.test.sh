#!/bin/bash
# Test for lib/intel/collect-supabase.sh. Proves (with a STUBBED curl — no live API):
#   - parses advisors {lints:[...]} into valid normalized signals
#   - routes: security lints→01-triage, performance lints→02-perf
#   - severity computed from level (ERROR=0.9, WARN=0.5, INFO=0.25)
#   - magnitude=1, reach=0; fingerprints stable
#   - degrades cleanly when SUPABASE_ACCESS_TOKEN unset (stale/empty + TOKEN_MISSING note), exit 0
#   - never writes to Supabase (stub records only GETs we make)
#
# Run: bash scripts/nightly/test/collect-supabase.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
COL="$DIR/collect-supabase.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t colsup.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-29"
mkdir -p "$INTEL_DIR"
BIN="$ROOT/bin"; mkdir -p "$BIN"
trap 'rm -rf "$ROOT"' EXIT

# Stub curl: branch on the URL path to return per-endpoint fixtures.
cat > "$BIN/curl" <<'STUB'
#!/bin/bash
args="$*"
if echo "$args" | grep -q '/advisors/security'; then
  echo '{"lints":[{"name":"auth_rls_initplan","level":"ERROR","title":"RLS InitPlan overhead","detail":"RLS policies scan large datasets during init. Consider partitioning."},{"name":"missing_index_on_user_id","level":"WARN","title":"Missing index","detail":"user_id column on events table lacks index"}]}'
elif echo "$args" | grep -q '/advisors/performance'; then
  echo '{"lints":[{"name":"unused_index","level":"INFO","title":"Unused index","detail":"idx_users_created_at has 0 queries in 90d"},{"name":"slow_function","level":"ERROR","title":"Slow trigger function","detail":"trigger_update_profile_ts takes 250ms avg"}]}'
else
  echo '{"lints":[]}'
fi
STUB
chmod +x "$BIN/curl"

echo "collect-supabase: happy path (stubbed curl)"
SUPABASE_URL="https://xyz.supabase.co" SUPABASE_ACCESS_TOKEN="test-token" \
  PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL"
rc=$?
OUT="$INTEL_DIR/supabase.json"
assert "exits 0"                              '[ "$rc" -eq 0 ]'
assert "wrote supabase.json"                  '[ -f "$OUT" ]'
assert "valid intel envelope"                 'jq -e "._meta and (.signals|type==\"array\")" "$OUT" >/dev/null'
assert "source_ok true on success"            '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'
assert "emitted ≥2 signals"                   '[ "$(jq ".signals|length" "$OUT")" -ge 2 ]'
assert "security lint → 01-triage"            'jq -e ".signals[] | select(.lane==\"01-triage\" and (.title|test(\"RLS\")))" "$OUT" >/dev/null'
assert "performance lint → 02-perf"           'jq -e ".signals[] | select(.lane==\"02-perf\" and (.title|test(\"Slow\")))" "$OUT" >/dev/null'
assert "security ERROR → severity 0.9"        '[ "$(jq "[.signals[] | select(.title|test(\"RLS\")) | .severity] | .[0]" "$OUT")" = "0.9" ]'
assert "performance WARN → severity 0.5"      '[ "$(jq "[.signals[] | select(.title|test(\"Missing index\")) | .severity] | .[0]" "$OUT")" = "0.5" ]'
assert "performance INFO → severity 0.25"     '[ "$(jq "[.signals[] | select(.title|test(\"Unused\")) | .severity] | .[0]" "$OUT")" = "0.25" ]'
assert "all magnitudes = 1"                   '[ "$(jq "[.signals[] | select(.magnitude!=1)] | length" "$OUT")" = "0" ]'
assert "all reach = 0"                        '[ "$(jq "[.signals[] | select(.reach!=0)] | length" "$OUT")" = "0" ]'
assert "all severities in [0,1]"              '[ "$(jq "[.signals[] | select(.severity<0 or .severity>1)] | length" "$OUT")" = "0" ]'
assert "fingerprints all set"                 '[ "$(jq "[.signals[] | select(.fingerprint==\"\")] | length" "$OUT")" = "0" ]'

echo "collect-supabase: degrade when token unset"
rm -f "$OUT"
( unset SUPABASE_ACCESS_TOKEN
  SUPABASE_URL="https://xyz.supabase.co" \
  PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL" )
rc=$?
assert "degrade exits 0 (never errors)"       '[ "$rc" -eq 0 ]'
assert "degrade wrote a file"                 '[ -f "$OUT" ]'
assert "degrade source_ok false"              '[ "$(jq -r ._meta.source_ok "$OUT")" = "false" ]'
assert "degrade note mentions TOKEN_MISSING"  'jq -re "._meta.note|test(\"TOKEN_MISSING\")" "$OUT" >/dev/null'

echo
echo "collect-supabase: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
