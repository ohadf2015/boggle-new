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
  local _resp _ok _desc
  _resp=$(curl -sS --max-time 30 -X POST \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}" \
    "$@") || { echo "telegram: curl failed (network/timeout) — $method" >&2; return 1; }
  _ok=$(printf '%s' "$_resp" | jq -r '.ok // false' 2>/dev/null)
  [ "$_ok" = "true" ] && return 0
  _desc=$(printf '%s' "$_resp" | jq -r '.description // empty' 2>/dev/null | head -c 200)
  # An operational ALERT must never be silenced by cosmetic formatting. Telegram
  # rejects the WHOLE message when parse_mode=Markdown sees an unbalanced entity
  # (a lone backtick/underscore/`*` in a path or error snippet) → "can't parse
  # entities" (2026-07-02: the docs-only-salvage alert failed exactly this way, so
  # the all-code drop went unannounced). Retry ONCE as PLAIN TEXT — strip the
  # parse_mode pair from the args. Delivery beats formatting.
  if printf '%s' "$_desc" | grep -qiE "parse entities|can'?t parse|must be encoded in UTF-8|entit"; then
    local -a _plain=(); local _a
    for _a in "$@"; do
      case "$_a" in
        parse_mode=*) unset '_plain[$(( ${#_plain[@]} - 1 ))]'; _plain=("${_plain[@]}"); continue ;;
      esac
      _plain+=("$_a")
    done
    _resp=$(curl -sS --max-time 30 -X POST \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}" \
      "${_plain[@]}") || { echo "telegram: plain-text retry curl failed — $method" >&2; return 1; }
    _ok=$(printf '%s' "$_resp" | jq -r '.ok // false' 2>/dev/null)
    if [ "$_ok" = "true" ]; then
      echo "telegram: delivered on plain-text retry ($method) after markdown/UTF-8 rejection: $_desc" >&2
      return 0
    fi
    _desc=$(printf '%s' "$_resp" | jq -r '.description // empty' 2>/dev/null | head -c 200)
  fi
  echo "telegram: send FAILED — $method: $_desc" >&2
  return 1
}

# Valid-UTF-8-only + byte-safe truncation. `${text:0:N}` is char-safe only under a
# UTF-8 locale; launchd's env may be C → byte-slice that splits a multibyte char
# (Hebrew/emoji in the digest) → Telegram "must be encoded in UTF-8". `iconv -c`
# drops invalid/partial sequences; cap at 3900 BYTES (< the 4096-char API limit).
_tg_sanitize() {
  printf '%s' "$1" | head -c 3900 | iconv -c -f UTF-8 -t UTF-8 2>/dev/null || printf '%s' "$1" | head -c 3900
}

cmd_msg() {
  local text; text=$(_tg_sanitize "$1")
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
  local text; text=$(_tg_sanitize "$1")
  local kbd_json="$2"
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

# Dispatch only when EXECUTED, not when sourced (so tests can source the functions).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  case "${1:-}" in
    msg)    shift; cmd_msg    "$@" ;;
    doc)    shift; cmd_doc    "$@" ;;
    alert)  shift; cmd_alert  "$@" ;;
    kbd)    shift; cmd_kbd    "$@" ;;
    answer) shift; cmd_answer "$@" ;;
    *)      echo "usage: $0 {msg|doc|alert|kbd|answer} ..." >&2; exit 1 ;;
  esac
fi
