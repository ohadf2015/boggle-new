#!/bin/bash
# Test for lib/reddit-fetch.sh OAuth support (stubbed curl — no live Reddit).
# Proves:
#   - with client creds + username/password → PASSWORD grant token exchange, then
#     queries oauth.reddit.com with `Authorization: bearer <token>`
#   - with client creds only → CLIENT_CREDENTIALS grant
#   - no creds → falls back to UA www.reddit.com (legacy path), no token call
#   - token exchange failure with creds → graceful degrade to UA www.reddit.com
#   - always exits 0; output parses to the compact array
#
# Run: bash scripts/nightly/test/reddit-fetch.test.sh
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")/../lib" && pwd)/reddit-fetch.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t redditfetchtest.XXXXXX); trap 'rm -rf "$ROOT"' EXIT
BIN="$ROOT/bin"; mkdir -p "$BIN"

# Stub curl: logs the full arg list, emits token JSON for access_token, a listing for
# any reddit listing/search URL. TOKEN_FAIL=1 makes the token exchange return no token.
cat > "$BIN/curl" <<'STUB'
#!/bin/bash
echo "$*" >> "$CALLS_LOG"
args="$*"
if [[ "$args" == *"access_token"* ]]; then
  if [ "${TOKEN_FAIL:-0}" = "1" ]; then echo '{"error":"invalid_grant"}'; else
    echo '{"access_token":"TOKABC","token_type":"bearer","expires_in":3600}'; fi
elif [[ "$args" == *"reddit.com/r/"* ]] || [[ "$args" == *"reddit.com/search"* ]]; then
  if [ "${LISTING_403:-0}" = "1" ]; then echo '<html><body>403 blocked</body></html>'; else
  echo '{"data":{"children":[{"data":{"title":"T1","score":5,"num_comments":2,"permalink":"/r/x/1","author":"a","subreddit":"wordgames","created_utc":1,"selftext":"hi"}}]}}'; fi
else echo ''; fi
STUB
chmod +x "$BIN/curl"

echo "  reddit-fetch (oauth):"

# Isolate the network-path tests from any real primed snapshot in the repo
# (docs/nightly/intel/reddit-latest.json) — these assert OAuth/UA network behaviour,
# which only runs when NO fresh snapshot is served. The snapshot tests below set
# REDDIT_SNAPSHOT per-call, overriding this.
export REDDIT_SNAPSHOT="$ROOT/no-such-snapshot.json"

# 1 — password grant + oauth.reddit.com query
CALLS="$ROOT/calls1.log"; : > "$CALLS"
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" \
       REDDIT_CLIENT_ID=cid REDDIT_CLIENT_SECRET=sec REDDIT_USERNAME=u REDDIT_PASSWORD=p \
       REDDIT_TOKEN_CACHE="$ROOT/tok1" bash "$SCRIPT" feed wordgames top week 5 )
rc=$?
assert "password grant: output parses to array w/ T1" "echo '$OUT' | jq -e '.[0].title==\"T1\"' >/dev/null"
assert "password grant: token call used grant_type=password" "grep -q 'grant_type=password' '$CALLS'"
assert "password grant: listing hit oauth.reddit.com" "grep -q 'oauth.reddit.com/r/' '$CALLS'"
assert "password grant: sent bearer auth header" "grep -qi 'Authorization: bearer TOKABC' '$CALLS'"
assert "password grant: exit 0" "[ $rc -eq 0 ]"

# 2 — client_credentials grant (no username/password)
CALLS="$ROOT/calls2.log"; : > "$CALLS"
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" \
       REDDIT_CLIENT_ID=cid REDDIT_CLIENT_SECRET=sec \
       REDDIT_TOKEN_CACHE="$ROOT/tok2" bash "$SCRIPT" feed wordgames top week 5 )
assert "app-only: token call used grant_type=client_credentials" "grep -q 'grant_type=client_credentials' '$CALLS'"
assert "app-only: listing hit oauth.reddit.com" "grep -q 'oauth.reddit.com/r/' '$CALLS'"

# 3 — no creds → legacy UA www.reddit.com, no token exchange
CALLS="$ROOT/calls3.log"; : > "$CALLS"
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" REDDIT_TOKEN_CACHE="$ROOT/tok3" bash "$SCRIPT" feed wordgames top week 5 )
rc=$?
assert "no creds: hit www.reddit.com" "grep -q 'www.reddit.com/r/' '$CALLS'"
assert "no creds: NO token exchange" "! grep -q 'access_token' '$CALLS'"
assert "no creds: exit 0" "[ $rc -eq 0 ]"

