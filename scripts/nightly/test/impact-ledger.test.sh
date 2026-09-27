#!/bin/bash
# Test for lib/impact-ledger.sh — the shipped-change → metric verification ledger.
# Proves:
#   - pending selects only entries DUE (date + check_after_days <= today)
#   - entries with a matching verdict line are excluded
#   - metric:"none" entries are never pending (explicitly unmeasurable)
#   - malformed lines skipped; missing file → empty + exit 0
#
# Run: bash scripts/nightly/test/impact-ledger.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib" && pwd)"
# shellcheck disable=SC1091
. "$DIR/impact-ledger.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t impactl.XXXXXX)
L="$ROOT/impact-ledger.ndjson"
trap 'rm -rf "$ROOT"' EXIT

cat > "$L" <<'NDJSON'
{"id":"02-perf-2026-06-28-lcp-hero","date":"2026-06-28","lane":"02-perf","change":"hero img priority","metric":"posthog:web_vitals:LCP:/en","source":"posthog","query_hint":"p75 LCP route /en last 7d","baseline":2400,"direction":"down","check_after_days":3}
{"id":"03-eng-2026-07-01-quest-cta","date":"2026-07-01","lane":"03-engagement","change":"quest CTA reroute","metric":"posthog:quest_completed","source":"posthog","query_hint":"daily quest_completed count","baseline":40,"direction":"up","check_after_days":3}
{"id":"01-triage-2026-06-29-null-guard","date":"2026-06-29","lane":"01-triage","change":"null guard","metric":"none","why":"pure hardening, no metric","source":"sentry","check_after_days":3}
{"id":"02-perf-2026-06-20-verified","date":"2026-06-20","lane":"02-perf","change":"bundle split","metric":"posthog:web_vitals:INP","source":"posthog","baseline":300,"direction":"down","check_after_days":3}
{"verdict_for":"02-perf-2026-06-20-verified","verdict":"improved","measured":180,"date":"2026-06-24"}
NDJSON

echo "impact-ledger: pending selection (today=2026-07-03)"
OUT=$(impact_ledger_pending "$L" "2026-07-03")
assert "due unverified entry pending"      'echo "$OUT" | jq -re .id | grep -q "02-perf-2026-06-28-lcp-hero"'
assert "not-yet-due entry excluded (07-01+3d=07-04)" '! echo "$OUT" | jq -re .id | grep -q quest-cta'
assert "metric:none never pending"         '! echo "$OUT" | jq -re .id | grep -q null-guard'
assert "verdicted entry excluded"          '! echo "$OUT" | jq -re .id | grep -q 2026-06-20-verified'
assert "exactly 1 pending"                 '[ "$(echo "$OUT" | grep -c .)" = "1" ]'

echo "impact-ledger: due boundary (today=2026-07-04 → quest-cta due)"
OUT=$(impact_ledger_pending "$L" "2026-07-04")
assert "boundary entry now pending"        'echo "$OUT" | jq -re .id | grep -q quest-cta'
assert "now 2 pending"                     '[ "$(echo "$OUT" | grep -c .)" = "2" ]'

echo "impact-ledger: robustness"
OUT=$(impact_ledger_pending "$ROOT/none.ndjson" "2026-07-03"); rc=$?
assert "missing file → empty"              '[ -z "$OUT" ]'
assert "missing file → exit 0"             '[ "$rc" = "0" ]'
echo 'garbage line' >> "$L"
OUT=$(impact_ledger_pending "$L" "2026-07-03")
assert "malformed line skipped"            '[ "$(echo "$OUT" | grep -c .)" = "1" ]'

echo
echo "impact-ledger: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
