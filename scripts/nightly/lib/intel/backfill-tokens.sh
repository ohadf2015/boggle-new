#!/bin/bash
# backfill-tokens.sh — populate empty Phase-0 collector tokens from ~/.claude.json.
#
# WHY: the Sentry + Supabase intel collectors gate on env tokens (SENTRY_AUTH_TOKEN,
# SUPABASE_ACCESS_TOKEN, …). When those are unset the collectors degrade to a
# TOKEN_MISSING stale snapshot, the intel brief comes back empty for those sources,
# and the lanes' "brief-first, don't re-scan" contract has nothing to act on — so they
# fall back to expensive broad rediscovery (30–50 grep/find sweeps over fe-next/) and
# blow their wall-clock budget. The working tokens already live on the same machine in
# ~/.claude.json (the MCP server defs). This helper exports them for the collectors.
#
# Contract: PURE env backfill. Never overrides an already-set value. No-op (exit 0)
# when ~/.claude.json or jq is absent, or a key is missing — the collector then stays
# stale exactly as before. Reversible, zero blast radius. Source this, then call
# backfill_intel_tokens before Phase 0.
#
# Tested by test/backfill-tokens.test.sh (fixture claude.json + stubbed curl).

backfill_intel_tokens() {
  local claude_json="${CLAUDE_CONFIG_JSON:-$HOME/.claude.json}"
  command -v jq >/dev/null 2>&1 || return 0
  [ -f "$claude_json" ] || return 0

  # --- Supabase management API token (matches collector's expected name) ----------
  if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    local sb
    sb=$(jq -r '.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN // empty' "$claude_json" 2>/dev/null)
    [ -n "$sb" ] && export SUPABASE_ACCESS_TOKEN="$sb"
  fi

  # --- Sentry token (claude.json names it SENTRY_ACCESS_TOKEN; collector wants
  #     SENTRY_AUTH_TOKEN — same user-auth token, works for the REST issues API) -----
  if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
    local st
    st=$(jq -r '.mcpServers.sentry.env.SENTRY_ACCESS_TOKEN // empty' "$claude_json" 2>/dev/null)
    [ -n "$st" ] && export SENTRY_AUTH_TOKEN="$st"
  fi

  # --- Sentry org slug — parsed from the MCP server args (--organization-slug=…) ----
  if [ -z "${SENTRY_ORG_SLUG:-}" ]; then
    local org
    org=$(jq -r '.mcpServers.sentry.args[]? | select(startswith("--organization-slug=")) | sub("^--organization-slug=";"")' \
            "$claude_json" 2>/dev/null | head -1)
    [ -n "$org" ] && export SENTRY_ORG_SLUG="$org"
  fi

  # --- Sentry project slug — single-project auto-discovery via REST. Only auto-set
  #     when EXACTLY ONE project exists (unambiguous); multiple → leave unset so the
  #     operator picks. Needs token + org. One bounded call; degrades to no-op. -------
  if [ -z "${SENTRY_PROJECT_SLUG:-}" ] && [ -n "${SENTRY_AUTH_TOKEN:-}" ] && [ -n "${SENTRY_ORG_SLUG:-}" ]; then
    local host proj
    host="${SENTRY_HOST:-https://sentry.io}"
    proj=$(curl -sS --max-time 20 -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
             "$host/api/0/organizations/$SENTRY_ORG_SLUG/projects/" 2>/dev/null \
           | jq -r 'if (type=="array" and length==1) then .[0].slug else empty end' 2>/dev/null)
    [ -n "$proj" ] && export SENTRY_PROJECT_SLUG="$proj"
  fi

  return 0
}
