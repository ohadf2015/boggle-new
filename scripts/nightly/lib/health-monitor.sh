#!/bin/bash
# health-monitor.sh — 30-min post-push KPI watch.
# Backgrounded by run.sh after `git push` succeeds.
#
# Polls every 5 min:
#  - PostHog $pageview count last 60min vs 7d-same-hour avg
#  - Sentry event count last 15min via sentry MCP (proxied through claude -p — minimal)
# Alerts Telegram if either >2x baseline. Does NOT auto-rollback.
#
# Usage:  ./health-monitor.sh <commit_sha> &

set -uo pipefail

SHA="${1:-$(git rev-parse HEAD)}"
PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
TG="$PROJECT_DIR/scripts/nightly/lib/telegram.sh"
LOG="$HOME/logs/lexi-nightly/health-monitor-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$(dirname "$LOG")"

# Load env if not already loaded
if [ -z "${POSTHOG_PERSONAL_API_KEY:-}" ] && [ -f "$HOME/.config/lexi-nightly/env" ]; then
  set -a; . "$HOME/.config/lexi-nightly/env"; set +a
fi

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

posthog_query() {
  # Returns event count from PostHog HogQL for an event/time window.
  # $1 = event name (e.g. '$pageview', '$exception')
  # $2 = minutes lookback
  local event="$1"
  local minutes="$2"
  local query="SELECT count() FROM events WHERE event = '${event}' AND timestamp > now() - INTERVAL ${minutes} MINUTE"
  curl -sS --max-time 15 \
    "${POSTHOG_HOST:-https://us.i.posthog.com}/api/projects/${POSTHOG_PROJECT_ID}/query/" \
    -H "Authorization: Bearer ${POSTHOG_PERSONAL_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":{\"kind\":\"HogQLQuery\",\"query\":\"${query}\"}}" \
    | jq -r '.results[0][0] // 0' 2>/dev/null || echo 0
}

posthog_baseline() {
  # 7d same-hour-of-week avg for an event over a $minutes window.
  local event="$1"
  local minutes="$2"
  local query="SELECT count() / 7 FROM events WHERE event = '${event}' AND toHour(timestamp) = toHour(now()) AND timestamp > now() - INTERVAL 7 DAY AND timestamp < now() - INTERVAL ${minutes} MINUTE"
  curl -sS --max-time 15 \
    "${POSTHOG_HOST:-https://us.i.posthog.com}/api/projects/${POSTHOG_PROJECT_ID}/query/" \
    -H "Authorization: Bearer ${POSTHOG_PERSONAL_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\":{\"kind\":\"HogQLQuery\",\"query\":\"${query}\"}}" \
    | jq -r '.results[0][0] // 0' 2>/dev/null || echo 0
}

log "health-monitor start for sha=$SHA (30 min, every 5 min)"

ALERTED=0
for i in 1 2 3 4 5 6; do
  sleep 300   # 5 min

  pv=$(posthog_query '$pageview' 60)
  pv_base=$(posthog_baseline '$pageview' 60)
  exc=$(posthog_query '$exception' 15)
  exc_base=$(posthog_baseline '$exception' 15)

  log "tick=$i pageviews=$pv (base ~$pv_base) exceptions=$exc (base ~$exc_base)"

  # Trigger if exception rate jumps OR pageviews crater
  trigger=""
  if [ "$exc_base" != "0" ] && [ "${exc%.*}" -gt $(( ${exc_base%.*} * 2 )) ] 2>/dev/null; then
    trigger="exceptions ${exc} >2× baseline ${exc_base}"
  fi
  if [ "$pv_base" != "0" ] && [ "${pv%.*}" -lt $(( ${pv_base%.*} / 2 )) ] 2>/dev/null; then
    trigger="${trigger}${trigger:+; }pageviews ${pv} <½ baseline ${pv_base}"
  fi

  if [ -n "$trigger" ] && [ "$ALERTED" = "0" ]; then
    "$TG" alert "$(printf 'KPI deviation %s min post-push.\n*Commit:* `%s`\n*Trigger:* %s\n*Action:* review at 09:00; consider `git revert %s`.' \
      "$((i*5))" "$SHA" "$trigger" "$SHA")"
    ALERTED=1
    log "ALERTED via Telegram"
  fi
done

log "health-monitor done (alerted=$ALERTED)"
