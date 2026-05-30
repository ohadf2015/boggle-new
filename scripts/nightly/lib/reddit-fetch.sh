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

# Pick host: authenticated oauth.reddit.com when we have a token, else legacy www host.
BEARER=""
if BEARER=$(_get_token); then HOST="https://oauth.reddit.com"; else BEARER=""; HOST="https://www.reddit.com"; fi

MODE="${1:-}"; shift || true
case "$MODE" in
  feed)
    SUB="${1:?usage: reddit-fetch.sh feed <subreddit> [sort] [t] [limit]}"
    SORT="${2:-top}"; T="${3:-week}"; LIMIT="${4:-25}"
    URL="${HOST}/r/${SUB}/${SORT}.json?t=${T}&limit=${LIMIT}&raw_json=1"
    ;;
  search)
    Q="${1:?usage: reddit-fetch.sh search <query> [sort] [t] [limit]}"
    SORT="${2:-relevance}"; T="${3:-week}"; LIMIT="${4:-25}"
    QENC=$(printf '%s' "$Q" | jq -sRr @uri)
    URL="${HOST}/search.json?q=${QENC}&sort=${SORT}&t=${T}&limit=${LIMIT}&raw_json=1"
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
