#!/bin/bash
# Test for lib/pull-reddit-snapshot.sh — the pure compose/merge function. The browser
# block is guarded by BASH_SOURCE so sourcing the script only loads the function.
#
# Run: bash scripts/nightly/test/pull-reddit-snapshot.test.sh
set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")/../lib" && pwd)/pull-reddit-snapshot.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

# shellcheck disable=SC1090
source "$SCRIPT"

echo "  pull-reddit-snapshot (compose):"

A='[{"title":"A","score":3,"num_comments":1,"permalink":"https://www.reddit.com/r/x/a","author":"p","subreddit":"wordgames","created_utc":1,"selftext":""}]'
B='[{"title":"B","score":9,"num_comments":4,"permalink":"https://www.reddit.com/r/x/b","author":"q","subreddit":"words","created_utc":2,"selftext":""},{"title":"A-dup","score":3,"num_comments":1,"permalink":"https://www.reddit.com/r/x/a","author":"p","subreddit":"wordgames","created_utc":1,"selftext":""}]'
ERR='{"error":"playwriter not found"}'
EMPTY='[]'

SNAP=$(reddit_snapshot_compose "2026-06-01T00:00:00Z" "$A" "$B" "$ERR" "$EMPTY")

assert "stamps the source label" "echo '$SNAP' | jq -e '.source==\"playwriter-reddit-snapshot\"' >/dev/null"
assert "preserves captured_at" "echo '$SNAP' | jq -e '.captured_at==\"2026-06-01T00:00:00Z\"' >/dev/null"
assert "merges arrays + dedups by permalink (3 raw → 2 unique)" "echo '$SNAP' | jq -e '.reddit|length==2' >/dev/null"
assert "ignores {error} objects (no error leaks into posts)" "echo '$SNAP' | jq -e '[.reddit[]|select(.error)]|length==0' >/dev/null"
assert "sorts by score desc (B=9 first)" "echo '$SNAP' | jq -e '.reddit[0].title==\"B\"' >/dev/null"
assert "keeps the live post field shape (title/score/permalink/subreddit)" \
  "echo '$SNAP' | jq -e '.reddit[0]|has(\"title\") and has(\"score\") and has(\"permalink\") and has(\"subreddit\")' >/dev/null"

# All-error / all-empty inputs → a valid snapshot with zero posts (caller skips the write).
SNAP0=$(reddit_snapshot_compose "2026-06-01T00:00:00Z" "$ERR" "$EMPTY")
assert "all-error inputs → 0 posts (valid JSON, empty array)" "echo '$SNAP0' | jq -e '.reddit|length==0' >/dev/null"

echo; echo "  pull-reddit-snapshot (compose): $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
