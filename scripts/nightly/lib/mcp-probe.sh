#!/bin/bash
# mcp-probe.sh — preflight connectivity probe for the npx-stdio MCP servers (supabase,
# sentry). WHY: those servers boot via `npx -y <pkg>` and authenticate a token against a
# management API; when the npm resolve is slow or the token is rejected, the lane silently
# reports "<server> MCP unavailable" and defers its fixes (the 06-15/06-17 supabase misses).
# This probe checks the SAME auth surface the MCP tools use, BEFORE the lanes run, and prints
# a concrete PASS/FAIL so the failure is OBSERVABLE (loggable + alertable) instead of silent.
# It does NOT prove the npx boot (that is ~2s steady-state, covered by MCP_TIMEOUT=45s); it
# proves the credential the tools depend on actually authenticates today.
#
# Non-fatal by contract: a missing jq/config/token → "skip" + return 0 (never block a run on
# the probe itself). Only a live auth/unreachable failure returns 1 so the caller can alert.
#
# Tested by test/mcp-probe.test.sh.

# mcp_probe_verdict <http_code> — PURE: map an auth-surface HTTP status to a verdict word.
mcp_probe_verdict() {
  case "$1" in
    200|201|204) printf 'ok' ;;
    401|403)     printf 'fail:auth(token rejected, http %s)' "$1" ;;
    000)         printf 'fail:unreachable(no response/timeout)' ;;
    '')          printf 'fail:no-status' ;;
    *)           printf 'fail:http(%s)' "$1" ;;
  esac
}

# _mcp_probe_http <url> <bearer> — emit the HTTP status (000 on connect failure). 8s cap.
_mcp_probe_http() {
  curl -s -o /dev/null -m 8 -w '%{http_code}' -H "Authorization: Bearer $2" "$1" 2>/dev/null || printf '000'
}

# probe_supabase_mcp [claude_json] — verify the supabase MCP auth surface (Management API,
# the exact endpoint get_advisors/execute_sql/apply_migration authenticate against).
# Prints "supabase MCP probe: <verdict>"; returns 0 on ok/skip, 1 on a live fail.
probe_supabase_mcp() {
  local cj="${1:-${CLAUDE_CONFIG_JSON:-$HOME/.claude.json}}"
  command -v jq   >/dev/null 2>&1 || { printf 'supabase MCP probe: skip(no jq)\n';          return 0; }
  command -v curl >/dev/null 2>&1 || { printf 'supabase MCP probe: skip(no curl)\n';        return 0; }
  [ -f "$cj" ]                    || { printf 'supabase MCP probe: skip(no claude.json)\n';  return 0; }
  local tok ref
  tok=$(jq -r '.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN // empty' "$cj" 2>/dev/null)
  ref=$(jq -r '.mcpServers.supabase.args[]?' "$cj" 2>/dev/null | sed -n 's/^--project-ref=//p' | head -1)
  [ -n "$tok" ] && [ -n "$ref" ] || { printf 'supabase MCP probe: skip(no token/ref in config)\n'; return 0; }
  local code verdict
  code=$(_mcp_probe_http "https://api.supabase.com/v1/projects/$ref" "$tok")
  verdict=$(mcp_probe_verdict "$code")
  printf 'supabase MCP probe: %s\n' "$verdict"
  [ "$verdict" = "ok" ]
}
