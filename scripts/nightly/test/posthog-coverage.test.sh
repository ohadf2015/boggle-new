#!/bin/bash
# Test for lib/posthog-coverage.sh. Proves (no live anything):
#   - nightly_extract_growth_events pulls event-name literals from the GrowthEvent
#     union, ignoring comments / non-union code, deduped
#   - nightly_coverage_classify matches code events against live volume (allowing the
#     'growth:' emit prefix), and labels DEAD (zero live vol) / CRATERED (collapsed vs
#     trailing baseline) / ok — emitting only the actionable (DEAD+CRATERED) rows
#
# Run: bash scripts/nightly/test/posthog-coverage.test.sh
set -uo pipefail

HELPER="$(cd "$(dirname "$0")/../lib" && pwd)/posthog-coverage.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

. "$HELPER"
echo "  posthog-coverage:"

ROOT=$(mktemp -d -t phcov.XXXXXX); trap 'rm -rf "$ROOT"' EXIT

# --- nightly_extract_growth_events -------------------------------------------
SRC="$ROOT/growthTracking.ts"
cat > "$SRC" <<'EOF'
const before = 'not_an_event';
export type GrowthEvent =
  // Acquisition
  | 'page_view'
  | 'room_joined_via_code'
  // Lifecycle
  | 'game_started'
  | 'game_completed' // dual-emitted canonical
  | 'friend_added';
export interface GrowthEventData {
  shareMethod?: 'whatsapp' | 'copy';
}
const after = 'also_not_an_event';
EOF

EV=$(nightly_extract_growth_events "$SRC")
assert "extracts a union member" \
  "echo \"\$EV\" | grep -qx 'game_started'"
assert "extracts member with trailing comment" \
  "echo \"\$EV\" | grep -qx 'game_completed'"
assert "extracts the final (semicolon) member" \
  "echo \"\$EV\" | grep -qx 'friend_added'"
assert "ignores code literals outside the union" \
  "! echo \"\$EV\" | grep -q 'not_an_event'"
assert "ignores GrowthEventData literals after the union closes" \
  "! echo \"\$EV\" | grep -q 'whatsapp'"
assert "extracts exactly 5 members" \
  "[ \"\$(echo \"\$EV\" | grep -c .)\" = 5 ]"

# --- nightly_coverage_classify -----------------------------------------------
# code events = source of truth; live = 'event<TAB>d7<TAB>prev7' (both bare and growth: rows)
CODE="$ROOT/code.txt"
printf 'game_started\ngame_completed\nfriend_added\nstreak_broken\nmode_selected\n' > "$CODE"

LIVE="$ROOT/live.tsv"
# game_started: healthy under growth: prefix. game_completed: bare, healthy.
# friend_added: absent everywhere -> DEAD. streak_broken: absent -> DEAD.
# mode_selected: cratered (100 prev -> 5 now).
printf 'growth:game_started\t900\t880\n' >  "$LIVE"
printf 'game_started\t900\t880\n'        >> "$LIVE"
printf 'game_completed\t600\t590\n'      >> "$LIVE"
printf 'growth:mode_selected\t5\t100\n'  >> "$LIVE"
printf 'some_uninstrumented_event\t50\t40\n' >> "$LIVE"

OUT=$(nightly_coverage_classify "$CODE" "$LIVE")
assert "friend_added flagged DEAD (zero live volume)" \
  "echo \"\$OUT\" | grep -i 'friend_added' | grep -qi 'dead'"
assert "streak_broken flagged DEAD" \
  "echo \"\$OUT\" | grep -i 'streak_broken' | grep -qi 'dead'"
assert "mode_selected flagged CRATERED (collapsed vs baseline)" \
  "echo \"\$OUT\" | grep -i 'mode_selected' | grep -qi 'crater'"
assert "healthy game_started NOT reported (growth: prefix matched)" \
  "! echo \"\$OUT\" | grep -iq 'game_started'"
assert "healthy game_completed NOT reported" \
  "! echo \"\$OUT\" | grep -iq 'game_completed'"
assert "non-code event never appears (we audit code's events, not all live)" \
  "! echo \"\$OUT\" | grep -q 'some_uninstrumented_event'"

echo "  ---- posthog-coverage: $PASS passed, $FAIL failed ----"
[ "$FAIL" -eq 0 ]
