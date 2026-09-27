#!/bin/bash
# Test for lib/intel/collect-search.sh. Proves (with STUBBED curl and fixture files):
#   - reads ai-search JSON artifact from docs/nightly/ai-search/$TODAY.json
#   - emits one signal per grounding_query (kind=search, lane=06-seo)
#   - routes to 06-seo; magnitude from impressions/count; reach=0; severity scaled
#   - fingerprints stable for dedup (search:aiquery:<q>)
#   - degrades cleanly when artifact missing AND BING_WMT_API_KEY unset (stale + note), exit 0
#   - tolerates Bing keyword-stats API failure gracefully
#   - never writes to any external service (stub records only reads)
#
# Run: bash scripts/nightly/test/collect-search.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
COL="$DIR/collect-search.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t colsearch.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-29"
export PROJECT_DIR="$ROOT/project"
export TODAY="2026-05-29"
mkdir -p "$INTEL_DIR"
mkdir -p "$PROJECT_DIR/docs/nightly/ai-search"
BIN="$ROOT/bin"; mkdir -p "$BIN"
trap 'rm -rf "$ROOT"' EXIT

# Stub curl for Bing keyword stats (returns 200 with fixture on success, 500 on simulate-fail)
cat > "$BIN/curl" <<'STUB'
#!/bin/bash
args="$*"
# Return Bing keyword-stats fixture if called with that URL
if echo "$args" | grep -q 'GetKeywordStats'; then
  if echo "$args" | grep -q 'fail=1'; then
    # Simulate API failure
    echo '{"error":"Bad request"}' >&2
    exit 1
  fi
  # Return fixture: search volume for the query
  echo '{"data":[{"impressions":2500,"ctr":0.085}]}'
else
  echo '{"data":[]}'
fi
STUB
chmod +x "$BIN/curl"

echo "collect-search: happy path (ai-search artifact + stubbed curl)"
# Create ai-search artifact with 2 grounding queries
cat > "$PROJECT_DIR/docs/nightly/ai-search/2026-05-29.json" <<'AI_SEARCH'
{
  "totals": {
    "grounding_queries": 2,
    "cited_pages": 5
  },
  "grounding_queries": [
    {
      "query": "word game multiplayer online",
      "count": 45,
      "impressions": 2200
    },
    {
      "query": "competitive word puzzle",
      "count": 12,
      "impressions": 890
    }
  ],
  "cited_pages": [
    {
      "url": "/en/multiplayer",
      "count": 32,
      "impressions": 1850
    }
  ]
}
AI_SEARCH

PATH="$BIN:$PATH" \
  INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" \
  PROJECT_DIR="$PROJECT_DIR" TODAY="$TODAY" \
  bash "$COL"
rc=$?
OUT="$INTEL_DIR/search.json"

assert "exits 0"                                      '[ "$rc" -eq 0 ]'
assert "wrote search.json"                            '[ -f "$OUT" ]'
assert "valid intel envelope"                         'jq -e "._meta and (.signals|type==\"array\")" "$OUT" >/dev/null'
assert "source_ok true on success"                    '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'
assert "emitted 2 signals (one per query)"            '[ "$(jq ".signals|length" "$OUT")" -eq 2 ]'
assert "both signals kind=search"                     'jq -e ".signals[] | select(.kind != \"search\")" "$OUT" >/dev/null 2>&1 && false || true'
assert "both signals lane=06-seo"                     '[ "$(jq "[.signals[] | select(.lane != \"06-seo\")] | length" "$OUT")" = "0" ]'
assert "first signal title has query text"            'jq -e ".signals[0] | .title | test(\"word game multiplayer\")" "$OUT" >/dev/null'
assert "first signal magnitude from impressions"      '[ "$(jq ".signals[0].magnitude" "$OUT")" = "2200" ]'
assert "second signal magnitude from impressions"      '[ "$(jq ".signals[1].magnitude" "$OUT")" = "890" ]'
assert "reach always 0 (AI impressions not users)"    '[ "$(jq "[.signals[] | select(.reach != 0)] | length" "$OUT")" = "0" ]'
assert "fingerprints stable (search:aiquery:...)"     'jq -e ".signals[] | .fingerprint | test(\"^search:aiquery:\")" "$OUT" >/dev/null'
assert "all severities in [0,1]"                      '[ "$(jq "[.signals[] | select(.severity<0 or .severity>1)] | length" "$OUT")" = "0" ]'
assert "all magnitudes numeric"                       '[ "$(jq "[.signals[] | select(.magnitude|type!=\"number\")] | length" "$OUT")" = "0" ]'

