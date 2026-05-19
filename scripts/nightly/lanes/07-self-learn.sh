#!/bin/bash
# Lane 7 — Self-learn. Rewrites docs/nightly/learnings.md from last 7 reports.
# Opus · 5 min cap · 1 file
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-06.log}"
PROMPT="$(dirname "$0")/../prompts/07-self-learn.md"

headless_run "06-self-learn" "$PROMPT" "opus" 480 "$LOG"
