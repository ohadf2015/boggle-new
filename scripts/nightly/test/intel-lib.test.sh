#!/bin/bash
# Test for lib/intel/intel-lib.sh — the shared intel helpers. Proves:
#   emit_signal    → one valid signal JSON object with all schema fields
#   intel_write    → wraps signals[] in {_meta, signals}; source_ok respected
#   stale_fallback → copies most-recent prior snapshot + marks it stale; empty if none
#   with_timeout   → kills an overrunning command (nonzero), passes a quick one
#
# No live APIs, no claude/MCP — pure local. Run: bash scripts/nightly/test/intel-lib.test.sh
set -uo pipefail

LIB="$(cd "$(dirname "$0")/../lib/intel" && pwd)/intel-lib.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

# shellcheck disable=SC1090
. "$LIB"

ROOT=$(mktemp -d -t intellib.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-29"
trap 'rm -rf "$ROOT"' EXIT

echo "intel-lib: emit_signal"
SIG=$(emit_signal posthog funnel "Drop at step 2" funnel_dropoff_pct 42 1200 0.8 03-engagement "posthog:funnel:onboarding" "https://x" S "posthog:funnel:onboarding")
assert "emit_signal emits valid JSON"        'echo "$SIG" | jq -e . >/dev/null'
assert "source field set"                    '[ "$(echo "$SIG" | jq -r .source)" = "posthog" ]'
assert "magnitude is numeric"                '[ "$(echo "$SIG" | jq -r ".magnitude|type")" = "number" ]'
assert "severity is numeric"                 '[ "$(echo "$SIG" | jq -r ".severity|type")" = "number" ]'
assert "lane routing carried"                '[ "$(echo "$SIG" | jq -r .lane)" = "03-engagement" ]'
assert "fingerprint carried"                 '[ "$(echo "$SIG" | jq -r .fingerprint)" = "posthog:funnel:onboarding" ]'
assert "effort defaulted/carried"            '[ "$(echo "$SIG" | jq -r .effort)" = "S" ]'

echo "intel-lib: intel_write"
SIGS=$(jq -n --argjson a "$SIG" '[$a]')
intel_write posthog "$SIGS" true ""
OUT="$INTEL_DIR/posthog.json"
assert "intel_write created the file"        '[ -f "$OUT" ]'
assert "file is valid JSON"                  'jq -e . "$OUT" >/dev/null'
assert "_meta.source set"                    '[ "$(jq -r ._meta.source "$OUT")" = "posthog" ]'
assert "_meta.source_ok true"                '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'
assert "_meta.stale false on fresh write"    '[ "$(jq -r ._meta.stale "$OUT")" = "false" ]'
assert "signals[] preserved"                 '[ "$(jq ".signals|length" "$OUT")" = "1" ]'
assert "collected_at is ISO-ish"             'jq -re "._meta.collected_at|test(\"^[0-9]{4}-[0-9]{2}-[0-9]{2}T\")" "$OUT" >/dev/null'

intel_write sentry "[]" false "TOKEN_MISSING: set SENTRY_AUTH_TOKEN"
assert "source_ok false honored"             '[ "$(jq -r ._meta.source_ok "$INTEL_DIR/sentry.json")" = "false" ]'
assert "note carried"                        'jq -re "._meta.note|test(\"TOKEN_MISSING\")" "$INTEL_DIR/sentry.json" >/dev/null'

echo "intel-lib: stale_fallback (with prior snapshot)"
# Seed a prior day's snapshot, then fall back for a NEW day with no fresh data.
PRIOR="$INTEL_ROOT/2026-05-28"; mkdir -p "$PRIOR"
jq -n '{_meta:{source:"railway",collected_at:"2026-05-28T02:00:00Z",stale:false,stale_since:null,source_ok:true,note:""},signals:[{source:"railway",kind:"perf",title:"p95 latency",metric:"p95_ms",magnitude:820,reach:0,severity:0.4,lane:"02-perf",target_metric:"railway:p95",evidence:"",effort:"M",fingerprint:"railway:p95"}]}' > "$PRIOR/railway.json"
stale_fallback railway
FB="$INTEL_DIR/railway.json"
assert "fallback file created"               '[ -f "$FB" ]'
assert "fallback marked stale"               '[ "$(jq -r ._meta.stale "$FB")" = "true" ]'
assert "fallback source_ok false"            '[ "$(jq -r ._meta.source_ok "$FB")" = "false" ]'
assert "fallback kept prior signals"         '[ "$(jq ".signals|length" "$FB")" = "1" ]'
assert "stale_since stamped"                 '[ "$(jq -r ._meta.stale_since "$FB")" != "null" ]'

echo "intel-lib: stale_fallback (no prior snapshot)"
stale_fallback neverseen
NF="$INTEL_DIR/neverseen.json"
assert "empty stale file created"            '[ -f "$NF" ]'
assert "empty stale has [] signals"          '[ "$(jq ".signals|length" "$NF")" = "0" ]'
assert "empty stale marked stale"            '[ "$(jq -r ._meta.stale "$NF")" = "true" ]'

echo "intel-lib: with_timeout"
with_timeout 1 sleep 5; rc=$?
assert "overrunning cmd returns nonzero"     '[ "$rc" -ne 0 ]'
with_timeout 5 true; rc=$?
assert "quick cmd returns 0"                 '[ "$rc" -eq 0 ]'

echo
echo "intel-lib: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
