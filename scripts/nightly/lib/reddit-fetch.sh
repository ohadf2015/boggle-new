#!/bin/bash
# reddit-fetch.sh — fetch Reddit listings/search as compact JSON.
#
# WHY OAUTH (2026-05-30): the old UA-only curl to www.reddit.com/*.json now returns
# HTTP 403 + an HTML block page for ALL User-Agent variants (verified: 403, 189 KB HTML)
# — Reddit tightened the unauthenticated JSON gate. The OAuth token endpoint is still
# reachable (HTTP 401 with no creds, not IP-blocked), so authenticated access via
# oauth.reddit.com is the viable path. This script:
#   - with REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET → obtains a bearer token and queries
#     https://oauth.reddit.com (PASSWORD grant if REDDIT_USERNAME+REDDIT_PASSWORD are set
#     — most reliable for a "script"-type app; else CLIENT_CREDENTIALS app-only).
#   - with no creds (or if token exchange fails) → falls back to the legacy UA curl
#     against www.reddit.com (still 403 today, but graceful — never blocks the lane).
#
# Setup: docs/nightly/reddit-oauth-setup.md. Create a "script" app at
# reddit.com/prefs/apps, then set REDDIT_CLIENT_ID/SECRET (+ USERNAME/PASSWORD) in
# ~/.config/lexi-nightly/env.
#
# Usage:
#   reddit-fetch.sh feed   <subreddit> [sort=top] [t=week] [limit=25]
#   reddit-fetch.sh search <query>     [sort=relevance] [t=week] [limit=25]
#
# Output: compact JSON array of {title,score,num_comments,permalink,author,subreddit,
# created_utc,selftext(500)} on success, or {"error":...} on failure. ALWAYS exits 0.
# Tested by test/reddit-fetch.test.sh.
set -uo pipefail

# Reddit recommends a unique descriptive UA: <platform>:<app>:<version> (by /u/<user>)
UA="${REDDIT_USER_AGENT:-macos:lexiclash-nightly:v1.0 (by /u/lexiclash)}"
TOKEN_CACHE="${REDDIT_TOKEN_CACHE:-${TMPDIR:-/tmp}/reddit-oauth-$(id -u 2>/dev/null || echo 0).tok}"

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

# _snapshot_fresh <iso8601 captured_at> <max_days> → rc 0 fresh · rc 1 stale/bad.
_snapshot_fresh() {
  local cap="$1" max="${2:-3}" caps now
  [ -n "$cap" ] || return 1
  caps=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$cap" +%s 2>/dev/null || date -d "$cap" +%s 2>/dev/null || echo 0)
  now=$(date +%s 2>/dev/null || echo 0)
  [ "$caps" -gt 0 ] && [ "$now" -ge "$caps" ] && [ $(( now - caps )) -lt $(( max * 86400 )) ]
}

