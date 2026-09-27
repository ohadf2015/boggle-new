#!/bin/bash
# user-directives.sh — consume the founder's free-text Telegram messages into
# the active directive block for THIS nightly run.
#
# feedback-poll.sh / feedback-daemon.sh append founder texts to
#   ~/.cache/lexi-nightly/pending-instructions.ndjson   (one JSON obj per line)
#
# At the START of each run, consume_user_directives():
#   1. truncates ACTIVE_DIRECTIVES_FILE (so a directiveless run prepends nothing)
#   2. ATOMICALLY moves the pending file to consumed/<ts>.ndjson BEFORE rendering
#      — a crash mid-render therefore cannot double-apply the same directive
#   3. renders the texts into ACTIVE_DIRECTIVES_FILE as a markdown bullet block
#
# headless.sh reads ACTIVE_DIRECTIVES_FILE and PREPENDS it (highest priority)
# to every lane prompt, so the founder's texts steer that night's lanes.

PENDING_FILE="${PENDING_FILE:-$HOME/.cache/lexi-nightly/pending-instructions.ndjson}"
ACTIVE_DIRECTIVES_FILE="${ACTIVE_DIRECTIVES_FILE:-$HOME/.cache/lexi-nightly/active-directives.md}"
CONSUMED_DIR="${CONSUMED_DIR:-$HOME/.cache/lexi-nightly/consumed}"

# consume_user_directives — render pending founder texts into the active block.
# Echoes a one-line status. Returns 0 always (a feedback channel hiccup must
# never abort the nightly).
consume_user_directives() {
  mkdir -p "$(dirname "$ACTIVE_DIRECTIVES_FILE")" "$CONSUMED_DIR"
  : > "$ACTIVE_DIRECTIVES_FILE"

  if [ ! -s "$PENDING_FILE" ]; then
    echo "user-directives: none pending"
    return 0
  fi

  local archived="$CONSUMED_DIR/$(date +%Y%m%d-%H%M%S).ndjson"
  # ATOMIC consume: move first, render second.
  mv "$PENDING_FILE" "$archived" 2>/dev/null || { echo "user-directives: mv failed"; return 0; }

  local n
  n=$(grep -c '' "$archived" 2>/dev/null || echo 0)
  if [ "$n" = "0" ]; then
    echo "user-directives: archived file empty"
    return 0
  fi

  {
    echo "═══ FOUNDER DIRECTIVES — HIGHEST PRIORITY (texted to the bot, this run) ═══"
    echo "The founder sent these instructions for tonight. If a directive is in"
    echo "scope for YOUR lane, treat it as the TOP priority and act on it now. If"
    echo "it belongs to a different lane, note it in one line and skip it — another"
    echo "lane owns it. Never ask the founder anything; act autonomously."
    echo
    /usr/bin/env python3 - "$archived" <<'PY'
import sys, json
seen = set()
for line in open(sys.argv[1], encoding='utf-8'):
    line = line.strip()
    if not line:
        continue
    try:
        rec = json.loads(line)
    except Exception:
        continue
    t = (rec.get('text') or '').strip()
    if not t or t in seen:
        continue
    seen.add(t)
    # Collapse internal newlines so each directive stays one bullet.
    t = ' '.join(t.split())
    print(f"- {t}")
PY
    echo
    echo "═══════════════════════════════════════════════════════════════════════"
  } > "$ACTIVE_DIRECTIVES_FILE"

  echo "user-directives: consumed $n msg(s) → $ACTIVE_DIRECTIVES_FILE (archived $archived)"
}
