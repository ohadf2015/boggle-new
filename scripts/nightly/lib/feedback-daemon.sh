#!/bin/bash
# feedback-daemon.sh — persistent Telegram long-poll daemon.
#
# Why this exists: the 5-min cron polling we tried first was too slow.
# Telegram's effective callback_query TTL turned out to be < 30s (the API
# rejected 31-second-old queries). Only a long-poll daemon that acks
# within milliseconds keeps the button UI clean.
#
# Loop body:
#   getUpdates ?timeout=30&allowed_updates=callback_query   (long-poll)
#   for each callback: answerCallbackQuery FIRST (within ms of receive)
#   then append to docs/nightly/feedback/<date>.ndjson
#   bump last_update_id
#   repeat forever
#
# Launchd KeepAlive=true keeps the daemon running. On hard error it sleeps
# 5s and retries — getUpdates failures are transient.

set -uo pipefail

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] && [ -f "$HOME/.config/lexi-nightly/env" ]; then
  set -a; . "$HOME/.config/lexi-nightly/env"; set +a
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "feedback-daemon: no TELEGRAM_BOT_TOKEN — exiting"
  exit 1
fi

PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
STATE_FILE="$HOME/.cache/lexi-nightly/tg-last-update-id"
FB_DIR="$PROJECT_DIR/docs/nightly/feedback"
LOG_PREFIX="feedback-daemon"

mkdir -p "$(dirname "$STATE_FILE")" "$FB_DIR"

echo "[$LOG_PREFIX] started pid=$$ at $(date +%H:%M:%S)"

while true; do
  LAST_ID=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
  OFFSET=$((LAST_ID + 1))

  # Long-poll with 30s server-side timeout. Curl gets 35s ceiling.
  RESP=$(curl -sS --max-time 35 \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${OFFSET}&timeout=30&allowed_updates=%5B%22callback_query%22%5D" 2>/dev/null) || RESP='{"ok":false,"description":"curl error"}'

  OK=$(echo "$RESP" | jq -r '.ok // false' 2>/dev/null)
  if [ "$OK" != "true" ]; then
    DESC=$(echo "$RESP" | jq -r '.description // "unknown"' 2>/dev/null)
    echo "[$LOG_PREFIX] getUpdates failed — $DESC; sleeping 5s"
    sleep 5
    continue
  fi

  COUNT=$(echo "$RESP" | jq '.result | length' 2>/dev/null || echo 0)
  if [ "$COUNT" = "0" ]; then
    # No updates in 30s window — long-poll returned empty, loop immediately.
    continue
  fi

  echo "[$LOG_PREFIX] $COUNT callback(s) received at $(date +%H:%M:%S)"

  # ACK IMMEDIATELY — within milliseconds of receive — before any other work.
  echo "$RESP" | jq -r '.result[] | select(.callback_query != null) | .callback_query.id' | while read -r CQID; do
    [ -z "$CQID" ] && continue
    ACK=$(curl -sS --max-time 3 -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery" \
      --data-urlencode "callback_query_id=${CQID}" \
      --data-urlencode "text=✓ recorded — affects next nightly")
    ACK_OK=$(echo "$ACK" | jq -r '.ok // false' 2>/dev/null)
    if [ "$ACK_OK" = "true" ]; then
      echo "[$LOG_PREFIX]   acked $CQID"
    else
      echo "[$LOG_PREFIX]   ACK FAIL $CQID — $(echo "$ACK" | jq -r '.description' 2>/dev/null)"
    fi
  done

  # Append records to today's ndjson
  TODAY=$(date +%Y-%m-%d)
  echo "$RESP" | jq -c '.result[]
    | select(.callback_query != null)
    | {
        update_id: .update_id,
        ts: .callback_query.message.date,
        from_user: .callback_query.from.username,
        callback_data: .callback_query.data,
        callback_id: .callback_query.id,
        msg_text_first120: ((.callback_query.message.text // "") | .[0:120])
      }' >> "$FB_DIR/${TODAY}.ndjson"

  # Persist offset
  NEW_MAX=$(echo "$RESP" | jq '[.result[].update_id] | max // 0')
  echo "$NEW_MAX" > "$STATE_FILE"
  echo "[$LOG_PREFIX]   recorded $COUNT, offset=$NEW_MAX"
done
