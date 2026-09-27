#!/bin/bash
# Collector: Supabase → normalized intel signals (spec §4). REST advisors API, NO MCP.
# Queries the Supabase Management API for security and performance advisors, normalizes
# each lint to a signal routed to the appropriate lane (security→01-triage, perf→02-perf).
#
# Severity is normalized per level within this source (ERROR=0.9, WARN=0.5, INFO=0.25).
# Degrades cleanly (stale_fallback) if SUPABASE_ACCESS_TOKEN is unset or the API fails.
# Tested by test/collect-supabase.test.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

ID=supabase
TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
URL="${SUPABASE_URL:-}"

# Degrade if token or URL unset
if [ -z "$TOKEN" ] || [ -z "$URL" ]; then
  stale_fallback "$ID"
  tmp="$INTEL_DIR/$ID.json.tmp"
  jq '._meta.note="TOKEN_MISSING: set SUPABASE_ACCESS_TOKEN (mgmt API PAT) to unlock advisors"' \
     "$INTEL_DIR/$ID.json" > "$tmp" && mv "$tmp" "$INTEL_DIR/$ID.json"
  echo "collect-supabase: token or URL unset → stale fallback"
  exit 0
fi

# Extract project ref from SUPABASE_URL (https://<ref>.supabase.co → ref)
REF="${URL#https://}"
REF="${REF%.supabase.co}"
if [ -z "$REF" ] || [ "$REF" = "$URL" ]; then
  stale_fallback "$ID"
  tmp="$INTEL_DIR/$ID.json.tmp"
  jq '._meta.note="SUPABASE_URL invalid: must be https://<ref>.supabase.co"' \
     "$INTEL_DIR/$ID.json" > "$tmp" && mv "$tmp" "$INTEL_DIR/$ID.json"
  echo "collect-supabase: invalid URL → stale fallback"
  exit 0
fi

# Helper: call Supabase Management API endpoint
sup_api() {
  local endpoint="$1"
  curl -sS --max-time 30 -X GET "https://api.supabase.com/v1/projects/$REF$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" 2>/dev/null || echo '{"lints":[]}'
}

# Compute severity from level
sev_of_level() {
  local level="$1"
  case "$level" in
    ERROR) echo 0.9 ;;
    WARN)  echo 0.5 ;;
    INFO)  echo 0.25 ;;
    *)     echo 0.25 ;;
  esac
}

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }

# 1) Security advisors → 01-triage
SEC=$(sup_api "/advisors/security")
while IFS= read -r row; do
  [ -z "$row" ] && continue
  name=$(echo "$row" | jq -r '.name // "unknown"')
  level=$(echo "$row" | jq -r '.level // "INFO"')
  title=$(echo "$row" | jq -r '.title // ""')
  detail=$(echo "$row" | jq -r '.detail // ""')

  sev=$(sev_of_level "$level")
  add "$(emit_signal supabase advisor "$title" "advisors_security" 1 0 "$sev" 01-triage "supabase:advisor:security:$name" "$detail" M "supabase:advisor:security:$name")"
done < <(echo "$SEC" | jq -c '.lints[]? // empty')

# 2) Performance advisors → 02-perf
PERF=$(sup_api "/advisors/performance")
while IFS= read -r row; do
  [ -z "$row" ] && continue
  name=$(echo "$row" | jq -r '.name // "unknown"')
  level=$(echo "$row" | jq -r '.level // "INFO"')
  title=$(echo "$row" | jq -r '.title // ""')
  detail=$(echo "$row" | jq -r '.detail // ""')

  sev=$(sev_of_level "$level")
  add "$(emit_signal supabase advisor "$title" "advisors_performance" 1 0 "$sev" 02-perf "supabase:advisor:performance:$name" "$detail" M "supabase:advisor:performance:$name")"
done < <(echo "$PERF" | jq -c '.lints[]? // empty')

intel_write "$ID" "$SIGNALS" true ""
echo "collect-supabase: emitted $(echo "$SIGNALS" | jq length) signals"
