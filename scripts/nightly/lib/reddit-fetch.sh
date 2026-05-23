#!/bin/bash
# reddit-fetch.sh — fetch Reddit listings/search as compact JSON via LOCAL curl
# with a descriptive User-Agent.
#
# WHY: the nightly's lane 4 spent 5 nights (2026-05-19→23) failing on Reddit via
# the WebFetch tool — that fetches from Anthropic's service IP with no UA control,
# which Reddit 403/429s. Reddit's gate is User-Agent + client based, NOT IP based:
# a local `curl` with a descriptive UA returns HTTP 200 + real JSON (verified
# 2026-05-23). No auth needed for public listings/search. So lane 4 should call
# THIS (via Bash) instead of WebFetch.
#
# Usage:
#   reddit-fetch.sh feed   <subreddit> [sort=top] [t=week] [limit=25]
#   reddit-fetch.sh search <query>     [sort=relevance] [t=week] [limit=25]
#
# Output: a compact JSON array of {title,score,num_comments,permalink,author,
# selftext(500)} on success, or {"error":...} on failure. ALWAYS exits 0 so a
# lane never blocks on Reddit being down.
set -uo pipefail

# Reddit recommends a unique descriptive UA: <platform>:<app>:<version> (by /u/<user>)
UA="${REDDIT_USER_AGENT:-macos:lexiclash-nightly:v1.0 (by /u/lexiclash)}"

_emit_err() { echo "{\"error\":\"$1\"}"; exit 0; }

_parse() {
  # stdin = raw listing JSON → compact array. Empty/invalid → error object.
  jq -c '
    if (.data.children | type) == "array" then
      [ .data.children[].data
        | { title, score, num_comments, permalink, author,
            subreddit, created_utc,
            selftext: ((.selftext // "")[0:500]) } ]
    else
      {"error":"unexpected reddit response shape"}
    end' 2>/dev/null || echo '{"error":"jq parse failed"}'
}

_get() { # $1=url
  curl -s -m 20 -A "$UA" "$1" 2>/dev/null
}

MODE="${1:-}"; shift || true
case "$MODE" in
  feed)
    SUB="${1:?usage: reddit-fetch.sh feed <subreddit> [sort] [t] [limit]}"
    SORT="${2:-top}"; T="${3:-week}"; LIMIT="${4:-25}"
    URL="https://www.reddit.com/r/${SUB}/${SORT}.json?t=${T}&limit=${LIMIT}&raw_json=1"
    ;;
  search)
    Q="${1:?usage: reddit-fetch.sh search <query> [sort] [t] [limit]}"
    SORT="${2:-relevance}"; T="${3:-week}"; LIMIT="${4:-25}"
    # URL-encode the query (spaces/specials) via jq.
    QENC=$(printf '%s' "$Q" | jq -sRr @uri)
    URL="https://www.reddit.com/search.json?q=${QENC}&sort=${SORT}&t=${T}&limit=${LIMIT}&raw_json=1"
    ;;
  *)
    _emit_err "usage: reddit-fetch.sh feed|search ..."
    ;;
esac

RESP=$(_get "$URL")
[ -z "$RESP" ] && _emit_err "empty response from reddit (network/blocked) for: $URL"
# Reddit error bodies are JSON too; surface them rather than crashing.
if echo "$RESP" | jq -e '.error' >/dev/null 2>&1; then
  CODE=$(echo "$RESP" | jq -r '.error')
  _emit_err "reddit returned error $CODE for: $URL"
fi
echo "$RESP" | _parse
