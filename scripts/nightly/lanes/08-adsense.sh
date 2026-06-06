#!/bin/bash
# Lane 8 — AdSense approval. Strengthens NON-game informational pages, fixes
# real thinness/SSR bugs, improves crawl/structure. Never bloats word counts,
# never adds text to game pages, never creates programmatic pages.
# Sonnet · 15 min cap
#
# Budget history: 720s (12 min) was 4/5 (80%) until 2026-05-27 first timeout
# at npm-test step. 900s added a 3-min margin.
# 2026-06-06: timed out mid-CODE (5 sequential edits to a PageClient.tsx) → the lane
# was implementing real content/SSR fixes, not hanging → 1200s (20 min) lets it land
# them. Per-tool MCP_TOOL_TIMEOUT still caps hung MCP calls on a genuine hang.
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-08.log}"
PROMPT="$(dirname "$0")/../prompts/08-adsense.md"

# gcloud ADC is OPTIONAL here (unlike lane 6): the live word-count audit +
# structure work run without GSC. If ADC is missing the prompt skips only the
# noindex-decision step (Step 2). So we do NOT hard-skip the lane.
if [ ! -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
  echo "lane-08: gcloud ADC missing — running without GSC traffic data (noindex step skipped)" | tee -a "$LOG"
fi

headless_run "08-adsense" "$PROMPT" "sonnet" 1200 "$LOG"
