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
  curl -sS -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}" \
    "$@" \
    | jq -r '.ok // false' >/dev/null
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

case "${1:-}" in
  msg)   shift; cmd_msg   "$@" ;;
  doc)   shift; cmd_doc   "$@" ;;
  alert) shift; cmd_alert "$@" ;;
  *)     echo "usage: $0 {msg|doc|alert} ..." >&2; exit 1 ;;
esac
