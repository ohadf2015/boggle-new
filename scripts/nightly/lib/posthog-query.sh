#!/bin/bash
# posthog-query.sh — query PostHog via the REST API (HogQL + feature flags) with
# POSTHOG_PERSONAL_API_KEY. Robust, headless alternative to the posthog MCP.
#
# WHY: the posthog MCP (mcp.posthog.com) FLAPS — its connection handshake
# intermittently times out (✗ at 02:00 on 2026-05-24, which aborted preflight;
# lanes 2/3 then hung on the flaky MCP mid-run and burned their full budget to a
# timeout). The REST API with a personal key is reliable and works unattended.
# Account is on EU cloud (us.posthog.com → 401; eu → 200), project 151059.
#
# Env (from ~/.config/lexi-nightly/env):
#   POSTHOG_PERSONAL_API_KEY  (phx_… personal key)
#   POSTHOG_PROJECT_ID        (151059)
#   POSTHOG_HOST              (default https://eu.posthog.com)
#
# Usage:
#   posthog-query.sh hogql "<HogQL SELECT ...>"   → {"columns":[...],"results":[...]}
#   posthog-query.sh flags                        → [{id,key,active,name,rollout}]
# Always exits 0; prints {"error":...} on failure so a lane never blocks on it.
set -uo pipefail

KEY="${POSTHOG_PERSONAL_API_KEY:-}"
PID="${POSTHOG_PROJECT_ID:-}"
HOST="${POSTHOG_HOST:-https://eu.posthog.com}"

_err() { echo "{\"error\":\"$1\"}"; exit 0; }
[ -n "$KEY" ] || _err "POSTHOG_PERSONAL_API_KEY unset"
[ -n "$PID" ] || _err "POSTHOG_PROJECT_ID unset"

MODE="${1:-}"; shift || true
case "$MODE" in
  hogql)
    Q="${1:?usage: posthog-query.sh hogql \"<HogQL>\"}"
    BODY=$(jq -n --arg q "$Q" '{query:{kind:"HogQLQuery",query:$q}}')
    R=$(curl -s -m 45 -X POST "$HOST/api/projects/$PID/query/" \
         -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
         -d "$BODY" 2>/dev/null)
    echo "$R" | jq -e '.results' >/dev/null 2>&1 \
      || _err "hogql failed: $(echo "$R" | jq -rc '.detail // .type // .error // "unknown"' 2>/dev/null | head -c 200)"
    echo "$R" | jq -c '{columns, results}'
    ;;
  flags)
    R=$(curl -s -m 30 "$HOST/api/projects/$PID/feature_flags/?limit=100" \
         -H "Authorization: Bearer $KEY" 2>/dev/null)
    echo "$R" | jq -e '.results' >/dev/null 2>&1 || _err "flags failed"
    echo "$R" | jq -c '[.results[] | {id, key, active, name,
        rollout: (.filters.groups[0].rollout_percentage // null),
        created_at}]'
    ;;
  *)
    _err "usage: posthog-query.sh hogql <query> | flags"
    ;;
esac
