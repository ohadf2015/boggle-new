#!/bin/bash
# Collector: impact-ledger → IMPACT CHECK intel signals (2026-07-03 overhaul,
# spec C2). Ship entries due for verification (date + check_after_days elapsed,
# no verdict yet) become brief signals routed to their ORIGINATING lane. The
# lane runs ONE targeted metric query and appends a verdict line; "regressed"
# makes fix-or-revert that lane's top task. This closes the measure-what-you-
# shipped loop the nightly never had. Pure local file read — the LANE does the
# live metric query (it has MCP/REST); this collector only selects due entries.
# Tested by test/collect-impact.test.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"
# shellcheck disable=SC1091
. "$HERE/../impact-ledger.sh"

ID=impact
PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
LEDGER="${IMPACT_LEDGER_FILE:-$PROJECT_DIR/docs/nightly/impact-ledger.ndjson}"
TODAY_CHECK="${NIGHTLY_IMPACT_TODAY:-$(date +%Y-%m-%d)}"
CAP="${NIGHTLY_IMPACT_CAP:-5}"

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }

n=0
while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  [ "$n" -ge "$CAP" ] && break
  id=$(echo "$entry" | jq -r '.id')
  lane=$(echo "$entry" | jq -r '.lane // "01-triage"')
  change=$(echo "$entry" | jq -r '.change // .id')
  metric=$(echo "$entry" | jq -r '.metric')
  date=$(echo "$entry" | jq -r '.date // ""')
  hint=$(echo "$entry" | jq -r '.query_hint // ""')
  baseline=$(echo "$entry" | jq -r '.baseline // "n/a"')
  direction=$(echo "$entry" | jq -r '.direction // ""')
  title="IMPACT CHECK: did '$change' (shipped $date) move $metric?"
  evidence="Run ONE targeted query for $metric (hint: ${hint:-none}); baseline was $baseline, desired direction: ${direction:-n/a}. Then APPEND a verdict line to docs/nightly/impact-ledger.ndjson: {\"verdict_for\":\"$id\",\"verdict\":\"improved|neutral|regressed\",\"measured\":<num>,\"date\":\"$TODAY_CHECK\"}. If REGRESSED: fixing or reverting that change is your TOP task tonight."
  add "$(emit_signal impact impact_check "$title" "$metric" 1 0 0.8 "$lane" "$metric" "$evidence" S "impact:$id")"
  n=$((n+1))
done < <(impact_ledger_pending "$LEDGER" "$TODAY_CHECK")

intel_write "$ID" "$SIGNALS" true ""
echo "collect-impact: emitted $(echo "$SIGNALS" | jq length) signals"
