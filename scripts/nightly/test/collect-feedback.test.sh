#!/bin/bash
# Test for lib/intel/collect-feedback.sh. Proves (with a STUBBED curl — no live API):
#   - parses PostHog sentiment {columns,results} into valid normalized signals (lane 03-engagement)
#   - parses Supabase bug reports into valid normalized signals (lane 01-triage)
#   - routes sentiment→03-engagement with bad_ratio severity, reports→01-triage with count severity
#   - magnitude/reach numeric; severity in [0,1]; fingerprints stable
#   - degrades cleanly when NEITHER PostHog NOR Supabase keys are set (stale/empty + note), exit 0
#   - never writes to PostHog or Supabase (stub records only GETs/POSTs we make)
#
# Run: bash scripts/nightly/test/collect-feedback.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
COL="$DIR/collect-feedback.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t colfb.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-29"
mkdir -p "$INTEL_DIR"
BIN="$ROOT/bin"; mkdir -p "$BIN"
trap 'rm -rf "$ROOT"' EXIT

# Stub curl: branch on the URL to return per-API fixtures.
cat > "$BIN/curl" <<'STUB'
#!/bin/bash
args="$*"
if echo "$args" | grep -q '/query/'; then
  # PostHog HogQL sentiment query
  echo '{"columns":["surface","count","avg_rating","bad","ok","great"],"results":[["mp_round",120,2.4,15,40,65],["singleplayer",85,1.8,35,25,25]]}'
elif echo "$args" | grep -q 'feedback_reports'; then
  # Supabase REST feedback_reports query
  echo '[{"created_at":"2026-05-28T14:30:00Z","locale":"en","page":"/en/word-tower","message":"Tower sometimes lags when picking words"},{"created_at":"2026-05-27T10:15:00Z","locale":"he","page":"/he/multiplayer","message":"Cannot join room after disconnect"}]'
else
  echo '{"results":[]}'
fi
STUB
chmod +x "$BIN/curl"

echo "collect-feedback: happy path (stubbed curl)"
PATH="$BIN:$PATH" POSTHOG_PERSONAL_API_KEY=k POSTHOG_PROJECT_ID=1 POSTHOG_HOST=https://x \
  SUPABASE_URL=https://x.supabase.co SUPABASE_SERVICE_ROLE_KEY=k \
  INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL"
rc=$?
OUT="$INTEL_DIR/feedback.json"
assert "exits 0"                              '[ "$rc" -eq 0 ]'
assert "wrote feedback.json"                  '[ -f "$OUT" ]'
assert "valid intel envelope"                 'jq -e "._meta and (.signals|type==\"array\")" "$OUT" >/dev/null'
assert "source_ok true on success"            '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'
assert "emitted ≥2 signals"                   '[ "$(jq ".signals|length" "$OUT")" -ge 2 ]'
assert "sentiment signal exists"              'jq -e ".signals[] | select(.lane==\"03-engagement\")" "$OUT" >/dev/null'
assert "sentiment → 03-engagement"            'jq -e ".signals[] | select(.kind==\"feedback\" and .lane==\"03-engagement\" and (.fingerprint|test(\"sentiment\")))" "$OUT" >/dev/null'
assert "report signal exists"                 'jq -e ".signals[] | select(.lane==\"01-triage\")" "$OUT" >/dev/null'
assert "report → 01-triage"                   'jq -e ".signals[] | select(.kind==\"feedback\" and .lane==\"01-triage\" and (.fingerprint|test(\"report\")))" "$OUT" >/dev/null'
assert "sentiment magnitudes numeric"         '[ "$(jq "[.signals[] | select(.fingerprint|test(\"sentiment\")) | select(.magnitude|type!=\"number\")] | length" "$OUT")" = "0" ]'
assert "report magnitude numeric"             '[ "$(jq "[.signals[] | select(.fingerprint|test(\"report\")) | select(.magnitude|type!=\"number\")] | length" "$OUT")" = "0" ]'
assert "all severities in [0,1]"              '[ "$(jq "[.signals[] | select(.severity<0 or .severity>1)] | length" "$OUT")" = "0" ]'
assert "sentiment reach > 0"                  '[ "$(jq ".signals[] | select(.fingerprint|test(\"sentiment\")) | .reach" "$OUT" | head -1)" -gt 0 ]'
assert "report reach > 0"                     '[ "$(jq ".signals[] | select(.fingerprint|test(\"report\")) | .reach" "$OUT")" -gt 0 ]'
assert "fingerprints include source"          'jq -e ".signals[] | select(.fingerprint|test(\"^feedback:\"))" "$OUT" >/dev/null'

echo "collect-feedback: degrade when BOTH keys unset"
rm -f "$OUT"
( unset POSTHOG_PERSONAL_API_KEY POSTHOG_PROJECT_ID SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
  PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL" )
rc=$?
assert "degrade exits 0 (never errors)"       '[ "$rc" -eq 0 ]'
assert "degrade wrote a file"                 '[ -f "$OUT" ]'
assert "degrade source_ok false"              '[ "$(jq -r ._meta.source_ok "$OUT")" = "false" ]'
assert "degrade note mentions unavailable"   'jq -re "._meta.note|test(\"unavailable|missing\")" "$OUT" >/dev/null'

echo "collect-feedback: partial (only PostHog)"
rm -f "$OUT"
( unset SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
  PATH="$BIN:$PATH" POSTHOG_PERSONAL_API_KEY=k POSTHOG_PROJECT_ID=1 POSTHOG_HOST=https://x \
  INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL" )
rc=$?
assert "partial PostHog exits 0"              '[ "$rc" -eq 0 ]'
assert "partial PostHog has sentiment"        'jq -e ".signals[] | select(.fingerprint|test(\"sentiment\"))" "$OUT" >/dev/null'
assert "partial PostHog source_ok true"       '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'

echo "collect-feedback: partial (only Supabase)"
rm -f "$OUT"
( unset POSTHOG_PERSONAL_API_KEY POSTHOG_PROJECT_ID POSTHOG_HOST
  PATH="$BIN:$PATH" SUPABASE_URL=https://x.supabase.co SUPABASE_SERVICE_ROLE_KEY=k \
  INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL" )
rc=$?
assert "partial Supabase exits 0"             '[ "$rc" -eq 0 ]'
assert "partial Supabase has report"          'jq -e ".signals[] | select(.fingerprint|test(\"report\"))" "$OUT" >/dev/null'
assert "partial Supabase source_ok true"      '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'

echo
echo "collect-feedback: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
