#!/bin/bash
# Collector: PostHog game_feedback sentiment + Supabase feedback_reports → normalized intel signals.
# Two distinct sources wrapped into one feedback intelligence signal stream:
#   - PostHog sentiment (growth:game_feedback) → 03-engagement (UX satisfaction)
#   - Supabase bug reports (feedback_reports)  → 01-triage (product quality)
#
# Degrades cleanly: if NEITHER PostHog NOR Supabase keys are set, write empty stale file.
# If one is available, emit what we can (partial is better than nothing).
# Reuses REST patterns from lib/feedback-digest.sh. Tested by test/collect-feedback.test.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

ID=feedback
PH_HOST="${POSTHOG_HOST:-https://us.i.posthog.com}"
PH_KEY="${POSTHOG_PERSONAL_API_KEY:-}"
PH_PID="${POSTHOG_PROJECT_ID:-}"
SB_URL="${SUPABASE_URL:-}"
SB_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# If NEITHER source is available, degrade gracefully.
if [ -z "$PH_KEY" ] && [ -z "$SB_URL" ]; then
  stale_fallback "$ID"
  tmp="$INTEL_DIR/$ID.json.tmp"
  jq '._meta.note="feedback unavailable (no PostHog/Supabase keys configured)"' \
     "$INTEL_DIR/$ID.json" > "$tmp" && mv "$tmp" "$INTEL_DIR/$ID.json"
  echo "collect-feedback: keys unset → stale fallback"
  exit 0
fi

# Query PostHog HogQL for sentiment over last 24h.
ph_sentiment() {
  if [ -z "$PH_KEY" ] || [ -z "$PH_PID" ]; then echo '{"results":[]}'; return; fi
  local q="SELECT properties.surface, count(), round(avg(toFloat(properties.ratingValue)),2), countIf(properties.rating='bad'), countIf(properties.rating='ok'), countIf(properties.rating='great') FROM events WHERE event='growth:game_feedback' AND timestamp > now() - INTERVAL 24 HOUR GROUP BY properties.surface ORDER BY count() DESC"
  local body r
  body=$(jq -n --arg q "$q" '{query:{kind:"HogQLQuery",query:$q}}')
  r=$(curl -sS --max-time 30 -X POST "$PH_HOST/api/projects/$PH_PID/query/" \
        -H "Authorization: Bearer $PH_KEY" -H "Content-Type: application/json" \
        -d "$body" 2>/dev/null)
  if echo "$r" | jq -e '.results' >/dev/null 2>&1; then echo "$r"; else echo '{"results":[]}'; fi
}

# Query Supabase REST for recent bug reports.
sb_reports() {
  if [ -z "$SB_URL" ] || [ -z "$SB_KEY" ]; then echo '[]'; return; fi
  local since
  since=$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null)
  curl -sS --max-time 30 \
    "$SB_URL/rest/v1/feedback_reports?select=created_at,locale,page,message,user_id,username&created_at=gte.${since}&order=created_at.desc&limit=10" \
    -H "apikey: $SB_KEY" \
    -H "Authorization: Bearer $SB_KEY" \
    2>/dev/null | jq -c '.' 2>/dev/null || echo '[]'
}

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }
sev_of() { jq -n --argjson v "$1" --argjson m "$2" '(((($v / (if $m>0 then $m else 1 end)) * 0.8 + 0.2) * 100) | round) / 100 | if . > 1 then 1 else . end'; }

# 1) PostHog sentiment → 03-engagement (low satisfaction = UX friction)
SENT=$(ph_sentiment)
if [ -n "$(echo "$SENT" | jq -r '.results[]?' 2>/dev/null)" ]; then
  max_bad=$(echo "$SENT" | jq '[.results[]?[3]] | max // 1')
  while IFS= read -r row; do
    [ -z "$row" ] && continue
    surf=$(echo "$row" | jq -r '.[0] // "unknown"')
    total=$(echo "$row" | jq -r '.[1] // 0')
    avg_rating=$(echo "$row" | jq -r '.[2] // 0')
    bad=$(echo "$row" | jq -r '.[3] // 0')
    # Severity = bad_count as a fraction of max_bad, floor 0.2
    severity=$(sev_of "$bad" "$max_bad")
    add "$(emit_signal feedback feedback "Low sentiment on $surf (avg $avg_rating/3)" feedback_sentiment "$bad" "$total" "$severity" 03-engagement "feedback:sentiment:$surf" "" M "feedback:sentiment:$surf")"
  done < <(echo "$SENT" | jq -c '.results[]?')
fi

# 2) Supabase bug reports → 01-triage (product quality)
REPS=$(sb_reports)
if [ -n "$(echo "$REPS" | jq -r '.[]?' 2>/dev/null)" ]; then
  total_reports=$(echo "$REPS" | jq 'length')
  # Build evidence string from top ~5 reports: "username: <first 80 chars of message> | ..."
  evidence=$(echo "$REPS" | jq -r '[.[0:5][] | ((.username // "anon") + ": " + ((.message // "") | .[0:80]))] | join(" | ")' 2>/dev/null || echo "")
  # Emit one aggregated report signal, severity scaled by count (floor 0.2)
  severity=$(sev_of "$total_reports" "10")
  add "$(emit_signal feedback feedback "Bug reports (recent 7d)" feedback_reports "$total_reports" "$total_reports" "$severity" 01-triage "feedback:report:all" "$evidence" M "feedback:report:all")"
fi

intel_write "$ID" "$SIGNALS" true ""
echo "collect-feedback: emitted $(echo "$SIGNALS" | jq length) signals"
