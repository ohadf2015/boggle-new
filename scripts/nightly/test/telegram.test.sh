#!/bin/bash
# Unit test for telegram.sh resilience — the operational ALERT path must NEVER be
# silenced by cosmetic formatting or a locale-truncated multibyte char. On 2026-07-02
# the docs-only-salvage alert (announcing an all-lane-code drop) failed with
# "can't parse entities" + "must be encoded in UTF-8" and the drop went unannounced.
# Run: bash scripts/nightly/test/telegram.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/telegram.sh"   # source-guard means the dispatcher does NOT run

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi; }

echo "telegram: _tg_sanitize + parse_mode-strip unit test"
echo

echo "── _tg_sanitize: byte-safe truncation never emits invalid UTF-8 ──"
LONG=$(printf 'shalom שלום 🚨%.0s' $(seq 1 400))   # multibyte-heavy, well over 3900 bytes
OUT=$(_tg_sanitize "$LONG")
BYTES=$(printf '%s' "$OUT" | wc -c | tr -d ' ')
assert "sanitized output is valid UTF-8 (no split trailing char)" "printf '%s' \"$OUT\" | iconv -f UTF-8 -t UTF-8 >/dev/null 2>&1"
assert "sanitized output capped at <= 3900 bytes (under the 4096 API limit)" "[ $BYTES -le 3900 ]"
assert "short ASCII text passes through unchanged" "[ \"\$(_tg_sanitize 'hello')\" = 'hello' ]"

echo "── parse_mode strip: plain-text retry drops the parse_mode pair (delivery beats formatting) ──"
strip_parse_mode() {   # mirrors the retry filter inside _tg_post
  local -a _plain=(); local _a
  for _a in "$@"; do
    case "$_a" in
      parse_mode=*) unset '_plain[$(( ${#_plain[@]} - 1 ))]'; _plain=("${_plain[@]}"); continue ;;
    esac
    _plain+=("$_a")
  done
  printf '%s\n' "${_plain[@]}"
}
ARGS=(--data-urlencode 'chat_id=123' --data-urlencode 'text=hi *unbalanced_' --data-urlencode 'parse_mode=Markdown' --data-urlencode 'disable_web_page_preview=true')
STRIPPED=$(strip_parse_mode "${ARGS[@]}")
assert "parse_mode value is removed on retry" "! printf '%s' \"$STRIPPED\" | grep -q 'parse_mode'"
assert "its preceding --data-urlencode flag is also removed (6 lines remain)" "[ \$(printf '%s' \"$STRIPPED\" | grep -c .) -eq 6 ]"
assert "the text payload survives the strip" "printf '%s' \"$STRIPPED\" | grep -q 'text=hi'"

echo
echo "telegram: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
