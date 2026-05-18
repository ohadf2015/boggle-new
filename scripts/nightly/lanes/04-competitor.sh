#!/bin/bash
# Lane 3 — Competitor + Reddit research (Firecrawl). Research only — no code edits.
# Sonnet · 10 min cap · 2 files (idea backlog + reddit replies)
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-03.log}"
PROMPT="$(dirname "$0")/../prompts/03-competitor.md"

if [ -z "${FIRECRAWL_API_KEY:-}" ]; then
  echo "lane-03: FIRECRAWL_API_KEY missing — skipping (research-only lane)" | tee -a "$LOG"
  exit 0
fi

headless_run "03-competitor" "$PROMPT" "sonnet" 600 "$LOG"
