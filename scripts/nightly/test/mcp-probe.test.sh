#!/bin/bash
# Tests for lib/mcp-probe.sh — the preflight MCP auth-surface probe.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$DIR/lib/mcp-probe.sh"

pass=0; fail=0
assert() { # <name> <test-expr>
  if eval "$2"; then printf '    \xE2\x9C\x93 %s\n' "$1"; pass=$((pass+1))
  else printf '    \xE2\x9C\x97 %s\n' "$1"; fail=$((fail+1)); fi
}

echo "── mcp-probe: mcp_probe_verdict (pure status→verdict) ──"
assert "200 → ok"                 "[[ \"\$(mcp_probe_verdict 200)\" == 'ok' ]]"
assert "201 → ok"                 "[[ \"\$(mcp_probe_verdict 201)\" == 'ok' ]]"
assert "204 → ok"                 "[[ \"\$(mcp_probe_verdict 204)\" == 'ok' ]]"
assert "401 → fail:auth"          "[[ \"\$(mcp_probe_verdict 401)\" == fail:auth* ]]"
assert "403 → fail:auth"          "[[ \"\$(mcp_probe_verdict 403)\" == fail:auth* ]]"
assert "000 → fail:unreachable"   "[[ \"\$(mcp_probe_verdict 000)\" == fail:unreachable* ]]"
assert "500 → fail:http"          "[[ \"\$(mcp_probe_verdict 500)\" == 'fail:http(500)' ]]"
assert "empty → fail:no-status"   "[[ \"\$(mcp_probe_verdict '')\" == 'fail:no-status' ]]"
assert "ok verdict is the ONLY one starting 'ok'" "[[ \"\$(mcp_probe_verdict 500)\" != ok* ]]"

echo "── mcp-probe: probe_supabase_mcp non-fatal skip contract ──"
# Missing config → must SKIP (print skip, return 0) and NEVER fail the run.
OUT=$(probe_supabase_mcp /nonexistent/claude.json); RC=$?
assert "missing claude.json → returns 0 (non-fatal)" "[ $RC -eq 0 ]"
assert "missing claude.json → prints skip"           "[[ \"\$OUT\" == *skip* ]]"
# Config present but no supabase token → skip, not fail.
TMP=$(mktemp); printf '{\"mcpServers\":{}}' > "$TMP"
OUT2=$(probe_supabase_mcp "$TMP"); RC2=$?
assert "no token/ref in config → returns 0 (non-fatal)" "[ $RC2 -eq 0 ]"
assert "no token/ref in config → prints skip"           "[[ \"\$OUT2\" == *skip* ]]"
rm -f "$TMP"

echo
echo "mcp-probe: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
