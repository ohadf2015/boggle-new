#!/bin/bash
# Test for lib/decision-coverage.sh. Proves (with a FIXTURE query command — no
# live API, no curl stubbing):
#   - scans fixture capture() call sites for literal event names (dynamic skipped)
#   - cross-references against PostHog's 28d event volumes via posthog-query.sh's
#     documented {columns,results} / {error} contract
#   - flags a code-defined event with zero PostHog volume as missing_in_posthog
#   - degrades cleanly when the query command reports an error (note set, exit 0)
#
# Run: bash scripts/nightly/test/decision-coverage.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib" && pwd)"
SCRIPT="$DIR/decision-coverage.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t deccov.XXXXXX)
FIXTURE="$ROOT/fixture"; mkdir -p "$FIXTURE"
trap 'rm -rf "$ROOT"' EXIT

cat > "$FIXTURE/telemetry.ts" <<'EOF'
posthog.capture('event_a', { foo: 1 })
posthog.capture('event_b')
posthog.capture(dynamicEventName, { bar: 2 })
EOF

# Fixture query commands honoring posthog-query.sh's own output contract —
# the HogQL branch returns {columns,results}; event_b (defined in code) gets
# zero rows, so it must show up as missing.
HAPPY_PQ="$ROOT/happy-pq.sh"
cat > "$HAPPY_PQ" <<'EOF'
#!/bin/bash
echo '{"columns":["event","c"],"results":[["event_a",42],["event_c",7]]}'
EOF
chmod +x "$HAPPY_PQ"

ERROR_PQ="$ROOT/error-pq.sh"
cat > "$ERROR_PQ" <<'EOF'
#!/bin/bash
echo '{"error":"POSTHOG_PERSONAL_API_KEY unset"}'
EOF
chmod +x "$ERROR_PQ"

echo "decision-coverage: happy path (fixture query command)"
OUT=$(CODE_EVENTS_PATHS="$FIXTURE" POSTHOG_QUERY_CMD="$HAPPY_PQ" bash "$SCRIPT")
rc=$?
assert "exits 0"                         '[ "$rc" -eq 0 ]'
assert "valid json"                      'echo "$OUT" | jq -e type >/dev/null'
assert "found 2 literal code events"     '[ "$(echo "$OUT" | jq .code_event_count)" = "2" ]'
assert "dynamic capture() call skipped"  '[ "$(echo "$OUT" | jq ".missing_in_posthog | index(\"dynamicEventName\")")" = "null" ]'
assert "saw 2 posthog events"            '[ "$(echo "$OUT" | jq .posthog_event_count)" = "2" ]'
assert "event_b flagged missing"         '[ "$(echo "$OUT" | jq -r ".missing_in_posthog[0]")" = "event_b" ]'
assert "event_a not flagged missing"     '[ "$(echo "$OUT" | jq ".missing_in_posthog | index(\"event_a\")")" = "null" ]'
assert "note empty on success"           '[ "$(echo "$OUT" | jq -r .note)" = "" ]'

echo "decision-coverage: degrade when query command reports an error"
OUT=$(CODE_EVENTS_PATHS="$FIXTURE" POSTHOG_QUERY_CMD="$ERROR_PQ" bash "$SCRIPT")
rc=$?
assert "degrade exits 0 (never errors)"   '[ "$rc" -eq 0 ]'
assert "degrade still counts code events" '[ "$(echo "$OUT" | jq .code_event_count)" = "2" ]'
assert "degrade posthog_event_count null" '[ "$(echo "$OUT" | jq .posthog_event_count)" = "null" ]'
assert "degrade note carries the error"   'echo "$OUT" | jq -re ".note|test(\"POSTHOG_PERSONAL_API_KEY\")" >/dev/null'

echo
echo "decision-coverage: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
