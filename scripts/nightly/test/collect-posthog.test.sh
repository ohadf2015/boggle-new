#!/bin/bash
# Test for lib/intel/collect-posthog.sh. Proves (with a STUBBED curl — no live API):
#   - parses HogQL {columns,results} into valid normalized signals
#   - routes: exceptions→01-triage, web-vitals LCP→02-perf, rageclicks→03-engagement
#   - severity is within [0,1]; magnitude/reach numeric; fingerprints stable
#   - degrades cleanly when POSTHOG_* unset (stale/empty + TOKEN_MISSING note), exit 0
#   - never writes to PostHog (stub records only GETs/POSTs we make)
#
# Run: bash scripts/nightly/test/collect-posthog.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
COL="$DIR/collect-posthog.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t colph.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-29"
mkdir -p "$INTEL_DIR"
BIN="$ROOT/bin"; mkdir -p "$BIN"
trap 'rm -rf "$ROOT"' EXIT

# Stub curl: branch on the request body to return per-query fixtures.
# Errors now come from the Error Tracking product (ErrorTrackingQuery → grouped,
# deduped issue objects), NOT raw $exception events. One issue is infra noise
# (ResizeObserver) and must be dropped for parity with collect-sentry.sh.
cat > "$BIN/curl" <<'STUB'
#!/bin/bash
args="$*"
if echo "$args" | grep -q 'ErrorTrackingQuery'; then
  echo '{"columns":["id","name","description","status","aggregations"],"results":[
    {"id":"iss-1","name":"RangeError","description":"Maximum call stack size exceeded","status":"active","aggregations":{"occurrences":412,"sessions":50,"users":38}},
    {"id":"iss-2","name":"Error","description":"CapacitorGameConnect plugin is not implemented","status":"active","aggregations":{"occurrences":90,"sessions":8,"users":12}},
    {"id":"iss-noise","name":"Error","description":"ResizeObserver loop completed with undelivered notifications","status":"active","aggregations":{"occurrences":999,"sessions":80,"users":90}}
  ]}'
elif echo "$args" | grep -q 'web_vitals'; then
  echo '{"columns":["url","lcp"],"results":[["/en/multiplayer",5806.0],["/he/word-tower",3200.0]]}'
elif echo "$args" | grep -q 'rageclick'; then
  echo '{"columns":["url","c"],"results":[["/en/play",57]]}'
else
  echo '{"columns":[],"results":[]}'
fi
STUB
chmod +x "$BIN/curl"

echo "collect-posthog: happy path (stubbed curl)"
PATH="$BIN:$PATH" POSTHOG_PERSONAL_API_KEY=k POSTHOG_PROJECT_ID=1 POSTHOG_HOST=https://x \
  INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL"
rc=$?
OUT="$INTEL_DIR/posthog.json"
assert "exits 0"                              '[ "$rc" -eq 0 ]'
assert "wrote posthog.json"                   '[ -f "$OUT" ]'
assert "valid intel envelope"                 'jq -e "._meta and (.signals|type==\"array\")" "$OUT" >/dev/null'
assert "source_ok true on success"            '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'
assert "emitted ≥4 signals"                   '[ "$(jq ".signals|length" "$OUT")" -ge 4 ]'
assert "an error issue → 01-triage"           'jq -e ".signals[] | select(.kind==\"error\" and .lane==\"01-triage\" and (.title|test(\"RangeError\")))" "$OUT" >/dev/null'
assert "issue reach carried (users=38)"       '[ "$(jq -r ".signals[] | select(.title|test(\"RangeError\")) | .reach" "$OUT")" = "38" ]'
assert "issue magnitude is occurrences (412)" '[ "$(jq -r ".signals[] | select(.title|test(\"RangeError\")) | .magnitude" "$OUT")" = "412" ]'
assert "issue fingerprint is issue id"        'jq -e ".signals[] | select(.title|test(\"RangeError\")) | select(.fingerprint==\"posthog-issue:iss-1\")" "$OUT" >/dev/null'
assert "issue evidence carries permalink"     'jq -e ".signals[] | select(.title|test(\"RangeError\")) | select(.evidence|test(\"error_tracking/iss-1\"))" "$OUT" >/dev/null'
assert "infra-noise issue dropped"            '[ "$(jq "[.signals[] | select(.title|test(\"ResizeObserver\"))] | length" "$OUT")" = "0" ]'
assert "web-vital LCP → 02-perf"              'jq -e ".signals[] | select(.lane==\"02-perf\" and (.title|test(\"multiplayer\")))" "$OUT" >/dev/null'
assert "rageclick → 03-engagement"            'jq -e ".signals[] | select(.lane==\"03-engagement\")" "$OUT" >/dev/null'
assert "all severities in [0,1]"              '[ "$(jq "[.signals[] | select(.severity<0 or .severity>1)] | length" "$OUT")" = "0" ]'
assert "all magnitudes numeric"               '[ "$(jq "[.signals[] | select(.magnitude|type!=\"number\")] | length" "$OUT")" = "0" ]'
assert "fingerprints all set"                 '[ "$(jq "[.signals[] | select(.fingerprint==\"\")] | length" "$OUT")" = "0" ]'

echo "collect-posthog: degrade when token unset"
rm -f "$OUT"
( unset POSTHOG_PERSONAL_API_KEY POSTHOG_PROJECT_ID
  PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL" )
rc=$?
assert "degrade exits 0 (never errors)"       '[ "$rc" -eq 0 ]'
assert "degrade wrote a file"                 '[ -f "$OUT" ]'
assert "degrade source_ok false"              '[ "$(jq -r ._meta.source_ok "$OUT")" = "false" ]'
assert "degrade note mentions TOKEN_MISSING"  'jq -re "._meta.note|test(\"TOKEN_MISSING\")" "$OUT" >/dev/null'

echo
echo "collect-posthog: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
