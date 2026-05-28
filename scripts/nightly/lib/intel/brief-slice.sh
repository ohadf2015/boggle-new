#!/bin/bash
# brief-slice.sh BRIEF_JSON_PATH LANE_ID
#
# Prints the per-lane brief slice that headless.sh injects into the __BRIEF__
# placeholder (spec §6): the top scored items routed to this lane, as a markdown
# list, plus a note if any source was stale. When the lane has no items (or
# brief.json is absent) it prints the brief-first / bounded-fallback CONTRACT text
# so the lane prompt always has guidance. Pure jq. Tested by test/brief-slice.test.sh.
set -uo pipefail
BJSON="${1:-}"; LANE="${2:-}"

fallback() {
  cat <<EOF
No brief items for lane '${LANE}' this run. The Phase-0 intel layer found no qualifying
signal for your lane (its source token may be unconfigured, or there was simply nothing).
You MAY do ONE quick targeted discovery for your primary source, then act — do NOT run
broad discovery.
EOF
}

if [ -z "$BJSON" ] || [ ! -f "$BJSON" ]; then
  fallback; exit 0
fi

items=$(jq -r --arg l "$LANE" '
  (.by_lane[$l] // [])
  | if length == 0 then empty
    else .[:8][]
      | "- [score \(.score)] \(.title) (metric=\(.metric), reach=\(.reach), severity=\(.severity), effort=\(.effort), target=\(.target_metric))"
        + (if (.evidence // "") != "" then "  evidence: \(.evidence)" else "" end)
    end' "$BJSON" 2>/dev/null)

if [ -z "$items" ]; then
  fallback; exit 0
fi

printf '%s\n' "$items"
stale=$(jq -rc '(._meta.sources_stale // []) | join(", ")' "$BJSON" 2>/dev/null)
if [ -n "$stale" ]; then
  printf '\n_Note: these sources were STALE this run (last-good reused — treat as lower-confidence): %s._\n' "$stale"
fi
exit 0
