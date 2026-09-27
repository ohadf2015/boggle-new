#!/bin/bash
# Test for lib/intel/collect-flagged-puzzles.sh (STUBBED curl — no live API):
#   - parses admin-bad reviews + player-disliked stats into normalized signals (lane 03-engagement)
#   - player flag requires dislikes > likes
#   - writes a detail artifact (admin_flagged + player_flagged) for the improvement agent
#   - degrades cleanly when SUPABASE keys are unset (stale/empty + note, exit 0)
#   - signals: magnitude/reach numeric, severity in [0,1], stable fingerprints
#
# Run: bash scripts/nightly/test/collect-flagged-puzzles.test.sh
set -uo pipefail
DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
COL="$DIR/collect-flagged-puzzles.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t colfp.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-30"
mkdir -p "$INTEL_DIR"
BIN="$ROOT/bin"; mkdir -p "$BIN"
trap 'rm -rf "$ROOT"' EXIT

export CURL_LOG="$ROOT/curl-args.log"
cat > "$BIN/curl" <<'STUB'
#!/bin/bash
args="$*"
echo "$args" >> "${CURL_LOG:-/dev/null}"
if echo "$args" | grep -q 'connections_puzzle_reviews'; then
  echo '[{"puzzle_id":"he-o-006","language":"he","word1":"כלב","word2":"תיכון","bridge":"ים","note":"forced"}]'
elif echo "$args" | grep -q 'connections_puzzle_feedback_stats'; then
  echo '[{"puzzle_id":"he-g-1","likes":0,"dislikes":4,"gaveups":3,"total":5},{"puzzle_id":"he-x","likes":9,"dislikes":1,"gaveups":0,"total":10}]'
else
  echo '[]'
fi
STUB
chmod +x "$BIN/curl"

echo "collect-flagged-puzzles: happy path (stubbed curl)"
PATH="$BIN:$PATH" SUPABASE_URL=https://x.supabase.co SUPABASE_SERVICE_ROLE_KEY=k \
  INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" bash "$COL" >/dev/null 2>&1
OUT="$INTEL_DIR/flagged-puzzles.json"
DETAIL="$INTEL_DIR/flagged-puzzles-detail.json"
assert "wrote intel output" "[ -f '$OUT' ]"
assert "two signals emitted (admin + players)" "[ \$(jq '.signals | length' '$OUT') -eq 2 ]"
assert "admin signal routes to 03-engagement" "[ \$(jq -r '.signals[] | select(.fingerprint==\"flagged-puzzles:admin\") | .lane' '$OUT') = '03-engagement' ]"
assert "severity in [0,1]" "[ \$(jq '[.signals[] | select(.severity>=0 and .severity<=1)] | length' '$OUT') -eq 2 ]"
assert "detail artifact written" "[ -f '$DETAIL' ]"
assert "detail has the admin-flagged puzzle words" "[ \$(jq -r '.admin_flagged[0].bridge' '$DETAIL') = 'ים' ]"
assert "player flag excludes likes>=dislikes (he-x dropped)" "[ \$(jq '.player_flagged | length' '$DETAIL') -eq 1 ]"
assert "player-flagged kept the high-dislike puzzle" "[ \$(jq -r '.player_flagged[0].puzzle_id' '$DETAIL') = 'he-g-1' ]"
assert "admin query skips resolved (resolved_at=is.null) — loop converges" "grep -q 'resolved_at=is.null' '$ROOT/curl-args.log'"

echo "collect-flagged-puzzles: degrade path (no keys)"
ROOT2=$(mktemp -d -t colfp2.XXXXXX)
INTEL_DIR2="$ROOT2/intel/2026-05-30"; mkdir -p "$INTEL_DIR2"
INTEL_ROOT="$ROOT2/intel" INTEL_DIR="$INTEL_DIR2" bash "$COL" >/dev/null 2>&1
rc=$?
assert "exit 0 on missing keys" "[ $rc -eq 0 ]"
assert "stale fallback file exists" "[ -f '$INTEL_DIR2/flagged-puzzles.json' ]"
assert "stale fallback note set" "jq -e '._meta.note | test(\"TOKEN_MISSING\")' '$INTEL_DIR2/flagged-puzzles.json' >/dev/null"
rm -rf "$ROOT2"

echo ""
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
