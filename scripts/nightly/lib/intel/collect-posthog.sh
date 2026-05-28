#!/bin/bash
# Collector: PostHog → normalized intel signals (spec §4). REST/HogQL, NO MCP.
# This is the richest connected source and is fully REST-able today, so it fills
# the brief immediately for the data-discovery lanes:
#   $exception (24h)      → 01-triage   (errors PostHog saw that Sentry may miss)
#   $web_vitals LCP > 2.5s→ 02-perf     (Core Web Vitals — the lane-02 promise)
#   $rageclick by URL     → 03-engagement (UX friction = where to A/B a fix)
#
# Severity is normalized WITHIN this source (per query, floor 0.2 so the smallest
# real signal isn't zeroed). Degrades cleanly (stale_fallback) if keys are unset
# or the API fails — a dead source must never block Phase 0.
# Reuses the proven auth/HogQL pattern from lib/posthog-query.sh + feedback-digest.sh.
# Tested by test/collect-posthog.test.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

ID=posthog
KEY="${POSTHOG_PERSONAL_API_KEY:-}"
PID="${POSTHOG_PROJECT_ID:-}"
HOST="${POSTHOG_HOST:-https://eu.posthog.com}"

if [ -z "$KEY" ] || [ -z "$PID" ]; then
  stale_fallback "$ID"
  tmp="$INTEL_DIR/$ID.json.tmp"
  jq '._meta.note="TOKEN_MISSING: set POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID"' \
     "$INTEL_DIR/$ID.json" > "$tmp" && mv "$tmp" "$INTEL_DIR/$ID.json"
  echo "collect-posthog: keys unset → stale fallback"
  exit 0
fi

# One HogQL query → {columns,results} (or empty on any failure — never throws).
ph() {
  local q="$1" body r
  body=$(jq -n --arg q "$q" '{query:{kind:"HogQLQuery",query:$q}}')
  r=$(curl -sS --max-time 30 -X POST "$HOST/api/projects/$PID/query/" \
        -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
        -d "$body" 2>/dev/null)
  if echo "$r" | jq -e '.results' >/dev/null 2>&1; then echo "$r"; else echo '{"results":[]}'; fi
}

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }
# severity = floor 0.2 + up to 0.8 scaled by value/max (keeps the smallest >0)
sev_of() { jq -n --argjson v "$1" --argjson m "$2" '(((($v / (if $m>0 then $m else 1 end)) * 0.8 + 0.2) * 100) | round) / 100 | if . > 1 then 1 else . end'; }

# 1) Top exceptions → 01-triage
EXC=$(ph "SELECT coalesce(toString(properties.\$exception_type), toString(properties.\$exception_message), 'unknown') AS t, count() AS c, count(distinct person_id) AS u FROM events WHERE event = '\$exception' AND timestamp > now() - INTERVAL 24 HOUR GROUP BY t ORDER BY c DESC LIMIT 5")
maxc=$(echo "$EXC" | jq '[.results[]?[1]] | max // 1')
while IFS= read -r row; do
  [ -z "$row" ] && continue
  t=$(echo "$row" | jq -r '.[0] // "unknown"'); c=$(echo "$row" | jq -r '.[1] // 0'); u=$(echo "$row" | jq -r '.[2] // 0')
  add "$(emit_signal posthog error "Exception: $t" events_24h "$c" "$u" "$(sev_of "$c" "$maxc")" 01-triage "posthog:exception:$t" "" M "posthog:exception:$t")"
done < <(echo "$EXC" | jq -c '.results[]?')

# 2) Core Web Vitals — pages with LCP p-avg over 2.5s → 02-perf
WV=$(ph "SELECT toString(properties.\$current_url) AS url, round(avg(toFloat(properties.\$web_vitals_LCP_value)),0) AS lcp FROM events WHERE event = '\$web_vitals' AND timestamp > now() - INTERVAL 24 HOUR GROUP BY url HAVING lcp > 2500 ORDER BY lcp DESC LIMIT 5")
maxlcp=$(echo "$WV" | jq '[.results[]?[1]] | max // 2500')
while IFS= read -r row; do
  [ -z "$row" ] && continue
  url=$(echo "$row" | jq -r '.[0] // "?"'); lcp=$(echo "$row" | jq -r '.[1] // 0')
  add "$(emit_signal posthog perf "Slow LCP on $url (${lcp}ms)" lcp_avg_ms "$lcp" 0 "$(sev_of "$lcp" "$maxlcp")" 02-perf "posthog:lcp:$url" "$url" M "posthog:lcp:$url")"
done < <(echo "$WV" | jq -c '.results[]?')

# 3) Rage clicks by URL → 03-engagement (UX friction)
RC=$(ph "SELECT toString(properties.\$current_url) AS url, count() AS c FROM events WHERE event = '\$rageclick' AND timestamp > now() - INTERVAL 24 HOUR GROUP BY url ORDER BY c DESC LIMIT 5")
maxrc=$(echo "$RC" | jq '[.results[]?[1]] | max // 1')
while IFS= read -r row; do
  [ -z "$row" ] && continue
  url=$(echo "$row" | jq -r '.[0] // "?"'); c=$(echo "$row" | jq -r '.[1] // 0')
  add "$(emit_signal posthog funnel "Rage clicks on $url" rageclicks_24h "$c" "$c" "$(sev_of "$c" "$maxrc")" 03-engagement "posthog:rageclick:$url" "$url" S "posthog:rageclick:$url")"
done < <(echo "$RC" | jq -c '.results[]?')

intel_write "$ID" "$SIGNALS" true ""
echo "collect-posthog: emitted $(echo "$SIGNALS" | jq length) signals"
