#!/bin/bash
# mcp-probe.sh — preflight TRANSPORT probe for the npx-stdio MCP servers (supabase, sentry).
#
# WHY this exact surface: on 2026-06-17 the run lost all supabase work because the server
# `npx -y @supabase/mcp-server-supabase` "✗ Failed to connect" — and stayed failed the whole
# 96-min run (lane-01 saw it `pending` → ToolSearch found no tools; lane-02 saw `status:failed`).
# The TOKEN was valid the whole time (it still authenticates today) — so an auth/REST check would
# have falsely reported OK. The real failure is the npx boot + MCP handshake (registry resolve /
# stdio transport), so THAT is what we probe: spawn the server exactly as the lanes do and require
# a JSON-RPC `initialize` result back. Side benefit: a successful probe WARMS the npx package cache,
# so the per-lane boots that follow resolve from disk instead of re-hitting the registry.
#
# This COMPLEMENTS (does not replace) preflight_check()'s `claude mcp list` retry loop — it pins the
# concrete failure surface + warms the cache, and gives an alertable verdict. Non-fatal by contract.
#
# Tested by test/mcp-probe.test.sh.

# mcp_handshake_verdict <first_response_line> — PURE: classify the server's initialize reply.
mcp_handshake_verdict() {
  local line="$1"
  if [ -z "$line" ]; then printf 'fail:transport(no response — npx boot/connect failed)'; return; fi
  case "$line" in
    *'"result"'*'"protocolVersion"'*|*'"protocolVersion"'*'"result"'*|*'"result"'*'"serverInfo"'*)
      printf 'ok' ;;
    *'"error"'*) printf 'fail:handshake(server returned error)' ;;
    *)           printf 'fail:transport(unrecognized reply)' ;;
  esac
}

# _mcp_server_field <claude_json> <server> <jq_expr> — extract one field, empty on miss.
_mcp_server_field() { jq -r ".mcpServers.\"$2\"$3 // empty" "$1" 2>/dev/null; }

# probe_mcp_server_boot <server> [claude_json] [timeout_secs] — spawn the server EXACTLY as
# configured (command+args+env) and pipe an MCP `initialize`; print "ok"/"fail:…" verdict.
# Returns 0 on ok/skip (non-fatal), 1 on a live transport/handshake failure.
probe_mcp_server_boot() {
  # Default 45s (was 30s): npx-stdio MCP boot (supabase/sentry) does an npm-registry resolve
  # per cold boot that can exceed 30s under lane-warmup load → false "no response" timeout
  # (supabase probe fail, 2026-06-28). 45s matches run.sh's MCP_TIMEOUT=45000 intent.
  local server="$1" cj="${2:-${CLAUDE_CONFIG_JSON:-$HOME/.claude.json}}" to="${3:-45}"
  command -v jq  >/dev/null 2>&1 || { printf '%s MCP probe: skip(no jq)\n' "$server";        return 0; }
  command -v npx >/dev/null 2>&1 || { printf '%s MCP probe: skip(no npx)\n' "$server";       return 0; }
  [ -f "$cj" ]                   || { printf '%s MCP probe: skip(no claude.json)\n' "$server"; return 0; }
  local cmd; cmd=$(_mcp_server_field "$cj" "$server" '.command')
  [ -n "$cmd" ] || { printf '%s MCP probe: skip(not configured)\n' "$server"; return 0; }

  # args[] → array; env{} → KEY=VALUE exports for the child only. while-read (not mapfile)
  # to stay bash-3.2-safe — macOS /bin/bash is 3.2 and the rest of the nightly avoids mapfile.
  local args=() envkv=() _line
  while IFS= read -r _line; do [ -n "$_line" ] && args+=("$_line"); done \
    < <(jq -r ".mcpServers.\"$server\".args[]? // empty" "$cj" 2>/dev/null)
  while IFS= read -r _line; do [ -n "$_line" ] && envkv+=("$_line"); done \
    < <(jq -r ".mcpServers.\"$server\".env | to_entries[]? | \"\(.key)=\(.value)\"" "$cj" 2>/dev/null)

  local init='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"nightly-probe","version":"1"}}}'
  # Resolve a timeout binary (macOS has gtimeout from coreutils, not bare timeout). If neither
  # exists, run bare — `head -1` closing the pipe bounds a well-behaved server anyway.
  local to_bin; to_bin=$(command -v gtimeout || command -v timeout || true)
  # ${arr[@]+"${arr[@]}"} so an EMPTY array doesn't trip `set -u` under bash 3.2 (same idiom run.sh uses).
  local resp
  if [ -n "$to_bin" ]; then
    resp=$(printf '%s\n' "$init" | env ${envkv[@]+"${envkv[@]}"} "$to_bin" "$to" "$cmd" ${args[@]+"${args[@]}"} 2>/dev/null | head -1)
  else
    resp=$(printf '%s\n' "$init" | env ${envkv[@]+"${envkv[@]}"} "$cmd" ${args[@]+"${args[@]}"} 2>/dev/null | head -1)
  fi
  local verdict; verdict=$(mcp_handshake_verdict "$resp")
  printf '%s MCP probe: %s\n' "$server" "$verdict"
  [ "$verdict" = "ok" ]
}

# probe_supabase_mcp [claude_json] — convenience wrapper for the supabase server.
probe_supabase_mcp() { probe_mcp_server_boot supabase "${1:-}"; }
