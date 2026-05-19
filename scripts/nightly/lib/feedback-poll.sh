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
FB_DIR="$PROJECT_DIR/docs/nightly/feedback"
TODAY="$(date +%Y-%m-%d)"
TG="$PROJECT_DIR/scripts/nightly/lib/telegram.sh"

mkdir -p "$(dirname "$STATE_FILE")" "$FB_DIR"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
  echo "feedback-poll: TELEGRAM_BOT_TOKEN unset — skipping"
  exit 0
fi

LAST_ID=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
OFFSET=$((LAST_ID + 1))

# Fetch up to 100 updates since LAST_ID. Long-poll timeout=2s.
RESP=$(curl -sS --max-time 15 \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${OFFSET}&timeout=2&allowed_updates=%5B%22callback_query%22%5D")

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

echo "feedback-poll: $COUNT new callback(s) since update_id=$LAST_ID"

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
  echo "feedback-poll: appended $COUNT record(s) to $FB_DIR/${TODAY}.ndjson"
fi

# Acknowledge each callback so the user's UI clears
echo "$RESP" | jq -r '.result[] | select(.callback_query != null) | .callback_query.id' | while read -r CQID; do
  [ -z "$CQID" ] && continue
  "$TG" answer "$CQID" "✓ recorded for next run" >/dev/null 2>&1 || true
done

# Update last-seen pointer
NEW_MAX=$(echo "$RESP" | jq '[.result[].update_id] | max // 0')
echo "$NEW_MAX" > "$STATE_FILE"
echo "feedback-poll: last_update_id=$NEW_MAX"
