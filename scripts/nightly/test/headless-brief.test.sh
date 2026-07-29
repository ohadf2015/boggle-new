#!/bin/bash
# Test for the __BRIEF__ wiring added to lib/headless.sh (spec §6). Proves the
# rendered prompt that headless_run hands to `claude` has __BRIEF__ replaced with
# this lane's brief slice (and existing __FEEDBACK_SUMMARY__ still substitutes).
# Stubs `claude` to capture its -p argument; no real LLM/MCP.
#
# Run: bash scripts/nightly/test/headless-brief.test.sh
set -uo pipefail

LIB="$(cd "$(dirname "$0")/../lib" && pwd)"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t headlessbrief.XXXXXX)
export PROJECT_DIR="$ROOT/proj"; mkdir -p "$PROJECT_DIR"
BIN="$ROOT/bin"; mkdir -p "$BIN"
export HEADLESS_CAPTURE="$ROOT/captured-prompt.txt"
export ACTIVE_DIRECTIVES_FILE="$ROOT/no-directives.md"   # nonexistent → none prepended
trap 'rm -rf "$ROOT"' EXIT

# brief.json with an item routed to 02-perf.
export BRIEF_JSON_FILE="$ROOT/brief.json"
cat > "$BRIEF_JSON_FILE" <<'JSON'
{"_meta":{"generated_at":"2026-05-29T02:00:00Z","n_signals":1,"sources_ok":["posthog"],"sources_stale":[]},
 "items":[],
 "by_lane":{"02-perf":[{"title":"Slow LCP on /en/multiplayer","metric":"lcp_avg_ms","reach":0,"severity":0.9,"effort":"M","target_metric":"posthog:lcp:/en/multiplayer","evidence":"/en/multiplayer","score":0.9}]}}
JSON

# Stub claude: capture the prompt passed via -p, output nothing (timeline tolerates).
cat > "$BIN/claude" <<'STUB'
#!/bin/bash
prev=""
for a in "$@"; do
  [ "$prev" = "-p" ] && printf '%s' "$a" > "$HEADLESS_CAPTURE"
  prev="$a"
done
exit 0
STUB
chmod +x "$BIN/claude"

# Prompt fixture containing both placeholders + a sentinel.
PROMPT="$ROOT/lane-prompt.md"
printf 'LANE BODY SENTINEL\n\nBRIEF:\n__BRIEF__\n\nFEEDBACK:\n__FEEDBACK_SUMMARY__\n' > "$PROMPT"

# shellcheck disable=SC1091
. "$LIB/headless.sh"

echo "headless: __BRIEF__ substitution end-to-end (stubbed claude)"
PATH="$BIN:$PATH" headless_run "02-perf" "$PROMPT" "sonnet" 20 "$ROOT/lane.log" >/dev/null 2>&1

assert "captured the rendered prompt"        '[ -s "$HEADLESS_CAPTURE" ]'
assert "lane body preserved"                 'grep -q "LANE BODY SENTINEL" "$HEADLESS_CAPTURE"'
assert "__BRIEF__ was substituted (no literal left)" '! grep -q "__BRIEF__" "$HEADLESS_CAPTURE"'
assert "brief slice injected (LCP item)"     'grep -q "Slow LCP on /en/multiplayer" "$HEADLESS_CAPTURE"'
assert "brief item shows score"              'grep -q "score 0.9" "$HEADLESS_CAPTURE"'
assert "__FEEDBACK_SUMMARY__ still substitutes" '! grep -q "__FEEDBACK_SUMMARY__" "$HEADLESS_CAPTURE"'
assert "artifact contract still prepended"   'grep -qi "MANDATORY MINIMUM ARTIFACT" "$HEADLESS_CAPTURE"'

echo "headless: lane with NO brief items → fallback contract, no literal token"
export BRIEF_JSON_FILE="$ROOT/brief.json"   # 02-perf has items; 06-seo has none
printf '__BRIEF__\n' > "$PROMPT"
PATH="$BIN:$PATH" headless_run "06-seo" "$PROMPT" "sonnet" 20 "$ROOT/lane2.log" >/dev/null 2>&1
assert "no literal __BRIEF__ for empty lane" '! grep -q "__BRIEF__" "$HEADLESS_CAPTURE"'
assert "fallback contract text present"      'grep -qi "ONE quick targeted discovery" "$HEADLESS_CAPTURE"'

echo
echo "headless-brief: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
