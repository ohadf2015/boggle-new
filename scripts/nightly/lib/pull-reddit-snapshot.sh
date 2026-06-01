#!/bin/bash
# pull-reddit-snapshot.sh — capture real Reddit threads via the founder's REAL
# logged-in Chrome (Playwriter), writing docs/nightly/intel/reddit-latest.json.
#
# WHY this exists / when to use it: every PROGRAMMATIC Reddit path is blocked as of
# 2026-05 — the Data API needs manual moderation approval, old/www .json returns
# 403+HTML for all UAs, and Anthropic's WebSearch/WebFetch crawler is reddit-blocked.
# The only channel that still works is an authenticated *browser* session reading
# old.reddit (normal human browsing). reddit-fetch.sh now PREFERS a fresh snapshot, so
# priming one here makes lane 04's existing `reddit-fetch.sh feed …` calls return real
# threads UNATTENDED — no code change in the lane, no OAuth app required.
#
# INTERACTIVE: needs Chrome open + the Playwriter extension + a logged-in reddit tab.
# Run it yourself, or from a DAYTIME cron while logged in — NOT at midnight. The 02:00
# run reads whatever snapshot you primed; reddit-fetch.sh flags it stale after 3 days.
#
# Skips gracefully (exit 0, never overwrites the last good file with nothing) when the
# extension is offline or every fetch errors — mirrors lib/pull-revenue-snapshot.sh.
set -uo pipefail

PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${REDDIT_SNAPSHOT_OUT:-$PROJECT_DIR/docs/nightly/intel/reddit-latest.json}"
PW="${PLAYWRITER_BIN:-playwriter}"

# Subreddit feeds + discovery searches lane 04 researches (prompts/04-competitor.md).
FEEDS=(wordgames words puzzles boardgames)
SEARCHES=("wordle alternative" "word game recommendation" "looking for a word game")

# reddit_snapshot_compose <captured_at> <json-array-or-error-obj>... → snapshot JSON.
# Merges every input that is a JSON ARRAY (ignoring {"error":…} objects + non-arrays),
# dedups posts by permalink, sorts by score desc. Pure — no browser, fully testable.
reddit_snapshot_compose() {
  local ts="$1"; shift
  printf '%s\n' "$@" | jq -s --arg ts "$ts" '
    [ .[] | select(type == "array") | .[] ]
    | unique_by(.permalink)
    | sort_by(-(.score // 0))
    | {captured_at: $ts, source: "playwriter-reddit-snapshot", reddit: .}'
}

# Browser orchestration only runs when executed directly (sourcing loads the function).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  mkdir -p "$(dirname "$OUT")"

  command -v "$PW" >/dev/null 2>&1 \
    || { echo "reddit-snapshot: playwriter CLI not found — skipping (install: npm i -g playwriter@latest)"; exit 0; }

  # One shared browser session reused across every fetch (reddit-browser-fetch.sh reads
  # PLAYWRITER_SESSION; without it each call would open its own tab).
  SID=$("$PW" session new 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | tr -d '[:space:]')
  if [ -z "$SID" ] || ! [[ "$SID" =~ ^[0-9]+$ ]]; then
    echo "reddit-snapshot: playwriter session start failed — Chrome/extension offline? Skipping."
    exit 0
  fi
  echo "reddit-snapshot: session=$SID"
  export PLAYWRITER_SESSION="$SID"

  RESULTS=()
  for sub in "${FEEDS[@]}"; do
    echo "reddit-snapshot: feed r/$sub"
    RESULTS+=("$("$LIB_DIR/reddit-browser-fetch.sh" feed "$sub" top week 25)")
  done
  for q in "${SEARCHES[@]}"; do
    echo "reddit-snapshot: search \"$q\""
    RESULTS+=("$("$LIB_DIR/reddit-browser-fetch.sh" search "$q" relevance month 25)")
  done

  SNAP=$(reddit_snapshot_compose "$NOW" "${RESULTS[@]}")
  CNT=$(printf '%s' "$SNAP" | jq -r '.reddit | length' 2>/dev/null || echo 0)
  if [ "${CNT:-0}" -eq 0 ]; then
    echo "reddit-snapshot: 0 posts captured (all fetches errored / reddit not logged in) — NOT overwriting $OUT (keeping last good snapshot)"
    exit 0
  fi
  printf '%s\n' "$SNAP" > "$OUT"
  echo "reddit-snapshot: wrote $OUT ($CNT posts across ${#FEEDS[@]} feeds + ${#SEARCHES[@]} searches)"
  jq -r '"  captured_at=\(.captured_at)  posts=\(.reddit|length)  subs=\([.reddit[].subreddit]|unique|join(\",\"))"' "$OUT" 2>/dev/null || true
fi
