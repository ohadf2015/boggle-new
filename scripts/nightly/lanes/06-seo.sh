#!/bin/bash
# Lane 6 — SEO/GEO/CTR. Reuses existing seo-daily skill.
# Sonnet · 15 min cap
#
# Budget history: 720s (12 min) was 6/7 (86%) until 2026-05-27 first timeout
# while running npm-lint at end-of-lane. 900s adds 3-min safety margin; lane
# nearly always finishes in <10 min so this only costs runtime on a hang —
# which the per-tool MCP_TOOL_TIMEOUT already caps.
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-06.log}"
PROMPT="$(dirname "$0")/../prompts/06-seo.md"

if [ ! -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
  echo "lane-06: gcloud ADC missing — skipping SEO lane" | tee -a "$LOG"
  exit 0
fi

headless_run "06-seo" "$PROMPT" "sonnet" 900 "$LOG"
