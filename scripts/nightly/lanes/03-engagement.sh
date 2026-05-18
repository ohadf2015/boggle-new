#!/bin/bash
# Lane 3 — Engagement A/B + flag hygiene.
# Sonnet · 12 min cap · ≤8 files
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-02.log}"
PROMPT="$(dirname "$0")/../prompts/02-engagement.md"

headless_run "02-engagement" "$PROMPT" "sonnet" 720 "$LOG"
