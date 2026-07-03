#!/bin/bash
# Test for lib/lane-scheduler.sh — brief-signal-gated lane selection. Proves:
#   - core lanes always kept (even with zero signals)
#   - non-core lanes with ≥1 brief signal kept
#   - zero-signal non-core lanes trimmed to the rotation quota (2), deterministic
#     via NIGHTLY_DOY
#   - original order preserved
#   - missing/absent brief.json → ALL lanes (fail-open)
#   - NIGHTLY_SCHEDULER=0 → ALL lanes (kill-switch)
#
# Run: bash scripts/nightly/test/lane-scheduler.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib" && pwd)"
# shellcheck disable=SC1091
. "$DIR/lane-scheduler.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t lanesched.XXXXXX)
BJSON="$ROOT/brief.json"
trap 'rm -rf "$ROOT"' EXIT

# Signals: 06-seo + 09-monetization have items; other non-core lanes empty.
cat > "$BJSON" <<'JSON'
{"_meta":{"n_signals":3},
 "by_lane":{
   "01-triage":[{"title":"err","score":0.9}],
   "06-seo":[{"title":"indexation drop","score":0.7}],
   "09-monetization":[{"title":"shop drop-off","score":0.5}]
 }}
JSON

ALL="01-triage 11-mode-qa 02-perf 05-landing 06-seo 03-engagement 12-telemetry-coverage 07-self-learn 10-dictionary 09-monetization 04-competitor 08-adsense"

echo "lane-scheduler: signal gating"
# shellcheck disable=SC2086
OUT=$(NIGHTLY_DOY=10 nightly_schedule_lanes "$BJSON" $ALL)
assert "core 01-triage kept"          'echo "$OUT" | grep -qx 01-triage'
assert "core 11-mode-qa kept"         'echo "$OUT" | grep -qx 11-mode-qa'
assert "core 02-perf kept"            'echo "$OUT" | grep -qx 02-perf'
assert "core 05-landing kept"         'echo "$OUT" | grep -qx 05-landing'
assert "signal lane 06-seo kept"      'echo "$OUT" | grep -qx 06-seo'
assert "signal lane 09-monetization kept" 'echo "$OUT" | grep -qx 09-monetization'
# 6 zero-signal non-core lanes (03,12,07,10,04,08) → exactly 2 survive rotation
ZS=$(echo "$OUT" | grep -cxE '03-engagement|12-telemetry-coverage|07-self-learn|10-dictionary|04-competitor|08-adsense')
assert "exactly 2 zero-signal lanes kept" '[ "$ZS" = "2" ]'
assert "original order preserved"     '[ "$(echo "$OUT" | head -1)" = "01-triage" ]'

echo "lane-scheduler: rotation is deterministic + day-dependent"
# shellcheck disable=SC2086
OUT10=$(NIGHTLY_DOY=10 nightly_schedule_lanes "$BJSON" $ALL)
# shellcheck disable=SC2086
OUT10b=$(NIGHTLY_DOY=10 nightly_schedule_lanes "$BJSON" $ALL)
# shellcheck disable=SC2086
OUT11=$(NIGHTLY_DOY=11 nightly_schedule_lanes "$BJSON" $ALL)
assert "same day → same set"          '[ "$OUT10" = "$OUT10b" ]'
assert "different day → different rotation picks" '[ "$OUT10" != "$OUT11" ]'

echo "lane-scheduler: fail-open"
# shellcheck disable=SC2086
OUT=$(nightly_schedule_lanes "$ROOT/nonexistent.json" $ALL)
assert "missing brief → all lanes"    '[ "$(echo "$OUT" | grep -c .)" = "12" ]'
# shellcheck disable=SC2086
OUT=$(NIGHTLY_SCHEDULER=0 nightly_schedule_lanes "$BJSON" $ALL)
assert "kill-switch → all lanes"      '[ "$(echo "$OUT" | grep -c .)" = "12" ]'

echo
echo "lane-scheduler: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
