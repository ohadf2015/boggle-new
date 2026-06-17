#!/bin/bash
# Tests for lib/mcp-probe.sh — the preflight MCP transport probe.
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=/dev/null
source "$DIR/lib/mcp-probe.sh"

pass=0; fail=0
assert() { # <name> <test-expr>
  if eval "$2"; then printf '    \xE2\x9C\x93 %s\n' "$1"; pass=$((pass+1))
  else printf '    \xE2\x9C\x97 %s\n' "$1"; fail=$((fail+1)); fi
}

echo "── mcp-probe: mcp_handshake_verdict (pure initialize-reply→verdict) ──"
OK1='{"result":{"protocolVersion":"2024-11-05","capabilities":{},"serverInfo":{"name":"supabase"}}}'
OK2='{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05"}}'
assert "valid result+protocolVersion → ok" "[[ \"\$(mcp_handshake_verdict '$OK1')\" == 'ok' ]]"
assert "valid result (id first) → ok"       "[[ \"\$(mcp_handshake_verdict '$OK2')\" == 'ok' ]]"
# THE 06-17 SURFACE: npx failed to connect → empty reply → must be transport fail, never ok.
assert "empty reply (npx boot/connect failed) → fail:transport" "[[ \"\$(mcp_handshake_verdict '')\" == fail:transport* ]]"
assert "empty reply is NOT ok (no false-green on the real failure)" "[[ \"\$(mcp_handshake_verdict '')\" != ok* ]]"
assert "JSON-RPC error reply → fail:handshake" "[[ \"\$(mcp_handshake_verdict '{\"error\":{\"code\":-32000}}')\" == fail:handshake* ]]"
assert "garbage reply → fail:transport(unrecognized)" "[[ \"\$(mcp_handshake_verdict 'npm ERR! 404')\" == fail:transport* ]]"

echo "── mcp-probe: probe_mcp_server_boot non-fatal skip contract ──"
OUT=$(probe_mcp_server_boot supabase /nonexistent/claude.json); RC=$?
assert "missing claude.json → returns 0 (non-fatal)" "[ $RC -eq 0 ]"
assert "missing claude.json → prints skip"           "[[ \"\$OUT\" == *skip* ]]"
TMP=$(mktemp); printf '{\"mcpServers\":{}}' > "$TMP"
OUT2=$(probe_mcp_server_boot supabase "$TMP"); RC2=$?
assert "unconfigured server → returns 0 (non-fatal)" "[ $RC2 -eq 0 ]"
assert "unconfigured server → prints skip"           "[[ \"\$OUT2\" == *skip* ]]"
rm -f "$TMP"

echo
echo "mcp-probe: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
