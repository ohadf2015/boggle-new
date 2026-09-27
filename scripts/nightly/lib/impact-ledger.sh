#!/bin/bash
# impact-ledger.sh — shipped-change → metric verification ledger (2026-07-03
# overhaul, spec docs/superpowers/specs/2026-07-03-nightly-overhaul.md C2).
#
# Closes the loop the nightly never had: lanes ship changes, but nothing ever
# checked whether a change MOVED its metric. Contract:
#   - Lanes append a ship entry when they ship a measurable change:
#       {"id","date","lane","change","metric","source","query_hint",
#        "baseline","direction","check_after_days"}
#     metric:"none" (+ "why") is allowed for genuinely unmeasurable hardening.
#   - lib/intel/collect-impact.sh calls impact_ledger_pending each Phase 0 and
#     emits one "IMPACT CHECK" brief signal per due entry, routed to the
#     ORIGINATING lane; the lane queries the metric and appends a verdict line:
#       {"verdict_for":"<id>","verdict":"improved|neutral|regressed",
#        "measured":<num>,"date"}
#     A "regressed" verdict makes fix-or-revert that lane's TOP task tonight.
#
# Ledger lives at docs/nightly/impact-ledger.ndjson (append-only, committed).
# Pure jq. Tested by test/impact-ledger.test.sh.
set -uo pipefail

# impact_ledger_pending LEDGER_FILE TODAY(YYYY-MM-DD)
# Prints entries due for verification (one compact json per line): ship entries
# with a real metric, no verdict yet, and date + check_after_days <= today.
# Missing file / malformed lines → skipped; always exits 0.
impact_ledger_pending() {
  local ledger="${1:-}" today="${2:-$(date +%Y-%m-%d)}"
  [ -n "$ledger" ] && [ -f "$ledger" ] || return 0
  jq -cs --arg today "$today" '
    [ .[] | select(type=="object") ] as $rows
    | [ $rows[] | select(.verdict_for? != null) | .verdict_for ] as $done
    | $rows[]
    | select(.id? != null and .metric? != null and .metric != "none")
    | select(.id as $i | $done | index($i) | not)
    | select(
        ((.date + "T00:00:00Z") | fromdateiso8601) as $d
        | (($today + "T00:00:00Z") | fromdateiso8601) as $t
        | ($d + ((.check_after_days // 3) * 86400)) <= $t
      )
  ' <(grep -E '^\{' "$ledger" 2>/dev/null | while IFS= read -r l; do
        echo "$l" | jq -c . 2>/dev/null || true
      done) 2>/dev/null
  return 0
}
