#!/bin/bash
# Test for lib/intel/brief-slice.sh — the per-lane brief slice headless.sh injects
# into __BRIEF__ (spec §6). Proves:
#   - a lane with items → markdown list of its top items (title, score, target)
#   - the brief-first/bounded-fallback contract text when the lane has no items
#   - the same fallback when brief.json is missing
#   - a STALE-sources note is appended when sources were reused
#
# Run: bash scripts/nightly/test/brief-slice.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
SLICE="$DIR/brief-slice.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t briefslice.XXXXXX)
BJSON="$ROOT/brief.json"
trap 'rm -rf "$ROOT"' EXIT

cat > "$BJSON" <<'JSON'
{"_meta":{"generated_at":"2026-05-29T02:00:00Z","n_signals":3,"sources_ok":["posthog"],"sources_stale":["sentry","supabase"]},
 "items":[],
 "by_lane":{
   "02-perf":[
     {"title":"Slow LCP on /en/multiplayer","metric":"lcp_avg_ms","reach":0,"severity":0.9,"effort":"M","target_metric":"posthog:lcp:/en/multiplayer","evidence":"/en/multiplayer","score":0.9},
     {"title":"Slow LCP on /he/word-tower","metric":"lcp_avg_ms","reach":0,"severity":0.6,"effort":"M","target_metric":"posthog:lcp:/he/word-tower","evidence":"","score":0.6}
   ],
   "03-engagement":[
     {"title":"Rage clicks on /en/play","metric":"rageclicks_24h","reach":57,"severity":0.6,"effort":"S","target_metric":"posthog:rageclick:/en/play","evidence":"/en/play","score":0.55}
   ]
 }}
JSON

echo "brief-slice: lane WITH items"
OUT=$(bash "$SLICE" "$BJSON" 02-perf)
assert "lists first lane item"        'echo "$OUT" | grep -q "Slow LCP on /en/multiplayer"'
assert "lists second lane item"       'echo "$OUT" | grep -q "Slow LCP on /he/word-tower"'
assert "includes score"               'echo "$OUT" | grep -q "score 0.9"'
assert "includes target metric"       'echo "$OUT" | grep -q "posthog:lcp:/en/multiplayer"'
assert "does NOT leak other lane"     '! echo "$OUT" | grep -q "Rage clicks"'
assert "appends STALE note"           'echo "$OUT" | grep -qi "STALE"'
assert "STALE note names sources"     'echo "$OUT" | grep -q "sentry"'

echo "brief-slice: lane WITHOUT items → fallback contract"
OUT=$(bash "$SLICE" "$BJSON" 06-seo)
assert "fallback mentions the lane"   'echo "$OUT" | grep -q "06-seo"'
assert "fallback says ONE quick discovery" 'echo "$OUT" | grep -qi "ONE quick"'
assert "fallback says no broad discovery"  'echo "$OUT" | grep -qi "broad discovery"'

echo "brief-slice: missing brief.json → fallback"
OUT=$(bash "$SLICE" "$ROOT/nonexistent.json" 01-triage)
assert "missing file → fallback text"  'echo "$OUT" | grep -qi "no qualifying signal\|No brief items"'
assert "missing file exits 0"          'bash "$SLICE" "$ROOT/none.json" 01-triage >/dev/null; [ "$?" -eq 0 ]'

echo
echo "brief-slice: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
