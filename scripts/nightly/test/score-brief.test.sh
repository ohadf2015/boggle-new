#!/bin/bash
# Test for lib/intel/score-brief.sh — the DETERMINISTIC scorer (§3.2). Proves:
#   - reads all $INTEL_DIR/<source>.json, ranks signals by transparent formula
#   - dedups by fingerprint (keeps the higher-magnitude duplicate)
#   - applies a stale-confidence penalty (stale source ranks below an identical fresh one)
#   - buckets items by lane (by_lane) for the per-lane brief slice
#   - uses ZERO LLM — runs with NO `claude` on PATH
#
# Run: bash scripts/nightly/test/score-brief.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
SCORE="$DIR/score-brief.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t scorebrief.XXXXXX)
INTEL_DIR="$ROOT/2026-05-29"; mkdir -p "$INTEL_DIR"
trap 'rm -rf "$ROOT"' EXIT

# Fixture: source A (posthog, FRESH) and source B (sentry, STALE).
#  f1 sev .9 reach 100 effort S lane 02-perf        → top (score .9)
#  f3 sev .9 reach 100 effort S lane 01-triage STALE → second (.9 * .6 confidence)
#  f2 sev .5 reach 10  effort M lane 03-engagement   → third
#  f1 DUP in source B with lower magnitude            → must be deduped out
cat > "$INTEL_DIR/posthog.json" <<'JSON'
{"_meta":{"source":"posthog","collected_at":"2026-05-29T02:00:00Z","stale":false,"stale_since":null,"source_ok":true,"note":""},
 "signals":[
   {"source":"posthog","kind":"perf","title":"LCP regression","metric":"lcp_p75_ms","magnitude":100,"reach":100,"severity":0.9,"lane":"02-perf","target_metric":"posthog:lcp","evidence":"","effort":"S","fingerprint":"f1"},
   {"source":"posthog","kind":"funnel","title":"Drop at onboarding","metric":"dropoff_pct","magnitude":40,"reach":10,"severity":0.5,"lane":"03-engagement","target_metric":"posthog:funnel","evidence":"","effort":"M","fingerprint":"f2"}
 ]}
JSON
cat > "$INTEL_DIR/sentry.json" <<'JSON'
{"_meta":{"source":"sentry","collected_at":"2026-05-27T02:00:00Z","stale":true,"stale_since":"2026-05-27T02:00:00Z","source_ok":false,"note":"[stale-fallback]"},
 "signals":[
   {"source":"sentry","kind":"error","title":"TypeError in crane","metric":"events_24h","magnitude":100,"reach":100,"severity":0.9,"lane":"01-triage","target_metric":"sentry:ISSUE-1","evidence":"","effort":"S","fingerprint":"f3"},
   {"source":"sentry","kind":"error","title":"dup of f1 lower mag","metric":"events_24h","magnitude":50,"reach":100,"severity":0.9,"lane":"02-perf","target_metric":"posthog:lcp","evidence":"","effort":"S","fingerprint":"f1"}
 ]}
JSON

echo "score-brief: run with NO claude on PATH (proves zero-LLM)"
# Minimal PATH that has the real tools (jq, env, etc.) but guaranteed no `claude`.
SAFE_PATH="/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin"
INTEL_DIR="$INTEL_DIR" PATH="$SAFE_PATH" bash "$SCORE"
rc=$?
BRIEF="$INTEL_DIR/brief.json"
assert "scorer exited 0"                    '[ "$rc" -eq 0 ]'
assert "brief.json produced"                '[ -f "$BRIEF" ]'
assert "brief.json valid"                   'jq -e . "$BRIEF" >/dev/null'

echo "score-brief: dedup + ranking"
assert "deduped to 3 distinct items"        '[ "$(jq ".items|length" "$BRIEF")" = "3" ]'
assert "rank 1 = f1 (fresh, high sev/reach)" '[ "$(jq -r ".items[0].fingerprint" "$BRIEF")" = "f1" ]'
assert "rank 2 = f3 (stale penalty)"        '[ "$(jq -r ".items[1].fingerprint" "$BRIEF")" = "f3" ]'
assert "rank 3 = f2 (lower sev, M effort)"  '[ "$(jq -r ".items[2].fingerprint" "$BRIEF")" = "f2" ]'
assert "f1 kept the higher-magnitude dup"   '[ "$(jq -r ".items[] | select(.fingerprint==\"f1\") | .magnitude" "$BRIEF")" = "100" ]'
assert "ranks are 1..3"                      '[ "$(jq -c "[.items[].rank]" "$BRIEF")" = "[1,2,3]" ]'
assert "scores strictly descending"         '[ "$(jq "[.items[].score] | . == (sort|reverse)" "$BRIEF")" = "true" ]'
assert "stale f3 scored below fresh f1"     '[ "$(jq ".items[0].score > .items[1].score" "$BRIEF")" = "true" ]'

echo "score-brief: by_lane bucketing"
assert "02-perf bucket has f1"              '[ "$(jq -r ".by_lane[\"02-perf\"][0].fingerprint" "$BRIEF")" = "f1" ]'
assert "01-triage bucket has f3"            '[ "$(jq -r ".by_lane[\"01-triage\"][0].fingerprint" "$BRIEF")" = "f3" ]'
assert "03-engagement bucket has f2"        '[ "$(jq -r ".by_lane[\"03-engagement\"][0].fingerprint" "$BRIEF")" = "f2" ]'

echo "score-brief: _meta"
assert "_meta.n_signals = 3"               '[ "$(jq -r "._meta.n_signals" "$BRIEF")" = "3" ]'
assert "_meta lists stale source sentry"   'jq -e "._meta.sources_stale | index(\"sentry\")" "$BRIEF" >/dev/null'

echo "score-brief: empty intel dir is safe"
EMPTY="$ROOT/empty"; mkdir -p "$EMPTY"
INTEL_DIR="$EMPTY" PATH="$SAFE_PATH" bash "$SCORE"; rc=$?
assert "empty dir → scorer exits 0"        '[ "$rc" -eq 0 ]'
assert "empty dir → brief with [] items"   '[ "$(jq ".items|length" "$EMPTY/brief.json")" = "0" ]'

echo
echo "score-brief: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
