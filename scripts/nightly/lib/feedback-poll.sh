#!/bin/bash
# feedback-poll.sh — fetch new Telegram callback_query updates since last poll.
# Called by preflight at the START of every nightly run.
#
# Writes parsed feedback to:
#   docs/nightly/feedback/<YYYY-MM-DD>.json    (per-day accumulator, append)
#
# Acknowledges each callback so Telegram clears the spinner UI.
# Persists last-seen update_id at ~/.cache/lexi-nightly/tg-last-update-id.

set -uo pipefail

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] && [ -f "$HOME/.config/lexi-nightly/env" ]; then
  set -a; . "$HOME/.config/lexi-nightly/env"; set +a
fi

PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
STATE_FILE="$HOME/.cache/lexi-nightly/tg-last-update-id"
# Free-text directives the founder texts the bot accumulate here between runs.
# run.sh consumes (and archives) this at the START of each nightly so the
# messages steer that night's lanes. See lib/user-directives.sh.
PENDING_FILE="$HOME/.cache/lexi-nightly/pending-instructions.ndjson"
FB_DIR="$PROJECT_DIR/docs/nightly/feedback"
TODAY="$(date +%Y-%m-%d)"
TG="$PROJECT_DIR/scripts/nightly/lib/telegram.sh"

mkdir -p "$(dirname "$STATE_FILE")" "$FB_DIR"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "feedback-poll: TELEGRAM_BOT_TOKEN unset — skipping"
  exit 0
fi

# The feedback-daemon (KeepAlive launchd job) long-polls getUpdates continuously
# and writes the SAME pending-instructions buffer this script does. Telegram
# allows only ONE getUpdates per bot token, so polling here while the daemon runs
# makes BOTH fail with "Conflict: terminated by other getUpdates request" — which
# silently cost ~5 nights of founder feedback. When the daemon is alive, skip:
# its buffer already has everything, and run.sh's consume_user_directives reads
# the same PENDING_FILE. Poll only as a FALLBACK when the daemon is down.
# (Detection overridable via NIGHTLY_DAEMON_CHECK so the guard is unit-testable.)
feedback_daemon_running() {
  if [ -n "${NIGHTLY_DAEMON_CHECK:-}" ]; then eval "$NIGHTLY_DAEMON_CHECK"; return $?; fi
  pgrep -f "scripts/nightly/lib/feedback-daemon.sh" >/dev/null 2>&1
}
if feedback_daemon_running; then
  echo "feedback-poll: feedback-daemon is the sole poller — skipping redundant getUpdates (its buffer feeds consume_user_directives)"
  exit 0
fi

LAST_ID=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
OFFSET=$((LAST_ID + 1))

# Fetch up to 100 updates since LAST_ID. Long-poll timeout=2s.
# allowed_updates = ["callback_query","message"] — button taps AND free-text
# directives. %2C = comma.
RESP=$(curl -sS --max-time 15 \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${OFFSET}&timeout=2&allowed_updates=%5B%22callback_query%22%2C%22message%22%5D")

OK=$(echo "$RESP" | jq -r '.ok // false')
if [ "$OK" != "true" ]; then
  echo "feedback-poll: getUpdates failed — $(echo "$RESP" | jq -r '.description // "unknown"')"
  exit 0
fi

COUNT=$(echo "$RESP" | jq '.result | length')
if [ "$COUNT" = "0" ]; then
  echo "feedback-poll: no new callbacks since update_id=$LAST_ID"
  exit 0
fi

echo "feedback-poll: $COUNT new update(s) since update_id=$LAST_ID"

# Parse each callback into a structured record. Keys:
#   update_id, ts (epoch), from_user, callback_data (type:action:id), msg_text
NEW_RECORDS=$(echo "$RESP" | jq -c '.result[]
  | select(.callback_query != null)
  | {
      update_id: .update_id,
      ts: .callback_query.message.date,
      from_user: .callback_query.from.username,
      callback_data: .callback_query.data,
      callback_id: .callback_query.id,
      msg_text_first120: ((.callback_query.message.text // "") | .[0:120])
    }')

# Append to today's accumulator (newline-delimited JSON for easy parsing)
if [ -n "$NEW_RECORDS" ]; then
  echo "$NEW_RECORDS" >> "$FB_DIR/${TODAY}.ndjson"
  echo "feedback-poll: appended callback record(s) to $FB_DIR/${TODAY}.ndjson"
fi

# --- free-text directives --------------------------------------------------
# Messages the founder TEXTS the bot (not button taps) become directives for
# the NEXT nightly run. Persist the full text to the pending accumulator and
# confirm receipt so the founder knows the channel is live. Skip slash-commands.
MSG_RECORDS=$(echo "$RESP" | jq -c '.result[]
  | select(.message.text != null)
  | select((.message.text | startswith("/")) | not)
  | {
      update_id: .update_id,
      ts: .message.date,
      from_user: (.message.from.username // .message.from.first_name // "founder"),
      text: .message.text
    }')

if [ -n "$MSG_RECORDS" ]; then
  echo "$MSG_RECORDS" >> "$PENDING_FILE"
  echo "$MSG_RECORDS" >> "$FB_DIR/${TODAY}.ndjson"
  MSG_N=$(echo "$MSG_RECORDS" | grep -c '')
  echo "feedback-poll: queued $MSG_N directive(s) for next nightly → $PENDING_FILE"
  echo "$MSG_RECORDS" | while read -r rec; do
    [ -z "$rec" ] && continue
    snippet=$(echo "$rec" | jq -r '.text' | head -c 60)
    "$TG" msg "✓ queued for next nightly: _${snippet}_" >/dev/null 2>&1 || true
  done
fi

# Acknowledge each callback so the user's UI clears.
# CRITICAL: Telegram callback queries expire in ~60s. This script runs every
# 5 min via com.claude.nightly-feedback-poll launchd plist, so taps get acked
# within 5 min worst case (typically <2 min).
echo "$RESP" | jq -r '.result[] | select(.callback_query != null) | .callback_query.id' | while read -r CQID; do
  [ -z "$CQID" ] && continue
  ACK_RESP=$(curl -sS --max-time 5 -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery" \
    --data-urlencode "callback_query_id=${CQID}" \
    --data-urlencode "text=✓ recorded — affects next nightly")
  ACK_OK=$(echo "$ACK_RESP" | jq -r '.ok // false')
  if [ "$ACK_OK" != "true" ]; then
    ACK_DESC=$(echo "$ACK_RESP" | jq -r '.description // ""')
    echo "feedback-poll: ack failed for $CQID — $ACK_DESC"
  fi
done

# Update last-seen pointer
NEW_MAX=$(echo "$RESP" | jq '[.result[].update_id] | max // 0')
echo "$NEW_MAX" > "$STATE_FILE"
echo "feedback-poll: last_update_id=$NEW_MAX"
