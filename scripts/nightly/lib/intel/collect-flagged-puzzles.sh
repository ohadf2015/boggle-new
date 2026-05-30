#!/bin/bash
# Collector: connection puzzles flagged for improvement → normalized intel signals.
# Two sources, both via Supabase data REST (NO MCP):
#   - connections_puzzle_reviews where verdict='bad'   (admin verdicts)
#   - connections_puzzle_feedback_stats where dislikes high (player feedback)
# Both route to 03-engagement (content quality). The nightly improvement agent
# reads the signal + the detail artifact and regenerates the flagged puzzles
# (he-online.ts / en-online.ts) via the author→council→3-reviewer pipeline.
#
# Degrades cleanly (stale_fallback) if SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
# are unset or the API fails. Tested by test/collect-flagged-puzzles.test.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

ID=flagged-puzzles
SB_URL="${SUPABASE_URL:-}"
SB_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
DETAIL_OUT="${CONN_FLAGGED_OUT:-$INTEL_DIR/flagged-puzzles-detail.json}"

if [ -z "$SB_URL" ] || [ -z "$SB_KEY" ]; then
  stale_fallback "$ID"
  tmp="$INTEL_DIR/$ID.json.tmp"
  jq '._meta.note="TOKEN_MISSING: set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"' \
     "$INTEL_DIR/$ID.json" > "$tmp" && mv "$tmp" "$INTEL_DIR/$ID.json"
  echo "collect-flagged-puzzles: keys unset → stale fallback"
  exit 0
fi

sb_get() {
  curl -sS --max-time 30 "$SB_URL/rest/v1/$1" \
    -H "apikey: $SB_KEY" -H "Authorization: Bearer $SB_KEY" 2>/dev/null | jq -c '.' 2>/dev/null || echo '[]'
}

ADMIN=$(sb_get "connections_puzzle_reviews?verdict=eq.bad&select=puzzle_id,language,word1,word2,bridge,note&limit=200")
PLAYER=$(sb_get "connections_puzzle_feedback_stats?dislikes=gte.2&select=puzzle_id,likes,dislikes,gaveups,total&order=dislikes.desc&limit=200")
[ -z "$ADMIN" ] && ADMIN='[]'
[ -z "$PLAYER" ] && PLAYER='[]'
# Only treat a player-flagged puzzle as bad if dislikes outweigh likes.
PLAYER=$(jq -c '[.[] | select(.dislikes > (.likes // 0))]' <<<"$PLAYER" 2>/dev/null || echo '[]')

n_admin=$(jq 'length' <<<"$ADMIN" 2>/dev/null || echo 0)
n_player=$(jq 'length' <<<"$PLAYER" 2>/dev/null || echo 0)

# Persist the full detail artifact for the improvement agent to act on.
jq -n --argjson admin "$ADMIN" --argjson players "$PLAYER" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{collected_at:$ts, admin_flagged:$admin, player_flagged:$players}' > "$DETAIL_OUT" 2>/dev/null || true

# Severity scales with how many puzzles need work (cap at 1).
sev_of() { jq -n --argjson n "$1" '((0.4 + ($n * 0.05)) | if . > 1 then 1 else . end)'; }

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }

if [ "$n_admin" -gt 0 ]; then
  ev=$(jq -r '[.[:8][] | "\(.puzzle_id): \(.word1)|\(.bridge)|\(.word2)"] | join(" · ")' <<<"$ADMIN")
  add "$(emit_signal "$ID" quality "Admin-flagged bad puzzles ($n_admin) — regenerate via council+vet" \
    "connections:flagged:admin" "$n_admin" "$n_admin" "$(sev_of "$n_admin")" \
    "03-engagement" "connections:flagged:admin:count" "$ev" "M" "flagged-puzzles:admin")"
fi
if [ "$n_player" -gt 0 ]; then
  ev=$(jq -r '[.[:8][] | "\(.puzzle_id): \(.dislikes)👎/\(.total)"] | join(" · ")' <<<"$PLAYER")
  add "$(emit_signal "$ID" quality "Player-disliked puzzles ($n_player, dislikes>likes) — review/replace" \
    "connections:flagged:players" "$n_player" "$n_player" "$(sev_of "$n_player")" \
    "03-engagement" "connections:flagged:players:count" "$ev" "M" "flagged-puzzles:players")"
fi

intel_write "$ID" "$SIGNALS" true "detail: $DETAIL_OUT"
echo "collect-flagged-puzzles: $n_admin admin-flagged, $n_player player-flagged"
