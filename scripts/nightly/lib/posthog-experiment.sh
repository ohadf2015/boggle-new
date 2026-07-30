#!/bin/bash
# posthog-experiment.sh — CREATE PostHog experiment feature flags via the REST API,
# idempotently. The WRITE companion to the read-only posthog-query.sh.
#
# WHY: lane 03 (engagement) defines A/B experiments in fe-next/lib/experiments.ts and
# ships variant-B behind a typed flag, but the matching PostHog flag had to be created
# BY HAND in the UI — so every experiment sat INERT ("4 dark experiments — human must
# create in PostHog", 2026-06-16). This makes that step autonomous: the lane calls
# `ensure <key> <variantA> <variantB> [desc]` and the multivariate 50/50 flag is created
# live. The posthog MCP FLAPS/HANGS headless (see posthog-query.sh), so this uses the
# personal-key REST API, the proven-reliable path.
#
# A PostHog experiment is backed by a multivariate feature flag; the app's
# getExperimentVariant() reads that flag, so creating the flag (variants from
# experiments.ts, 50/50, rolled out to 100%) is what makes the experiment actually serve.
#
# Env (from ~/.config/lexi-nightly/env):
#   POSTHOG_PERSONAL_API_KEY  (phx_… personal key)
#   POSTHOG_PROJECT_ID        (151059)
#   POSTHOG_HOST              (default https://eu.posthog.com)
#
# Usage:
#   posthog-experiment.sh ensure <flag-key> <variantA> <variantB> [description]
#   posthog-experiment.sh exists <flag-key>            → prints "yes"/"no"
#   posthog-experiment.sh payload <key> <vA> <vB> [d]  → prints the create JSON (no network)
# Always exits 0; prints {"status":...} / {"error":...} so a lane never BLOCKS on it
# (a failed create is reported and left for the lane to flag, never a hard stop).
set -uo pipefail

KEY="${POSTHOG_PERSONAL_API_KEY:-}"
PID="${POSTHOG_PROJECT_ID:-}"
HOST="${POSTHOG_HOST:-https://eu.posthog.com}"
# Curl seam: tests inject a fake via POSTHOG_CURL to exercise create/idempotency offline.
PH_CURL="${POSTHOG_CURL:-curl}"

_out() { echo "$1"; exit 0; }
_err() { echo "{\"error\":\"$1\"}"; exit 0; }

# _ph_exp_payload <key> <variantA> <variantB> [description] → multivariate flag create JSON.
# PURE (no network) so the payload shape is unit-tested. Two variants, 50/50, the flag
# rolled out to 100% of users (every user is deterministically bucketed into one variant —
# a clean even A/B). Shape mirrors a VERIFIED live flag (exp-results-replay-cta-v1, read via
# posthog-query.sh): {groups:[{rollout_percentage}], multivariate:{variants:[{key,rollout}]}}.
# continuity:false — PostHog already buckets deterministically per distinct_id (stable per
# device), so a user keeps their variant without it; every existing project flag uses false,
# so we mirror the proven config rather than the untested sticky-cross-identity path.
_ph_exp_payload() {
  local key="$1" va="$2" vb="$3" desc="${4:-}"
  jq -n --arg key "$key" --arg va "$va" --arg vb "$vb" --arg name "$key" --arg desc "$desc" '
    {
      key: $key,
      name: $name,
      active: true,
      ensure_experience_continuity: false,
      filters: {
        groups: [ { properties: [], rollout_percentage: 100 } ],
        multivariate: {
          variants: [
            { key: $va, name: $desc, rollout_percentage: 50 },
            { key: $vb, name: $desc, rollout_percentage: 50 }
          ]
        }
      }
    }'
}

# ph_exp_exists <key> → "yes" if a feature flag with that key already exists (idempotency
# guard). GET-lists flags (paged at 100; experiment keys are few) and greps the key.
ph_exp_exists() {
  local key="$1" r
  r=$("$PH_CURL" -s -m 30 "$HOST/api/projects/$PID/feature_flags/?limit=200" \
        -H "Authorization: Bearer $KEY" 2>/dev/null)
  if echo "$r" | jq -e --arg k "$key" '.results[]? | select(.key == $k)' >/dev/null 2>&1; then
    echo "yes"
  else
    echo "no"
  fi
}

