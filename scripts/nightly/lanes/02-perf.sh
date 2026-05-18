#!/bin/bash
# Lane 02 — Performance (backend slow queries + frontend Core Web Vitals + bundle).
# Sonnet · 12 min cap · ≤8 files
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-02.log}"
PROMPT="$(dirname "$0")/../prompts/02-perf.md"

headless_run "02-perf" "$PROMPT" "sonnet" 720 "$LOG"
