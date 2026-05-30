#!/bin/bash
# Test for lib/intel/collect-revenue.sh — the monetization/revenue collector. Proves:
#   - pure functions work with NO network (testable like reddit-browser-fetch's builder)
#   - revenue_snapshot_stale: fresh ts → not stale, old ts → stale, missing → stale
#   - revenue_snapshot_signals: a sample AdMob snapshot → valid signal array,
#     every signal routed to lane 09-monetization with a stable fingerprint
#   - posthog_ad_signal: ad-engagement signal has the right shape/lane
#   - main with NO sources (no token, no snapshot) degrades: exits 0, writes a
#     revenue.json (stale_fallback), NEVER errors
#
# Run: bash scripts/nightly/test/collect-revenue.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
INTEL_LIB_DIR="$(cd "$HERE/../lib/intel" && pwd)"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

command -v jq >/dev/null 2>&1 || { echo "jq required for this test"; exit 1; }

# Isolated intel dirs so we never touch real snapshots.
TMP="$(mktemp -d -t collect-revenue-test.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT
export INTEL_ROOT="$TMP/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-30"
mkdir -p "$INTEL_DIR"

# Load helpers + the collector's pure functions only (guard suppresses main()).
# shellcheck disable=SC1091
. "$INTEL_LIB_DIR/intel-lib.sh"
export COLLECT_REVENUE_TEST=1
# shellcheck disable=SC1091
. "$INTEL_LIB_DIR/collect-revenue.sh"

echo "collect-revenue: staleness (rc 0 = stale, rc!=0 = fresh)"
assert "fresh ts (now) is NOT stale"        '! revenue_snapshot_stale "$(date -u +%Y-%m-%dT%H:%M:%SZ)" 3'
# 10 days ago — definitely stale at 3-day threshold.
OLD_TS="2026-05-20T00:00:00Z"
assert "10-day-old ts IS stale (rc 0)"      'revenue_snapshot_stale "'"$OLD_TS"'" 3'
assert "empty ts IS stale (rc 0)"           'revenue_snapshot_stale "" 3'

echo "collect-revenue: snapshot → signals"
SNAP=$(cat <<'JSON'
{
  "captured_at": "2026-05-30T08:00:00Z",
  "source": "playwriter-revenue-snapshot",
  "admob": { "estimated_earnings_usd_7d": 12.40, "ecpm_usd": 3.10, "impressions_7d": 4000 },
  "adsense": { "status": "rejected", "estimated_earnings_usd_7d": 0 },
  "play": { "installs_30d": 850, "active_devices": 1200 }
}
JSON
)
SIGS=$(revenue_snapshot_signals "$SNAP")
assert "signals is a JSON array"            'echo "$SIGS" | jq -e "type==\"array\"" >/dev/null'
assert "emits >=1 signal"                   '[ "$(echo "$SIGS" | jq length)" -ge 1 ]'
assert "every signal lane=09-monetization"  '[ "$(echo "$SIGS" | jq "[.[]|select(.lane!=\"09-monetization\")]|length")" = "0" ]'
assert "every signal has a fingerprint"     '[ "$(echo "$SIGS" | jq "[.[]|select(.fingerprint==\"\")]|length")" = "0" ]'
assert "severity within 0..1"               '[ "$(echo "$SIGS" | jq "[.[]|select(.severity<0 or .severity>1)]|length")" = "0" ]'
assert "carries an admob earnings signal"   'echo "$SIGS" | jq -e "[.[]|select(.metric|test(\"earnings|ecpm\"))]|length>0" >/dev/null'

echo "collect-revenue: posthog ad-engagement signal"
PS=$(posthog_ad_signal "rewarded_ad_watched" 120 80)
assert "posthog signal is one object"       'echo "$PS" | jq -e "type==\"object\"" >/dev/null'
assert "posthog signal lane=09-monetization" '[ "$(echo "$PS" | jq -r .lane)" = "09-monetization" ]'
assert "posthog signal kind=monetization"   '[ "$(echo "$PS" | jq -r .kind)" = "monetization" ]'