# 4 — creds present but token exchange fails → degrade to UA www.reddit.com
CALLS="$ROOT/calls4.log"; : > "$CALLS"
OUT=$( CALLS_LOG="$CALLS" TOKEN_FAIL=1 PATH="$BIN:$PATH" \
       REDDIT_CLIENT_ID=cid REDDIT_CLIENT_SECRET=sec \
       REDDIT_TOKEN_CACHE="$ROOT/tok4" bash "$SCRIPT" feed wordgames top week 5 )
rc=$?
assert "token-fail: degraded to www.reddit.com" "grep -q 'www.reddit.com/r/' '$CALLS'"
assert "token-fail: still exit 0" "[ $rc -eq 0 ]"

# 5 — search mode also uses oauth host with creds
CALLS="$ROOT/calls5.log"; : > "$CALLS"
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" \
       REDDIT_CLIENT_ID=cid REDDIT_CLIENT_SECRET=sec \
       REDDIT_TOKEN_CACHE="$ROOT/tok5" bash "$SCRIPT" search "word game" relevance week 5 )
assert "search: hit oauth.reddit.com/search" "grep -q 'oauth.reddit.com/search' '$CALLS'"

echo "  reddit-fetch (rss fallback — autonomous, no creds):"
# 5b — no creds + JSON host returns a 403 block page → fall back to Reddit RSS (the
# residential-IP path that still serves 200). REDDIT_RSS_CMD stands in for the RSS curl.
cat > "$ROOT/rss.xml" <<'RSSXML'
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><category term="wordgames" label="r/wordgames"/>
<entry><title>RSS Post One</title>
<link href="https://www.reddit.com/r/wordgames/comments/abc/rss_post_one/"/>
<author><name>/u/rssuser</name></author>
<published>2026-06-01T10:00:00+00:00</published>
<content type="html">&lt;p&gt;body text&lt;/p&gt; submitted by /u/rssuser</content></entry></feed>
RSSXML
CALLS="$ROOT/calls_rss.log"; : > "$CALLS"
OUT=$( CALLS_LOG="$CALLS" LISTING_403=1 PATH="$BIN:$PATH" REDDIT_TOKEN_CACHE="$ROOT/tokrss" \
       REDDIT_RSS_CMD="cat $ROOT/rss.xml" REDDIT_SNAPSHOT="$ROOT/no-such-snapshot.json" \
       bash "$SCRIPT" feed wordgames top week 5 )
rc=$?
assert "rss fallback: JSON 403 → RSS parsed into compact array" "echo '$OUT' | jq -e '.[0].title==\"RSS Post One\"' >/dev/null"
assert "rss fallback: permalink preserved"                      "echo '$OUT' | jq -e '.[0].permalink|test(\"rss_post_one\")' >/dev/null"
assert "rss fallback: author normalised (no /u/)"               "echo '$OUT' | jq -e '.[0].author==\"rssuser\"' >/dev/null"
assert "rss fallback: score null (RSS omits it)"                "echo '$OUT' | jq -e '.[0].score==null' >/dev/null"
assert "rss fallback: created_utc parsed to epoch"              "echo '$OUT' | jq -e '.[0].created_utc|type==\"number\"' >/dev/null"
assert "rss fallback: still exit 0"                             "[ $rc -eq 0 ]"
# A valid JSON listing must NOT trigger RSS (the tested happy path stays JSON).
CALLS="$ROOT/calls_nojson.log"; : > "$CALLS"
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" REDDIT_TOKEN_CACHE="$ROOT/toknj" \
       REDDIT_RSS_CMD="echo SHOULD_NOT_RUN" REDDIT_SNAPSHOT="$ROOT/no-such-snapshot.json" \
       bash "$SCRIPT" feed wordgames top week 5 )
assert "rss NOT used when JSON listing is usable" "echo '$OUT' | jq -e '.[0].title==\"T1\"' >/dev/null"

# 5c — search on the OAUTH host returns an unusable body (HTML/403/non-listing) → fall back
# to RSS EVEN WITH a bearer. Regression (2026-06-17 lane-04): oauth /search.json can fail
# where the /r feed succeeds, and the old bearer-gated fallback dead-ended in "jq parse failed".
CALLS="$ROOT/calls_search_rss.log"; : > "$CALLS"
OUT=$( CALLS_LOG="$CALLS" LISTING_403=1 PATH="$BIN:$PATH" \
       REDDIT_CLIENT_ID=cid REDDIT_CLIENT_SECRET=sec REDDIT_TOKEN_CACHE="$ROOT/toksr" \
       REDDIT_RSS_CMD="cat $ROOT/rss.xml" REDDIT_SNAPSHOT="$ROOT/no-such-snapshot.json" \
       bash "$SCRIPT" search "word game" relevance week 5 )
