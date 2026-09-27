#!/bin/bash
# Lane 7 — Self-learn. Rewrites docs/nightly/learnings.md from last 7 reports.
# Opus · 15 min cap · 1 file
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-07.log}"
PROMPT="$(dirname "$0")/../prompts/07-self-learn.md"

# 480s was too tight: with caffeinate the budget is now REAL wall-clock (no sleep
# inflation), and this opus lane reads 7 reports + rewrites learnings + maintains
# the skills table + helper scripts. It timed out at ~540s on 2026-05-23, so the
# self-improvement loop never updated. 900s gives it room.
headless_run "07-self-learn" "$PROMPT" "opus" 900 "$LOG"
