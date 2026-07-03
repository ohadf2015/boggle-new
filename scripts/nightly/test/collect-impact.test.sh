#!/bin/bash
# Test for lib/intel/collect-impact.sh — due impact-ledger entries → per-lane
# IMPACT CHECK intel signals. Proves:
#   - one signal per due entry, routed to the ORIGINATING lane
#   - verdicted / not-yet-due / metric:none entries emit nothing
#   - evidence carries query_hint + baseline + verdict-append instruction
#   - missing ledger → valid empty envelope, exit 0
#
# Run: bash scripts/nightly/test/collect-impact.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t colimpact.XXXXXX)
export INTEL_ROOT="$ROOT/intel" INTEL_DIR="$ROOT/intel/2026-07-03"
mkdir -p "$INTEL_DIR"
L="$ROOT/impact-ledger.ndjson"
trap 'rm -rf "$ROOT"' EXIT

cat > "$L" <<'NDJSON'
{"id":"02-perf-2026-06-28-lcp","date":"2026-06-28","lane":"02-perf","change":"hero img priority","metric":"posthog:web_vitals:LCP:/en","source":"posthog","query_hint":"p75 LCP /en 7d","baseline":2400,"direction":"down","check_after_days":3}
{"id":"03-eng-2026-07-02-cta","date":"2026-07-02","lane":"03-engagement","change":"quest CTA","metric":"posthog:quest_completed","source":"posthog","baseline":40,"direction":"up","check_after_days":3}
{"id":"01-triage-2026-06-29-guard","date":"2026-06-29","lane":"01-triage","change":"null guard","metric":"none","why":"hardening","check_after_days":3}
NDJSON

echo "collect-impact: due entries → signals (TODAY=2026-07-03)"
IMPACT_LEDGER_FILE="$L" NIGHTLY_IMPACT_TODAY="2026-07-03" bash "$DIR/collect-impact.sh" >/dev/null 2>&1
OUT="$INTEL_DIR/impact.json"
assert "envelope written"             '[ -f "$OUT" ] && jq -e ._meta "$OUT" >/dev/null'
assert "exactly 1 signal (due only)"  '[ "$(jq ".signals|length" "$OUT")" = "1" ]'
assert "routed to originating lane"   'jq -re ".signals[0].lane" "$OUT" | grep -qx 02-perf'
assert "title marks IMPACT CHECK"     'jq -re ".signals[0].title" "$OUT" | grep -q "IMPACT CHECK"'
assert "evidence has query hint"      'jq -re ".signals[0].evidence" "$OUT" | grep -q "p75 LCP /en 7d"'
assert "evidence has baseline"        'jq -re ".signals[0].evidence" "$OUT" | grep -q "2400"'
assert "evidence tells verdict append" 'jq -re ".signals[0].evidence" "$OUT" | grep -q "verdict_for"'
assert "fingerprint stable"           'jq -re ".signals[0].fingerprint" "$OUT" | grep -qx "impact:02-perf-2026-06-28-lcp"'

echo "collect-impact: missing ledger"
rm -f "$OUT"
IMPACT_LEDGER_FILE="$ROOT/none.ndjson" bash "$DIR/collect-impact.sh" >/dev/null 2>&1; rc=$?
assert "exits 0"                      '[ "$rc" = "0" ]'
assert "empty envelope written"       '[ "$(jq ".signals|length" "$OUT")" = "0" ]'

echo
echo "collect-impact: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
