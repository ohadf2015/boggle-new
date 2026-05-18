#!/bin/bash
# railway-deploy-check.sh — verify the just-pushed commit deploys cleanly.
# Backgrounded by run.sh after `git push`. Polls Railway every 60s for up to
# 10 min. Telegrams an alert if the deploy fails (build error, crash loop).
#
# Usage:  ./railway-deploy-check.sh <commit_sha> &

set -uo pipefail

SHA="${1:-$(git rev-parse HEAD)}"
PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
TG="$PROJECT_DIR/scripts/nightly/lib/telegram.sh"
LOG="$HOME/logs/lexi-nightly/railway-check-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$(dirname "$LOG")"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] && [ -f "$HOME/.config/lexi-nightly/env" ]; then
  set -a; . "$HOME/.config/lexi-nightly/env"; set +a
fi

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

# Railway CLI must be in PATH (added in plist EnvironmentVariables).
if ! command -v railway >/dev/null 2>&1; then
  log "railway CLI not found — skipping deploy check"
  exit 0
fi

log "watching Railway deploy for commit ${SHA:0:7} (poll every 60s, 10 min cap)"

# Railway CLI links to a service via local `.railway` file or env. We expect
# the script to run from PROJECT_DIR where Railway is linked.
cd "$PROJECT_DIR" || exit 0

STATUS_OK=0
ALERTED=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 60

  # `railway status` prints project/env/service info; deploy info via API.
  # `railway logs` will print build + runtime logs for the latest deploy.
  # We grep the last few log lines for terminal markers.
  RECENT=$(timeout 30s railway logs 2>&1 | tail -50 || true)

  if echo "$RECENT" | grep -qE "Deploy.*(SUCCESS|live|healthy)|Build successful|status: SUCCESS"; then
    log "tick=$i — deploy SUCCESS detected"
    STATUS_OK=1
    break
  fi

  if echo "$RECENT" | grep -qE "Deploy.*FAILED|Build failed|status: FAILED|Crashed|Stopped due to"; then
    log "tick=$i — deploy FAILED"
    if [ "$ALERTED" = "0" ]; then
      LOG_TAIL=$(echo "$RECENT" | tail -20)
      "$TG" alert "$(printf 'Railway deploy *FAILED* for \`%s\`.\n\nLast log lines:\n\`\`\`\n%s\n\`\`\`' \
        "${SHA:0:7}" "$LOG_TAIL")"
      ALERTED=1
    fi
    exit 1
  fi

  log "tick=$i — no terminal status yet, continuing"
done

if [ "$STATUS_OK" = "1" ]; then
  log "deploy verified"
else
  log "10 min elapsed, no terminal status — alerting cautiously"
  "$TG" alert "Railway deploy status unclear after 10 min for \`${SHA:0:7}\` — check manually via \`railway logs\`."
fi
