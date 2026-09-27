#!/bin/bash
# Collector: Search (AI & GSC) → normalized intel signals (spec §4). REST-only.
#
# Reads SEO/AI-visibility data from:
#   - Bing AI-search artifact (docs/nightly/ai-search/$TODAY.json) — grounding queries
#   - Optional Bing Webmaster Tools keyword-stats REST — search volume enrichment
#
# Emits signals for each grounding query:
#   kind=search, lane=06-seo, magnitude from impressions or count, reach=0 (AI queries),
#   severity scaled by impression count/max, fingerprint=search:aiquery:<q>
#
# Degrades cleanly (stale_fallback) if:
#   - ai-search artifact missing AND BING_WMT_API_KEY unset (no sources available)
# Tolerates Bing keyword-stats API failure (optional enrichment).
#
# Env (set by run-intel.sh or test):
#   PROJECT_DIR    repo root (defaults to two dirs up from script)
#   TODAY           YYYY-MM-DD (defaults to date -u +%Y-%m-%d)
#   BING_WMT_API_KEY optional Webmaster Tools API key
#
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

ID=search
PROJECT_DIR="${PROJECT_DIR:-$(cd "$HERE/../../../.." && pwd)}"
TODAY="${TODAY:-$(date -u +%Y-%m-%d)}"
ARTIFACT="$PROJECT_DIR/docs/nightly/ai-search/$TODAY.json"
BING_KEY="${BING_WMT_API_KEY:-}"

# Check if we have any source: artifact OR Bing API key
if [ ! -f "$ARTIFACT" ] && [ -z "$BING_KEY" ]; then
  stale_fallback "$ID"
  tmp="$INTEL_DIR/$ID.json.tmp"
  jq '._meta.note="no ai-search artifact and BING_WMT_API_KEY unset; GSC CTR via lane-06 seo-daily skill (Pass-2 REST follow-up)"' \
     "$INTEL_DIR/$ID.json" > "$tmp" && mv "$tmp" "$INTEL_DIR/$ID.json"
  echo "collect-search: no artifact and no BING key → stale fallback"
  exit 0
fi

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }

# severity = min(1, max(0.2, impressions / max_impressions * 0.8 + 0.2))
sev_of() { jq -n --argjson v "$1" --argjson m "$2" '(((($v / (if $m>0 then $m else 1 end)) * 0.8 + 0.2) * 100) | round) / 100 | if . > 1 then 1 else . end'; }

# URL-encode a string for query parameters
urlencode() {
  local s="$1"
  echo -n "$s" | jq -sRr '@uri'
}

# Optional: enrich query with search volume from Bing Webmaster Tools
# Returns impressions if found, else 0
bing_impressions() {
  local q="$1"
  [ -z "$BING_KEY" ] && echo 0 && return 0

  local encoded q_enc vol
  encoded=$(urlencode "$q")
  vol=$(with_timeout 10 curl -sS \
    "https://ssl.bing.com/webmaster/api.svc/json/GetKeywordStats?q=${encoded}&country=us&language=en-US&apikey=${BING_KEY}" \
    2>/dev/null | jq '.data[0]?.impressions // 0' 2>/dev/null)
  [ -z "$vol" ] && vol=0
  echo "$vol"
}

# Parse ai-search artifact if present
if [ -f "$ARTIFACT" ]; then
  # Extract grounding_queries array; skip if empty
  queries=$(jq '.grounding_queries // []' "$ARTIFACT" 2>/dev/null)
  query_count=$(echo "$queries" | jq 'length' 2>/dev/null || echo 0)

  if [ "$query_count" -gt 0 ]; then
    # Find max magnitude for severity scaling. Bing AI-perf emits `citations`
    # (not impressions/count) — include all three so scaling never collapses to 1.
    max_impressions=$(echo "$queries" | jq '[.[] | (.impressions // .citations // .count // 0)] | max // 1' 2>/dev/null)

    # Emit one signal per grounding query
    while IFS= read -r query_obj; do
      [ -z "$query_obj" ] && continue

      q=$(echo "$query_obj" | jq -r '.query // ""' 2>/dev/null)
      [ -z "$q" ] && continue

      # Magnitude: prefer impressions, then citations (the field the scraper writes),
      # then count, then 1.
      imp=$(echo "$query_obj" | jq '.impressions // 0' 2>/dev/null)
      cit=$(echo "$query_obj" | jq '.citations // 0' 2>/dev/null)
      cnt=$(echo "$query_obj" | jq '.count // 0' 2>/dev/null)
      magnitude=$(( imp > 0 ? imp : (cit > 0 ? cit : (cnt > 0 ? cnt : 1)) ))

      # Evidence: the enriched Bing AI-visibility columns (intent / topic / citation share)
      # so lane 6 can target by intent (e.g. education) and rank by citation dominance.
      evidence=$(echo "$query_obj" | jq -r '
        [ (if .intent then "intent=\(.intent)" else empty end),
          (if .topic then "topic=\(.topic)" else empty end),
          (if .citation_share then "share=\(.citation_share)%" else empty end)
        ] | join(" · ")' 2>/dev/null)

      # Fingerprint: stable dedup id (normalized query)
      fp=$(echo "search:aiquery:$q" | tr ' ' '_' | tr -cd '[:alnum:]_:' | sed 's/_*$//')

      add "$(emit_signal search search "AI-cited query: $q" ai_impressions "$magnitude" 0 \
            "$(sev_of "$magnitude" "$max_impressions")" 06-seo "search:aiquery:$q" "$evidence" M "$fp")"
    done < <(echo "$queries" | jq -c '.[]')
  fi
fi

intel_write "$ID" "$SIGNALS" true ""
echo "collect-search: emitted $(echo "$SIGNALS" | jq length) signals"
