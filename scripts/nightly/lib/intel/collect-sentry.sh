#!/bin/bash
# Collector: Sentry → normalized intel signals (spec §4). REST, NO MCP.
# Fetches top unresolved error issues from the last 24h sorted by frequency.
# Routes all to lane 01-triage. Severity normalized by count/max within this run.
# Degrades cleanly (stale_fallback) if SENTRY_* keys are unset or API fails.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

ID=sentry
TOKEN="${SENTRY_AUTH_TOKEN:-}"
ORG_SLUG="${SENTRY_ORG_SLUG:-}"
PROJECT_SLUG="${SENTRY_PROJECT_SLUG:-}"
HOST="${SENTRY_HOST:-https://sentry.io}"

if [ -z "$TOKEN" ] || [ -z "$ORG_SLUG" ] || [ -z "$PROJECT_SLUG" ]; then
  stale_fallback "$ID"
  tmp="$INTEL_DIR/$ID.json.tmp"
  jq '._meta.note="TOKEN_MISSING: set SENTRY_AUTH_TOKEN + SENTRY_ORG_SLUG + SENTRY_PROJECT_SLUG to unlock Sentry over REST"' \
     "$INTEL_DIR/$ID.json" > "$tmp" && mv "$tmp" "$INTEL_DIR/$ID.json"
  echo "collect-sentry: keys unset → stale fallback"
  exit 0
fi

# Fetch unresolved error issues from the last 24h, sorted by frequency (count).
fetch_issues() {
  local url="$HOST/api/0/projects/$ORG_SLUG/$PROJECT_SLUG/issues/"
  local query="is:unresolved+level:error"
  local params="query=$query&statsPeriod=24h&sort=freq&limit=10"

  curl -sS --max-time 30 -X GET "$url?$params" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    2>/dev/null || echo '[]'
}

ISSUES=$(fetch_issues)
# Gracefully handle malformed JSON — default to empty array.
if ! echo "$ISSUES" | jq -e '.' >/dev/null 2>&1; then
  ISSUES='[]'
fi

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }
# severity = floor 0.2 + up to 0.8 scaled by count/max (keeps the smallest >0)
sev_of() { jq -n --argjson v "$1" --argjson m "$2" '(((($v / (if $m>0 then $m else 1 end)) * 0.8 + 0.2) * 100) | round) / 100 | if . > 1 then 1 else . end'; }

# Optionally filter noise: Socket/CSP/CORS issues that are low-signal.
# Match titles containing common expected errors to skip.
is_noise() {
  local title="$1"
  echo "$title" | grep -iE '(socket|CSP violation|CORS|timeout|abort|net::|ResizeObserver|NetworkError)' >/dev/null 2>&1
}

# Find the max count to normalize severity.
maxc=$(echo "$ISSUES" | jq '[.[].count | tonumber] | max // 1')

# Iterate issues and emit signals for non-noise ones.
while IFS= read -r issue; do
  [ -z "$issue" ] && continue

  title=$(echo "$issue" | jq -r '.title // "unknown"')
  short_id=$(echo "$issue" | jq -r '.shortId // ""')
  count=$(echo "$issue" | jq -r '.count // "0"')
  user_count=$(echo "$issue" | jq -r '.userCount // 0')
  permalink=$(echo "$issue" | jq -r '.permalink // ""')

  # Skip noise issues (low-signal, expected infrastructure errors).
  if is_noise "$title"; then
    continue
  fi

  # Ensure numeric values for magnitude and reach.
  count_num=$(echo "$count" | jq -R 'tonumber')
  user_count_num=$(echo "$user_count" | jq -R 'tonumber')

  # Emit signal for this issue.
  add "$(emit_signal sentry error "$title" issues_24h "$count_num" "$user_count_num" "$(sev_of "$count_num" "$maxc")" 01-triage "sentry:$short_id" "$permalink" M "sentry:$short_id")"
done < <(echo "$ISSUES" | jq -c '.[]?')

intel_write "$ID" "$SIGNALS" true ""
echo "collect-sentry: emitted $(echo "$SIGNALS" | jq length) signals"
