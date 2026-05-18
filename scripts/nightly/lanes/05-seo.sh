#!/bin/bash
# Lane 5 — SEO/GEO/CTR. Reuses existing seo-daily skill.
# Sonnet · 12 min cap · ≤8 files
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-05.log}"
PROMPT="$(dirname "$0")/../prompts/05-seo.md"

if [ ! -f "$HOME/.config/gcloud/application_default_credentials.json" ]; then
  echo "lane-05: gcloud ADC missing — skipping SEO lane" | tee -a "$LOG"
  exit 0
fi

headless_run "05-seo" "$PROMPT" "sonnet" 720 "$LOG"
