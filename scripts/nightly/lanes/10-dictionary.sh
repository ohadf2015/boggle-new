#!/bin/bash
# Lane 10 — Dictionary improvement (proactive candidate generation).
# Sonnet · 20 min cap. Runs the multi-agent `dictionary-improvement` workflow to
# generate + dual-judge + persist new candidate words for the weakest languages.
# The backend verify->promote->heal pipeline (cron) is the gate before gameplay.
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-10.log}"
PROMPT="$(dirname "$0")/../prompts/10-dictionary.md"

headless_run "10-dictionary" "$PROMPT" "sonnet" 1200 "$LOG"
