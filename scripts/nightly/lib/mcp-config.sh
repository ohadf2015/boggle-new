#!/bin/bash
# mcp-config.sh — build a minimal per-lane MCP config so a lane boots ONLY the MCP
# servers it actually uses, via `claude --mcp-config <file> --strict-mcp-config`.
#
# WHY: headless lanes run with `--allowedTools '*'` and no strict flag, so every lane
# boots the full global+plugin MCP set (~23 servers: sentry, supabase, posthog, vercel,
# railway, atlassian, figma, rive, mcp-image, context7, ahrefs, fal-ai, …). Boot is only
# ~3% of budget (NOT the headline timeout cause — that's data-starved rediscovery, see
# backfill-tokens.sh) but every unused HTTP/SSE server is latent hang surface. Lanes
# 04/06/07/08 use zero MCP; data lanes use 1–3. Trim is reversible: on any build
# failure the caller simply omits the flags and gets today's behavior.
#
# Tested by test/mcp-config.test.sh.

# lane_id → space-separated MCP server names it needs (empty = none).
_lane_mcp_servers() {
  case "$1" in
    01|01-triage)     echo "sentry supabase posthog" ;;
    02|02-perf)       echo "supabase posthog" ;;
    03|03-engagement) echo "posthog" ;;
    05|05-landing)    echo "posthog mcp-image" ;;
    09|09-monetization) echo "posthog" ;;
    *)                echo "" ;;
  esac
}

# build_lane_mcp_config <lane_id> <out_file> [claude_json]
# Writes {"mcpServers":{…}} with only this lane's needed servers (those that exist in
# claude.json; missing names are skipped). Empty-needs lanes get {"mcpServers":{}} →
# zero servers boot. Returns 0 on success, nonzero if a NEEDY lane cannot be built
# (no jq / no claude.json / invalid output) so the caller can fall back to no-strict.
build_lane_mcp_config() {
  local lane="$1" out="$2"
  local claude_json="${3:-${CLAUDE_CONFIG_JSON:-$HOME/.claude.json}}"
  local servers; servers=$(_lane_mcp_servers "$lane")

  # Lane needs no MCP → empty config. No jq/claude.json required.
  if [ -z "$servers" ]; then
    printf '{"mcpServers":{}}\n' > "$out" 2>/dev/null || return 1
    chmod 600 "$out" 2>/dev/null || true
    return 0
  fi

  command -v jq >/dev/null 2>&1 || return 1
  [ -f "$claude_json" ] || return 1

  # Split on whitespace explicitly (don't rely on unquoted word-splitting, which some
  # shells disable) → JSON array of wanted server names.
  local want_arr=() names_json
  read -ra want_arr <<< "$servers"
  names_json=$(printf '%s\n' "${want_arr[@]}" | jq -R . | jq -sc .) || return 1
  jq --argjson want "$names_json" \
     '{mcpServers: ((.mcpServers // {}) | to_entries
                    | map(select(.key as $k | $want | index($k))) | from_entries)}' \
     "$claude_json" > "$out" 2>/dev/null || return 1
  chmod 600 "$out" 2>/dev/null || true
  jq -e '.mcpServers | type == "object"' "$out" >/dev/null 2>&1 || return 1
  return 0
}
