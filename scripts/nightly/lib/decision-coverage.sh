#!/bin/bash
# decision-coverage.sh — cross-reference fe-next `.capture('event', ...)` call
# sites against PostHog's last-28d event volumes, via posthog-query.sh (REST,
# no MCP — see that file for why). Flags code-defined events with zero PostHog
# volume: a broken pipe, not a guess. Degrades to a TOKEN_MISSING note (never
# errors) when POSTHOG_PERSONAL_API_KEY/POSTHOG_PROJECT_ID are unset, same
# contract as posthog-query.sh and lib/intel/collect-posthog.sh.
#
# Usage: decision-coverage.sh  → JSON {code_event_count, posthog_event_count,
#        missing_in_posthog, note}
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$HERE/../../.." && pwd)"
# Override point for tests — swap in a fixture script instead of the real query.
PQ="${POSTHOG_QUERY_CMD:-$HERE/posthog-query.sh}"

# Override point for tests — real runs scan fe-next/lib + fe-next/components.
CODE_PATHS="${CODE_EVENTS_PATHS:-$PROJECT_DIR/fe-next/lib $PROJECT_DIR/fe-next/components}"

# Literal string event names only — a `.capture(someVar, ...)` call site can't
# be resolved by grep, so it's skipped rather than guessed.
CODE_JSON=$(grep -rhoE "\.capture\([\"'][a-zA-Z0-9_.\$-]+[\"']" $CODE_PATHS 2>/dev/null \
  | sed -E "s/.*capture\([\"']//; s/[\"']\$//" \
  | sort -u \
  | jq -R -s 'split("\n") | map(select(length > 0))')

RESULT=$("$PQ" hogql "SELECT event, count() AS c FROM events WHERE timestamp > now() - INTERVAL 28 DAY GROUP BY event")

if echo "$RESULT" | jq -e 'has("error")' >/dev/null 2>&1; then
  jq -n --argjson code "$CODE_JSON" --arg note "$(echo "$RESULT" | jq -r .error)" '{
    code_event_count: ($code | length),
    posthog_event_count: null,
    missing_in_posthog: null,
    note: $note
  }'
  exit 0
fi

SEEN_JSON=$(echo "$RESULT" | jq '[.results[][0]]')

jq -n --argjson code "$CODE_JSON" --argjson seen "$SEEN_JSON" '{
  code_event_count: ($code | length),
  posthog_event_count: ($seen | length),
  missing_in_posthog: ($code - $seen),
  note: ""
}'
