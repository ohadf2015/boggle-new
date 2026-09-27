#!/bin/bash
# Unit test for consume_user_directives() and the Telegram free-text → directive
# pipeline. No network: feeds a captured getUpdates payload through the same jq
# the poll/daemon use, then drives consume over temp files.
# Run: bash scripts/nightly/test/user-directives.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"

PASS=0; FAIL=0
assert() { # name ; condition-string
  if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi
}

# --- the jq the poll/daemon use to extract free-text directives ----------
extract_msgs() {
  jq -c '.result[]
    | select(.message.text != null)
    | select((.message.text | startswith("/")) | not)
    | {update_id, ts: .message.date,
       from_user: (.message.from.username // .message.from.first_name // "founder"),
       text: .message.text}'
}

echo "  scenario 1: extraction keeps free text, drops callbacks + slash-commands"
PAYLOAD='{"ok":true,"result":[
 {"update_id":1,"callback_query":{"id":"c","from":{"username":"o"},"data":"night:good:x","message":{"date":1,"text":"d"}}},
 {"update_id":2,"message":{"date":10,"from":{"username":"o"},"text":"fix en/multiplayer LCP"}},
 {"update_id":3,"message":{"date":11,"from":{"first_name":"O"},"text":"/start"}},
 {"update_id":4,"message":{"date":12,"from":{"username":"o"},"text":"also fix timeouts"}}
]}'
GOT=$(echo "$PAYLOAD" | extract_msgs)
assert "extracts exactly 2 records"        "[ \"\$(echo \"\$GOT\" | grep -c '')\" = 2 ]"
assert "keeps the LCP directive"           "echo \"\$GOT\" | grep -q 'en/multiplayer LCP'"
assert "drops the /start command"          "! echo \"\$GOT\" | grep -q '/start'"
assert "drops the callback_query"          "! echo \"\$GOT\" | grep -q '\"data\"'"

echo "  scenario 2: consume renders, dedups, archives atomically"
export PENDING_FILE; PENDING_FILE=$(mktemp -t pend.XXXXXX)
export ACTIVE_DIRECTIVES_FILE; ACTIVE_DIRECTIVES_FILE=$(mktemp -t act.XXXXXX)
export CONSUMED_DIR; CONSUMED_DIR=$(mktemp -d -t cons.XXXXXX)
# shellcheck disable=SC1091
source "$HERE/../lib/user-directives.sh"
printf '%s\n' \
  '{"update_id":2,"text":"fix en/multiplayer LCP"}' \
  '{"update_id":4,"text":"also fix timeouts"}' \
  '{"update_id":4,"text":"also fix timeouts"}' > "$PENDING_FILE"
consume_user_directives >/dev/null
assert "pending file moved (atomic consume)"       "[ ! -e \"\$PENDING_FILE\" ]"
assert "header rendered"                           "grep -q 'FOUNDER DIRECTIVES' \"\$ACTIVE_DIRECTIVES_FILE\""
assert "2 unique bullets (dedup)"                  "[ \"\$(grep -c '^- ' \"\$ACTIVE_DIRECTIVES_FILE\")\" = 2 ]"
assert "archived to consumed/"                     "ls \"\$CONSUMED_DIR\"/*.ndjson >/dev/null 2>&1"

echo "  scenario 3: directiveless run yields empty active block"
consume_user_directives >/dev/null
assert "active block empty when nothing pending"   "[ ! -s \"\$ACTIVE_DIRECTIVES_FILE\" ]"

rm -rf "$PENDING_FILE" "$ACTIVE_DIRECTIVES_FILE" "$CONSUMED_DIR" 2>/dev/null

echo
printf '  user-directives: %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