# _snapshot_slice <snapshot_json> <mode> <selector> <limit> → compact JSON array.
# feed → posts in the named subreddit; search → posts whose title/selftext contain
# any (>2-char) query word. Same field shape as the live _parse output.
_snapshot_slice() {
  jq -c --arg mode "$2" --arg sel "$3" --argjson lim "${4:-25}" '
    (.reddit // []) as $posts
    | ( if $mode == "feed" then
          [ $posts[] | select((.subreddit // "" | ascii_downcase) == ($sel | ascii_downcase)) ]
        elif $mode == "search" then
          ( $sel | ascii_downcase | split(" ") | map(select(length > 2)) ) as $terms
          | [ $posts[]
              | ((((.title // "") + " " + (.selftext // "")) | ascii_downcase)) as $hay
              | select( ($terms | length) == 0 or any($terms[]; . as $t | $hay | contains($t))) ]
        else $posts end )
    | .[0:$lim]' <<<"$1" 2>/dev/null || printf '[]'
}

# Obtain (or reuse a cached) OAuth bearer token. Echoes the token on success, empty on
# failure. Needs REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET.
_get_token() {
  [ -n "${REDDIT_CLIENT_ID:-}" ] && [ -n "${REDDIT_CLIENT_SECRET:-}" ] || return 1
  # Reuse a fresh cached token (tokens live 3600s; refresh comfortably before expiry).
  if [ -s "$TOKEN_CACHE" ]; then
    local mtime now age
    mtime=$(stat -f %m "$TOKEN_CACHE" 2>/dev/null || stat -c %Y "$TOKEN_CACHE" 2>/dev/null || echo 0)
    now=$(date +%s 2>/dev/null || echo 0)
    age=$(( now - mtime ))
    if [ "$age" -ge 0 ] && [ "$age" -lt 3000 ]; then cat "$TOKEN_CACHE"; return 0; fi
  fi
  local resp tok
  if [ -n "${REDDIT_USERNAME:-}" ] && [ -n "${REDDIT_PASSWORD:-}" ]; then
    resp=$(curl -s -m 20 -A "$UA" -u "${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}" \
             --data-urlencode "grant_type=password" \
             --data-urlencode "username=${REDDIT_USERNAME}" \
             --data-urlencode "password=${REDDIT_PASSWORD}" \
             "https://www.reddit.com/api/v1/access_token" 2>/dev/null)
  else
    resp=$(curl -s -m 20 -A "$UA" -u "${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}" \
             --data-urlencode "grant_type=client_credentials" \
             "https://www.reddit.com/api/v1/access_token" 2>/dev/null)
  fi
  tok=$(echo "$resp" | jq -r '.access_token // empty' 2>/dev/null)
  [ -n "$tok" ] || return 1
  ( umask 177; printf '%s' "$tok" > "$TOKEN_CACHE" ) 2>/dev/null || true
  printf '%s' "$tok"
}

_get() { # $1=url ; uses $BEARER if set (oauth host), else UA-only (legacy host)
  if [ -n "${BEARER:-}" ]; then
    curl -s -m 20 -A "$UA" -H "Authorization: bearer $BEARER" "$1" 2>/dev/null
  else
    curl -s -m 20 -A "$UA" "$1" 2>/dev/null
  fi
}

# Reddit RSS still returns HTTP 200 to a BROWSER UA from a residential IP (a different
# gate than the 403'd JSON API — verified 2026-06-03: JSON 403/189KB, RSS 200). RSS is
# the only fully-autonomous Reddit signal needing no OAuth app. Reddit serves RSS to
# feed-readers/browsers; the descriptive API UA can be throttled, so use a browser UA.
RSS_UA="${REDDIT_RSS_UA:-Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36}"

# _reddit_rss → compact JSON array (same shape as _parse) from the RSS endpoint for
# the current MODE/args, or empty on failure. score/num_comments come back null (RSS
# omits them). Honors REDDIT_RSS_CMD as a test seam (stands in for the curl).
_reddit_rss() {
  local rssurl
  case "$MODE" in
    feed)   rssurl="https://www.reddit.com/r/${SUB}/${SORT}.rss?t=${T}&limit=${LIMIT}" ;;
    search) rssurl="https://www.reddit.com/search.rss?q=$(printf '%s' "$Q" | jq -sRr @uri)&sort=${SORT}&t=${T}&limit=${LIMIT}" ;;
    *) return 1 ;;
  esac
  local xml
  if [ -n "${REDDIT_RSS_CMD:-}" ]; then
    xml=$(eval "$REDDIT_RSS_CMD" 2>/dev/null)
  else
    xml=$(curl -s -m 20 -A "$RSS_UA" "$rssurl" 2>/dev/null)
  fi
  [ -n "$xml" ] || return 1
  printf '%s' "$xml" | python3 "$(dirname "${BASH_SOURCE[0]}")/reddit-rss-parse.py" "${LIMIT}" 2>/dev/null
}

# --- parse args (needed by BOTH the snapshot slice and the network query) ---
MODE="${1:-}"; shift || true
case "$MODE" in
  feed)
    SUB="${1:?usage: reddit-fetch.sh feed <subreddit> [sort] [t] [limit]}"
    SORT="${2:-top}"; T="${3:-week}"; LIMIT="${4:-25}"; SEL="$SUB"
    ;;
  search)
    Q="${1:?usage: reddit-fetch.sh search <query> [sort] [t] [limit]}"
    SORT="${2:-relevance}"; T="${3:-week}"; LIMIT="${4:-25}"; SEL="$Q"
    ;;
  *)
    _emit_err "usage: reddit-fetch.sh feed|search ..."
    ;;
esac

# --- PREFER a fresh founder-primed browser snapshot ----------------------------
# Reddit's anonymous JSON gate is 403 and the Data API needs manual moderation
# approval, so the only path that works UNATTENDED is a snapshot the founder primed
# from a real logged-in browser (lib/pull-reddit-snapshot.sh → docs/nightly/intel/
# reddit-latest.json). When it exists, is fresh, and has matching posts, serve from
# it and skip the (likely-403) network entirely. Otherwise fall through to OAuth/UA.
SNAP_FILE="${REDDIT_SNAPSHOT:-$(cd "$(dirname "$0")/../../.." 2>/dev/null && pwd)/docs/nightly/intel/reddit-latest.json}"
if [ -f "$SNAP_FILE" ] && jq empty "$SNAP_FILE" 2>/dev/null; then
  _cap=$(jq -r '.captured_at // ""' "$SNAP_FILE" 2>/dev/null)
  if _snapshot_fresh "$_cap" "${REDDIT_SNAPSHOT_MAX_DAYS:-3}"; then
    _slice=$(_snapshot_slice "$(cat "$SNAP_FILE")" "$MODE" "$SEL" "$LIMIT")
    if [ "$(printf '%s' "$_slice" | jq -r 'length' 2>/dev/null || echo 0)" -gt 0 ]; then
      printf '%s\n' "$_slice"; exit 0
    fi
  fi
fi

# --- network path: oauth.reddit.com when we have a token, else legacy www host ---
BEARER=""
if BEARER=$(_get_token); then HOST="https://oauth.reddit.com"; else BEARER=""; HOST="https://www.reddit.com"; fi
case "$MODE" in
  feed)   URL="${HOST}/r/${SUB}/${SORT}.json?t=${T}&limit=${LIMIT}&raw_json=1" ;;
  search) QENC=$(printf '%s' "$Q" | jq -sRr @uri); URL="${HOST}/search.json?q=${QENC}&sort=${SORT}&t=${T}&limit=${LIMIT}&raw_json=1" ;;
