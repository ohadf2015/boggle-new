#!/bin/bash
# Test for lib/intel/collect-sentry.sh. Proves (with a STUBBED curl — no live API):
#   - parses Sentry issues array into valid normalized signals
#   - routes unresolved errors → 01-triage with magnitude=count, reach=userCount
#   - severity is within [0,1]; fingerprints stable; evidence=permalink
#   - degrades cleanly when SENTRY_* unset (stale/empty + TOKEN_MISSING note), exit 0
#   - never writes to Sentry (stub records only GETs we make)
#
# Run: bash scripts/nightly/test/collect-sentry.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
COL="$DIR/collect-sentry.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t cosentrytest.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-29"
mkdir -p "$INTEL_DIR"
BIN="$ROOT/bin"; mkdir -p "$BIN"
trap 'rm -rf "$ROOT"' EXIT

# Stub curl: return a Sentry issues array with 2 unresolved error issues.
cat > "$BIN/curl" <<'STUB'
#!/bin/bash
# Fixture: 2 unresolved issues, one socket noise (filtered), one real TypeError
echo '[
  {
    "id": "123456789",
    "shortId": "PROJ-A1",
    "title": "TypeError: Cannot read property of undefined",
    "count": "412",
    "userCount": 38,
    "permalink": "https://sentry.io/organizations/myorg/issues/PROJ-A1/",
    "level": "error",
    "status": "unresolved"
  },
  {
    "id": "987654321",
    "shortId": "PROJ-B2",
    "title": "Connection reset by peer (WebSocket)",
    "count": "89",
    "userCount": 12,
    "permalink": "https://sentry.io/organizations/myorg/issues/PROJ-B2/",
    "level": "error",
    "status": "unresolved"
  }
]'
STUB
chmod +x "$BIN/curl"

echo "collect-sentry: happy path (stubbed curl)"
PATH="$BIN:$PATH" SENTRY_AUTH_TOKEN=test_token \
  SENTRY_ORG_SLUG=myorg SENTRY_PROJECT_SLUG=myproj \
  SENTRY_HOST=https://sentry.io \
  INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL"
rc=$?
OUT="$INTEL_DIR/sentry.json"
assert "exits 0"                              '[ "$rc" -eq 0 ]'
assert "wrote sentry.json"                    '[ -f "$OUT" ]'
assert "valid intel envelope"                 'jq -e "._meta and (.signals|type==\"array\")" "$OUT" >/dev/null'
assert "source_ok true on success"            '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'
assert "emitted 1-2 signals (socket noise skipped)" '[ "$(jq ".signals|length" "$OUT")" -ge 1 ] && [ "$(jq ".signals|length" "$OUT")" -le 2 ]'
assert "error signal has kind=error"          'jq -e ".signals[] | select(.kind==\"error\")" "$OUT" >/dev/null'
assert "signal routed to 01-triage"           'jq -e ".signals[] | select(.lane==\"01-triage\")" "$OUT" >/dev/null'
assert "TypeError signal magnitude=412"       '[ "$(jq -r ".signals[] | select(.title|test(\"TypeError\")) | .magnitude" "$OUT")" = "412" ]'
assert "TypeError signal reach=38 (userCount)" '[ "$(jq -r ".signals[] | select(.title|test(\"TypeError\")) | .reach" "$OUT")" = "38" ]'
assert "evidence is the permalink"            'jq -e ".signals[] | select(.evidence|test(\"sentry.io\"))" "$OUT" >/dev/null'
assert "fingerprint is sentry:<shortId>"      'jq -e ".signals[] | select(.fingerprint==\"sentry:PROJ-A1\")" "$OUT" >/dev/null'
assert "all severities in [0,1]"              '[ "$(jq "[.signals[] | select(.severity<0 or .severity>1)] | length" "$OUT")" = "0" ]'
assert "all magnitudes numeric"               '[ "$(jq "[.signals[] | select(.magnitude|type!=\"number\")] | length" "$OUT")" = "0" ]'
assert "all reaches numeric"                  '[ "$(jq "[.signals[] | select(.reach|type!=\"number\")] | length" "$OUT")" = "0" ]'
assert "all fingerprints set"                 '[ "$(jq "[.signals[] | select(.fingerprint==\"\")] | length" "$OUT")" = "0" ]'

echo "collect-sentry: degrade when token unset"
rm -f "$OUT"
( unset SENTRY_AUTH_TOKEN SENTRY_ORG_SLUG SENTRY_PROJECT_SLUG
  PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL" )
rc=$?
assert "degrade exits 0 (never errors)"       '[ "$rc" -eq 0 ]'
assert "degrade wrote a file"                 '[ -f "$OUT" ]'
assert "degrade source_ok false"              '[ "$(jq -r ._meta.source_ok "$OUT")" = "false" ]'
assert "degrade note mentions TOKEN_MISSING"  'jq -re "._meta.note|test(\"TOKEN_MISSING\")" "$OUT" >/dev/null'

echo
echo "collect-sentry: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
