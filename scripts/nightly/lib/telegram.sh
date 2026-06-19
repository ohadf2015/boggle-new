#!/bin/bash
# telegram.sh — thin bot wrapper.
# Subcommands:
#   msg "text"            → sendMessage (markdown). Caps at 4000 chars (truncates).
#   doc <path> "caption"  → sendDocument with markdown caption.
#   alert "text"          → msg with 🚨 prefix.
#
# Sources env from ~/.config/lexi-nightly/env if not already in env.
# Silent no-op if TELEGRAM_BOT_TOKEN unset (dry-run / smoke).

set -uo pipefail

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] && [ -f "$HOME/.config/lexi-nightly/env" ]; then
  set -a; . "$HOME/.config/lexi-nightly/env"; set +a
fi

_tg_post() {
  local method="$1"; shift
  if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
    echo "telegram: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID unset — skipping $method" >&2
    return 0
  fi
  # --max-time guards against a network stall hanging the whole run on the final
  # digest send (curl had no timeout). Capture the result so a failed send (400/
  # 401/429/timeout) is no longer invisible — surface it to stderr (→ RUN_LOG).
  local _resp _ok
  _resp=$(curl -sS --max-time 30 -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}" \
    "$@") || { echo "telegram: curl failed (network/timeout) — $method" >&2; return 1; }
  _ok=$(printf '%s' "$_resp" | jq -r '.ok // false' 2>/dev/null)
  if [ "$_ok" != "true" ]; then
    echo "telegram: send FAILED — $method: $(printf '%s' "$_resp" | jq -r '.description // empty' 2>/dev/null | head -c 200)" >&2
    return 1
  fi
}

cmd_msg() {
  local text="$1"
  # 4096 cap; reserve 96 for tail marker
  if [ ${#text} -gt 4000 ]; then
    text="${text:0:4000}…(truncated)"
  fi
  _tg_post sendMessage \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" \
    --data-urlencode "parse_mode=Markdown" \
    --data-urlencode "disable_web_page_preview=true"
}

cmd_doc() {
  local path="$1"
  local caption="${2:-}"
  if [ ! -f "$path" ]; then
    echo "telegram: file not found: $path" >&2
    return 1
  fi
  _tg_post sendDocument \
    -F "chat_id=${TELEGRAM_CHAT_ID}" \
    -F "document=@${path}" \
    -F "caption=${caption}" \
    -F "parse_mode=Markdown"
}

cmd_alert() {
  cmd_msg "🚨 *nightly-loop alert*\n\n$1"
}

# kbd <text> <buttons_json>
# Send a message with an inline-keyboard. buttons_json is the inline_keyboard
# array per Telegram's spec — e.g.
#   '[[{"text":"👍 Will post","callback_data":"redditpick:will_post:abc"},{"text":"👎 Skip","callback_data":"redditpick:skip:abc"}]]'
# Each callback_data MUST be ≤64 bytes (Telegram limit).
cmd_kbd() {
  local text="$1"
  local kbd_json="$2"
  if [ ${#text} -gt 4000 ]; then
    text="${text:0:4000}…(truncated)"
  fi
  _tg_post sendMessage \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" \
    --data-urlencode "parse_mode=Markdown" \
    --data-urlencode "disable_web_page_preview=true" \
    --data-urlencode "reply_markup={\"inline_keyboard\":${kbd_json}}"
}

# answer <callback_query_id> [text]
# Acknowledge a button press so Telegram clears the loading spinner.
cmd_answer() {
  local cqid="$1"
  local toast="${2:-Recorded — thanks!}"
  _tg_post answerCallbackQuery \
    --data-urlencode "callback_query_id=${cqid}" \
    --data-urlencode "text=${toast}"
}

case "${1:-}" in
  msg)    shift; cmd_msg    "$@" ;;
  doc)    shift; cmd_doc    "$@" ;;
  alert)  shift; cmd_alert  "$@" ;;
  kbd)    shift; cmd_kbd    "$@" ;;
  answer) shift; cmd_answer "$@" ;;
  *)      echo "usage: $0 {msg|doc|alert|kbd|answer} ..." >&2; exit 1 ;;
esac