esac

RESP=$(_get "$URL")

# If the unauthenticated JSON host gave nothing usable (403 block page / empty / error
# body / unexpected shape) AND we have no OAuth bearer, fall back to Reddit RSS — a
# different gate that still serves 200. RSS lacks score/comments (→ null) but yields the
# real titles/permalinks/authors/content lanes need. Only when NOT on the oauth host (a
# valid bearer already returns full JSON). Skipped when REDDIT_RSS_CMD is unset in tests
# whose curl stub returns a valid listing (the JSON path stays the tested happy path).
_json_usable=1
if [ -z "$RESP" ]; then _json_usable=0
elif echo "$RESP" | jq -e '.error' >/dev/null 2>&1; then _json_usable=0
elif ! echo "$RESP" | jq -e '(.data.children | type) == "array"' >/dev/null 2>&1; then _json_usable=0
fi
if [ "$_json_usable" = "0" ] && [ -z "${BEARER:-}" ]; then
  _rss=$(_reddit_rss)
  if [ -n "$_rss" ] && [ "$(printf '%s' "$_rss" | jq -r 'length' 2>/dev/null || echo 0)" -gt 0 ]; then
    printf '%s\n' "$_rss"; exit 0
  fi
fi

[ -z "$RESP" ] && _emit_err "empty response from reddit (network/blocked) for: $URL"
# Reddit error bodies are JSON too; surface them rather than crashing.
if echo "$RESP" | jq -e '.error' >/dev/null 2>&1; then
  CODE=$(echo "$RESP" | jq -r '.error')
  _emit_err "reddit returned error $CODE for: $URL"
fi
echo "$RESP" | _parse
