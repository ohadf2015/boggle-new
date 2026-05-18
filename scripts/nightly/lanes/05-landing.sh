#!/bin/bash
# Lane 5 — Landing/CVR variant (frontend-design + animate-ai).
# Opus · 18 min cap · ≤8 files
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-04.log}"
PROMPT="$(dirname "$0")/../prompts/04-landing.md"

headless_run "04-landing" "$PROMPT" "opus" 1080 "$LOG"