echo "collect-revenue: AdMob networkReport (REST array, micros) → signals"
ADMOB_REP=$(cat <<'JSON'
[
  {"header":{"dateRange":{"startDate":{"year":2026,"month":5,"day":24}},"localizationSettings":{"currencyCode":"USD"}}},
  {"row":{"dimensionValues":{"DATE":{"value":"20260529"}},"metricValues":{"ESTIMATED_EARNINGS":{"microsValue":"6500000"},"IMPRESSIONS":{"integerValue":"100000"},"IMPRESSION_RPM":{"microsValue":"3100000"}}}},
  {"row":{"dimensionValues":{"DATE":{"value":"20260530"}},"metricValues":{"ESTIMATED_EARNINGS":{"microsValue":"5900000"},"IMPRESSIONS":{"integerValue":"90000"},"IMPRESSION_RPM":{"microsValue":"3000000"}}}},
  {"footer":{"matchingRowCount":"2"}}
]
JSON
)
AM=$(admob_report_signals "$ADMOB_REP")
assert "admob signals is array"             'echo "$AM" | jq -e "type==\"array\"" >/dev/null'
assert "admob emits >=2 signals"            '[ "$(echo "$AM" | jq length)" -ge 2 ]'
assert "admob all lane=09-monetization"     '[ "$(echo "$AM" | jq "[.[]|select(.lane!=\"09-monetization\")]|length")" = "0" ]'
# earnings: (6.5 + 5.9) = 12.4 USD from micros
assert "admob earnings 7d = 12.4 USD"       '[ "$(echo "$AM" | jq "[.[]|select(.metric==\"admob_earnings_usd_7d\")][0].magnitude")" = "12.4" ]'
# impressions summed = 190000 (carried as reach on the earnings signal)
assert "admob earnings reach = 190000 imp"  '[ "$(echo "$AM" | jq "[.[]|select(.metric==\"admob_earnings_usd_7d\")][0].reach")" = "190000" ]'
# eCPM = mean(3.10, 3.00) = 3.05 USD from micros
assert "admob ecpm = 3.05 USD"              '[ "$(echo "$AM" | jq "[.[]|select(.metric==\"admob_ecpm_usd\")][0].magnitude")" = "3.05" ]'
assert "admob empty report → empty array"   '[ "$(admob_report_signals "[]" | jq length)" = "0" ]'

echo "collect-revenue: AdSense v2 report (header-mapped totals) → signals"
ADSENSE_REP=$(cat <<'JSON'
{
  "headers":[{"name":"DATE","type":"DIMENSION"},{"name":"EARNINGS","type":"MONEY"},{"name":"IMPRESSIONS","type":"INTEGER"}],
  "rows":[{"cells":[{"value":"2026-05-29"},{"value":"1.25"},{"value":"5000"}]}],
  "totals":{"cells":[{"value":""},{"value":"1.25"},{"value":"5000"}]}
}
JSON
)
AS=$(adsense_report_signals "$ADSENSE_REP")
assert "adsense signals is array"           'echo "$AS" | jq -e "type==\"array\"" >/dev/null'
assert "adsense all lane=09-monetization"   '[ "$(echo "$AS" | jq "[.[]|select(.lane!=\"09-monetization\")]|length")" = "0" ]'
assert "adsense earnings = 1.25"            '[ "$(echo "$AS" | jq "[.[]|select(.metric==\"adsense_earnings_usd_7d\")][0].magnitude")" = "1.25" ]'
assert "adsense impressions reach = 5000"   '[ "$(echo "$AS" | jq "[.[]|select(.metric==\"adsense_earnings_usd_7d\")][0].reach")" = "5000" ]'

echo "collect-revenue: no-source path degrades (never errors)"
# Run the REAL main in a clean env: no token, no snapshot file present.
( unset ADMOB_API_TOKEN POSTHOG_PERSONAL_API_KEY POSTHOG_PROJECT_ID
  export INTEL_ROOT INTEL_DIR PROJECT_DIR="$TMP/repo" REVENUE_NO_ADC=1
  mkdir -p "$PROJECT_DIR"
  unset COLLECT_REVENUE_TEST
  bash "$INTEL_LIB_DIR/collect-revenue.sh" >/dev/null 2>&1 )
degrade_rc=$?
assert "no-source main exits 0"             '[ "$degrade_rc" -eq 0 ]'
assert "no-source still writes revenue.json" '[ -f "$INTEL_DIR/revenue.json" ]'
assert "degraded file is valid json"        'jq empty "$INTEL_DIR/revenue.json" 2>/dev/null'

echo
echo "collect-revenue: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
