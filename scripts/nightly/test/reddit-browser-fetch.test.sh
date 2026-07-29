#!/bin/bash
# Test for lib/reddit-browser-fetch.sh — pure URL builder (no browser needed).
# Run: bash scripts/nightly/test/reddit-browser-fetch.test.sh
set -uo pipefail
SCRIPT="$(cd "$(dirname "$0")/../lib" && pwd)/reddit-browser-fetch.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

# sourcing must NOT run the browser block (BASH_SOURCE guard)
. "$SCRIPT"
echo "  reddit-browser-fetch (url builder):"

U=$(reddit_browser_url feed wordgames top week 10)
assert "feed → old.reddit r/sub/sort with t+limit" "[ \"$U\" = 'https://old.reddit.com/r/wordgames/top/?t=week&limit=10' ]"

U=$(reddit_browser_url feed dailygames new day 25)
assert "feed honors sort/t/limit args" "[ \"$U\" = 'https://old.reddit.com/r/dailygames/new/?t=day&limit=25' ]"

U=$(reddit_browser_url search "word game launch" relevance week 10)
assert "search → url-encoded query" "echo \"$U\" | grep -q 'old.reddit.com/search?q=word%20game%20launch&sort=relevance&t=week'"

reddit_browser_url bogus x y z 1 && R=0 || R=1
assert "bad mode → nonzero" "[ $R -eq 1 ]"

echo; echo "  reddit-browser-fetch: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
