#!/usr/bin/env bash
# feedback-tally.sh — aggregate Telegram-button feedback for the lane-07 self-learn run.
# Codifies the grep|sed|uniq pipeline lane 07 ran by hand on 2026-06-08.
# Reads docs/nightly/feedback/*.ndjson (callback_query records), prints a compact digest.
# Idempotent, read-only. Usage: scripts/nightly/tools/feedback-tally.sh [N_FILES]
set -euo pipefail

N="${1:-7}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DIR="$ROOT/docs/nightly/feedback"

if [ ! -d "$DIR" ]; then
  echo "feedback dir not found: $DIR" >&2
  exit 0
fi

# shellcheck disable=SC2012
FILES=$(ls "$DIR"/*.ndjson 2>/dev/null | sort | tail -n "$N" || true)
if [ -z "$FILES" ]; then
  echo "no feedback files in $DIR"
  exit 0
fi

# Extract callback_data values once.
DATA=$(grep -ho '"callback_data":"[^"]*"' $FILES 2>/dev/null | sed 's/"callback_data":"//;s/"$//' || true)

echo "=== feedback-tally (last $N files) ==="
echo "files: $(echo "$FILES" | wc -l | tr -d ' ')"
echo
echo "--- by type prefix ---"
echo "$DATA" | cut -d: -f1 | sort | uniq -c | sort -rn
echo
echo "--- night quality (good vs meh) ---"
echo "$DATA" | grep -E '^night:' | cut -d: -f1-2 | sort | uniq -c | sort -rn || echo "  (none)"
echo
echo "--- idea build vs pass ---"
echo "$DATA" | grep -E '^idea:' | cut -d: -f1-2 | sort | uniq -c | sort -rn || echo "  (none)"
echo
echo "--- polish try/pass by slug ---"
echo "$DATA" | grep -E '^polish:' | awk -F: '{print $2":"$3}' | sort | uniq -c | sort -rn || echo "  (none)"
echo
echo "--- mode keep/drop/promote by slug ---"
echo "$DATA" | grep -E '^mode:' | awk -F: '{print $2":"$3}' | sort | uniq -c | sort -rn || echo "  (none)"
