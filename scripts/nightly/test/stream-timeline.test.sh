#!/bin/bash
# Test for lib/stream-timeline.py — the observability fix that makes a hung MCP
# tool call ATTRIBUTABLE.
#
# Background: lanes ran `claude -p` in text output mode, which prints only the
# FINAL assistant message. A lane that hung mid-tool never produced one → the run
# log showed 20 min of total silence then exit 124, so we could never tell WHICH
# MCP call hung (every diagnosis was inference). Switching to
# `--output-format stream-json --verbose` streams every tool_use/tool_result as
# it happens; this filter collapses that firehose into a compact, greppable
# timeline so the LAST `▶ <tool>` with no matching `✓ <tool>` is the hung call.
#
# THE GUARANTEE under test:
#   Given a stream-json NDJSON stream where a tool_use is issued but never gets a
#   tool_result (a hang), the timeline ends on that tool's ▶ line — naming the
#   exact provider/tool that hung — and shows a useful input preview (e.g. the
#   SQL / Sentry query). Completed calls show a ✓/✗ result line.
#
# Run: bash scripts/nightly/test/stream-timeline.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
FILTER="$HERE/../lib/stream-timeline.py"

PASS=0; FAIL=0
assert() { # name ; condition-string
  if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi
}

# A realistic stream-json transcript: init → a Bash call that COMPLETES → a
# Supabase execute_sql call that HANGS (tool_use, no tool_result, process killed).
STREAM=$(cat <<'NDJSON'
{"type":"system","subtype":"init","mcp_servers":[{"name":"sentry","status":"connected"},{"name":"supabase","status":"connected"},{"name":"posthog","status":"connected"}]}
{"type":"assistant","message":{"content":[{"type":"text","text":"Let me check."}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","id":"toolu_AAA","name":"Bash","input":{"command":"echo hi"}}]}}
{"type":"user","message":{"content":[{"type":"tool_result","tool_use_id":"toolu_AAA","content":"hi","is_error":false}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","id":"toolu_BBB","name":"mcp__supabase__execute_sql","input":{"query":"SELECT count(*) FROM leaderboard WHERE created_at > now() - interval '7 days'"}}]}}
not-json-garbage-line-should-be-ignored
NDJSON
)

echo "── stream-timeline: hung tool is the last line, named, with preview ──"
OUT=$(printf '%s\n' "$STREAM" | python3 "$FILTER" 2>&1)

assert "init line names the connected MCP servers"        'echo "$OUT" | grep -qiE "init.*(sentry|supabase|posthog)"'
assert "Bash tool_use shows a ▶ line"                     'echo "$OUT" | grep -qE "Bash"'
assert "Bash completion shows a result line"              'echo "$OUT" | grep -E "Bash" | grep -qE "✓|RESULT|result"'
assert "hung tool (execute_sql) shows a ▶ line"           'echo "$OUT" | grep -q "mcp__supabase__execute_sql"'
assert "SQL query preview is surfaced"                    'echo "$OUT" | grep -q "leaderboard"'
# The hang's signature: execute_sql is the LAST event and has NO result line.
assert "LAST timeline line is the hung execute_sql call"  'echo "$OUT" | grep -vE "^[[:space:]]*$" | tail -1 | grep -q "mcp__supabase__execute_sql"'
assert "hung tool has NO matching result line"            '! echo "$OUT" | grep "mcp__supabase__execute_sql" | grep -qE "✓|✗"'
assert "garbage non-JSON line is dropped (not crashed)"   '! echo "$OUT" | grep -q "garbage"'

echo "── stream-timeline: headless wires stream-json + verbose + sidecar ──"
HEADLESS="$HERE/../lib/headless.sh"
assert "headless uses --output-format stream-json" 'grep -qE -- "--output-format stream-json" "$HEADLESS"'
assert "headless uses --verbose"                   'grep -qE -- "--verbose" "$HEADLESS"'
assert "headless pipes through stream-timeline"    'grep -q "stream-timeline" "$HEADLESS"'
assert "headless writes a per-lane ndjson sidecar" 'grep -qE "ndjson|stream.*sidecar|\.stream" "$HEADLESS"'

echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
