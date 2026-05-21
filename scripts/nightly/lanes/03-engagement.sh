#!/bin/bash
# Lane 3 — Engagement A/B + flag hygiene.
# Sonnet · 18 min cap · ≤8 files
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-03.log}"
PROMPT="$(dirname "$0")/../prompts/03-engagement.md"

headless_run "03-engagement" "$PROMPT" "sonnet" 1080 "$LOG"