# ph_exp_ensure <key> <vA> <vB> [desc] → idempotent create. Never duplicates a flag,
# never errors a lane: if the key exists → status "exists"; on create → "created";
# on API failure → {"error":...} (lane decides whether to flag for a human).
ph_exp_ensure() {
  local key="$1" va="$2" vb="$3" desc="${4:-}" body resp
  [ -n "$key" ] && [ -n "$va" ] && [ -n "$vb" ] || _err "usage: ensure <key> <variantA> <variantB> [desc]"
  if [ "$(ph_exp_exists "$key")" = "yes" ]; then
    _out "{\"status\":\"exists\",\"key\":\"$key\"}"
  fi
  body=$(_ph_exp_payload "$key" "$va" "$vb" "$desc")
  resp=$("$PH_CURL" -s -m 30 -X POST "$HOST/api/projects/$PID/feature_flags/" \
          -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
          -d "$body" 2>/dev/null)
  # A successful create returns the flag object with a numeric id + the key echoed.
  if echo "$resp" | jq -e --arg k "$key" '.id and (.key == $k)' >/dev/null 2>&1; then
    _out "{\"status\":\"created\",\"key\":\"$key\",\"id\":$(echo "$resp" | jq '.id')}"
  fi
  _err "create failed for $key: $(echo "$resp" | jq -rc '.detail // .type // "unknown"' 2>/dev/null | head -c 200)"
}

# ph_exp_deactivate <key> → idempotent PATCH active:false. For zombie flags (0 code
# call sites, no typed experiment entry): reversible soft-kill, never a hard delete.
ph_exp_deactivate() {
  local key="$1" id resp
  [ -n "$key" ] || _err "usage: deactivate <key>"
  id=$("$PH_CURL" -s -m 30 "$HOST/api/projects/$PID/feature_flags/?limit=200" \
        -H "Authorization: Bearer $KEY" 2>/dev/null | jq -r --arg k "$key" '.results[]? | select(.key == $k) | .id' | head -1)
  [ -n "$id" ] || _out "{\"status\":\"not_found\",\"key\":\"$key\"}"
  resp=$("$PH_CURL" -s -m 30 -X PATCH "$HOST/api/projects/$PID/feature_flags/$id/" \
          -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
          -d '{"active":false}' 2>/dev/null)
  if echo "$resp" | jq -e '.active == false' >/dev/null 2>&1; then
    _out "{\"status\":\"deactivated\",\"key\":\"$key\",\"id\":$id}"
  fi
  _err "deactivate failed for $key: $(echo "$resp" | jq -rc '.detail // .type // "unknown"' 2>/dev/null | head -c 200)"
}

MODE="${1:-}"; shift || true
case "$MODE" in
  payload)     _ph_exp_payload "${1:?key}" "${2:?variantA}" "${3:?variantB}" "${4:-}" ;;
  exists)      [ -n "$KEY" ] || _err "POSTHOG_PERSONAL_API_KEY unset"; [ -n "$PID" ] || _err "POSTHOG_PROJECT_ID unset"; ph_exp_exists "${1:?key}" ;;
  ensure)      [ -n "$KEY" ] || _err "POSTHOG_PERSONAL_API_KEY unset"; [ -n "$PID" ] || _err "POSTHOG_PROJECT_ID unset"; ph_exp_ensure "${1:-}" "${2:-}" "${3:-}" "${4:-}" ;;
  deactivate)  [ -n "$KEY" ] || _err "POSTHOG_PERSONAL_API_KEY unset"; [ -n "$PID" ] || _err "POSTHOG_PROJECT_ID unset"; ph_exp_deactivate "${1:-}" ;;
  *)           _err "usage: posthog-experiment.sh ensure <key> <vA> <vB> [desc] | exists <key> | payload <key> <vA> <vB> [d] | deactivate <key>" ;;
esac