rc=$?
assert "oauth search unusable → RSS fallback fires despite bearer" "echo '$OUT' | jq -e '.[0].title==\"RSS Post One\"' >/dev/null"
assert "oauth search fallback: NOT a jq-parse-fail error object"   "! echo '$OUT' | jq -e '.error' >/dev/null 2>&1"
assert "oauth search fallback: exit 0"                             "[ $rc -eq 0 ]"

echo "  reddit-fetch (snapshot):"

NOW_ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OLD_ISO="2020-01-01T00:00:00Z"
mk_snap() {  # $1=captured_at → writes a snapshot fixture, echoes its path
  local f="$ROOT/snap-$RANDOM.json"
  cat > "$f" <<EOF
{"captured_at":"$1","source":"playwriter-reddit-snapshot","reddit":[
 {"title":"SNAP_WG","score":9,"num_comments":3,"permalink":"https://www.reddit.com/r/wordgames/comments/a","author":"z","subreddit":"wordgames","created_utc":1,"selftext":"looking for a wordle alternative game"},
 {"title":"SNAP_PUZ","score":4,"num_comments":1,"permalink":"https://www.reddit.com/r/puzzles/comments/b","author":"y","subreddit":"puzzles","created_utc":2,"selftext":"daily crossword help"}
]}
EOF
  printf '%s' "$f"
}

# 6 — fresh snapshot present → feed served from snapshot, NO network (no curl) at all.
CALLS="$ROOT/calls6.log"; : > "$CALLS"; SNAP=$(mk_snap "$NOW_ISO")
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" REDDIT_SNAPSHOT="$SNAP" \
       REDDIT_TOKEN_CACHE="$ROOT/tok6" bash "$SCRIPT" feed wordgames top week 5 )
rc=$?
assert "fresh snapshot: feed returns the snapshot post (SNAP_WG)" "echo '$OUT' | jq -e '.[0].title==\"SNAP_WG\"' >/dev/null"
assert "fresh snapshot: filtered to the requested subreddit only" "echo '$OUT' | jq -e 'length==1' >/dev/null"
assert "fresh snapshot: NO curl/network call at all" "[ ! -s '$CALLS' ]"
assert "fresh snapshot: exit 0" "[ $rc -eq 0 ]"

# 7 — STALE snapshot → ignored, falls through to the network path (curl called).
CALLS="$ROOT/calls7.log"; : > "$CALLS"; SNAP=$(mk_snap "$OLD_ISO")
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" REDDIT_SNAPSHOT="$SNAP" \
       REDDIT_TOKEN_CACHE="$ROOT/tok7" bash "$SCRIPT" feed wordgames top week 5 )
assert "stale snapshot: falls through to network (www.reddit.com hit)" "grep -q 'www.reddit.com/r/' '$CALLS'"

# 8 — fresh snapshot but requested subreddit absent → empty slice → network fallthrough.
CALLS="$ROOT/calls8.log"; : > "$CALLS"; SNAP=$(mk_snap "$NOW_ISO")
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" REDDIT_SNAPSHOT="$SNAP" \
       REDDIT_TOKEN_CACHE="$ROOT/tok8" bash "$SCRIPT" feed crosswords top week 5 )
assert "snapshot miss (no matching sub): falls through to network" "grep -q 'www.reddit.com/r/' '$CALLS'"

# 9 — fresh snapshot + search → keyword-matched posts served from snapshot, no network.
CALLS="$ROOT/calls9.log"; : > "$CALLS"; SNAP=$(mk_snap "$NOW_ISO")
OUT=$( CALLS_LOG="$CALLS" PATH="$BIN:$PATH" REDDIT_SNAPSHOT="$SNAP" \
       REDDIT_TOKEN_CACHE="$ROOT/tok9" bash "$SCRIPT" search "wordle alternative" relevance week 5 )
assert "snapshot search: matches post by keyword (SNAP_WG)" "echo '$OUT' | jq -e 'any(.[]; .title==\"SNAP_WG\")' >/dev/null"
assert "snapshot search: no network call" "[ ! -s '$CALLS' ]"

echo; echo "  reddit-fetch (oauth+snapshot): $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