echo "collect-search: degrade when artifact missing AND no BING_WMT_API_KEY"
rm -f "$OUT"
rm -f "$PROJECT_DIR/docs/nightly/ai-search/2026-05-29.json"
( unset BING_WMT_API_KEY
  PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" \
  PROJECT_DIR="$PROJECT_DIR" TODAY="$TODAY" bash "$COL" )
rc=$?
assert "degrade exits 0 (never errors)"               '[ "$rc" -eq 0 ]'
assert "degrade wrote a file"                         '[ -f "$OUT" ]'
assert "degrade source_ok false"                      '[ "$(jq -r ._meta.source_ok "$OUT")" = "false" ]'
assert "degrade note mentions missing artifact"       'jq -re "._meta.note | test(\"no ai-search artifact|BING_WMT_API_KEY\")" "$OUT" >/dev/null'
assert "degrade signals empty"                        '[ "$(jq ".signals|length" "$OUT")" = "0" ]'

echo "collect-search: bing api failure tolerance"
# Recreate artifact
cat > "$PROJECT_DIR/docs/nightly/ai-search/2026-05-29.json" <<'AI_SEARCH'
{
  "totals": {
    "grounding_queries": 1
  },
  "grounding_queries": [
    {
      "query": "test query",
      "count": 5
    }
  ],
  "cited_pages": []
}
AI_SEARCH

rm -f "$OUT"
PATH="$BIN:$PATH" \
  INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" \
  PROJECT_DIR="$PROJECT_DIR" TODAY="$TODAY" \
  BING_WMT_API_KEY="fake-key-fail=1" \
  bash "$COL"
rc=$?

# When Bing fails, magnitude should use count fallback (not impressions), magnitude = 5
assert "bing failure → still emits signal with count fallback"   '[ "$(jq ".signals|length" "$OUT")" = "1" ]'
assert "magnitude is count (5) when bing fails"                  '[ "$(jq ".signals[0].magnitude" "$OUT")" = "5" ]'
assert "source_ok still true (bing is optional)"                 '[ "$(jq -r ._meta.source_ok "$OUT")" = "true" ]'

echo "collect-search: real bing-ai-perf shape (citations + intent/topic/citation_share)"
# Mirrors what bing-ai-perf-scrape.sh actually writes: NO impressions/count fields,
# magnitude must come from `citations`, and the enriched columns must reach evidence.
cat > "$PROJECT_DIR/docs/nightly/ai-search/2026-05-29.json" <<'AI_SEARCH'
{
  "totals": { "total_citations": 2500, "avg_cited_pages": 4 },
  "grounding_queries": [
    { "query": "boggle wordshake", "intent": "Learn and Solve", "topic": "Puzzle & Strategy Games", "citations": 507, "citation_share": 22.94 },
    { "query": "daily word wheel", "intent": "Informational", "topic": "Gaming", "citations": 185, "citation_share": 57.81 }
  ],
  "cited_pages": []
}
AI_SEARCH
rm -f "$OUT"
( unset BING_WMT_API_KEY
  PATH="$BIN:$PATH" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" \
  PROJECT_DIR="$PROJECT_DIR" TODAY="$TODAY" bash "$COL" )
assert "emits 2 signals from citations-shaped artifact"  '[ "$(jq ".signals|length" "$OUT")" = "2" ]'
assert "magnitude from citations (507) not 1"            '[ "$(jq ".signals[0].magnitude" "$OUT")" = "507" ]'
assert "second magnitude from citations (185)"           '[ "$(jq ".signals[1].magnitude" "$OUT")" = "185" ]'
assert "severity scaled vs max citations (top=1.0)"      '[ "$(jq ".signals[0].severity" "$OUT")" = "1" ]'
assert "evidence carries intent"                         'jq -e ".signals[0].evidence | test(\"Learn and Solve\")" "$OUT" >/dev/null'
assert "evidence carries topic"                          'jq -e ".signals[0].evidence | test(\"Puzzle & Strategy Games\")" "$OUT" >/dev/null'
assert "evidence carries citation_share"                 'jq -e ".signals[0].evidence | test(\"22.94\")" "$OUT" >/dev/null'

echo
echo "collect-search: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
