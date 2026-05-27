#!/bin/bash
# Lane 5 — Landing/CVR variant (frontend-design + animate-ai).
# Sonnet · 20 min cap
#
# Timeout history:
#   • opus/1500s (25 min) — 0/6 ships 05-21..05-26 (model wasn't the bottleneck)
#   • sonnet/600s (10 min) — 0/1 ship 05-27; cut short mid-Write on real STEP 0
#     mode files (survival-rounds/{elimination,boggleGrid}.ts + tests). Stream
#     timeline shows no MCP hang — just budget exhaustion on real impl work.
#   • sonnet/1200s (20 min) — current; STEP 0 is the founder's highest-value
#     path (polish:try + idea:build callbacks ship real modes), so the right
#     lever is more budget, not scope-cut. Re-evaluate after 7 nights.
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-05.log}"
PROMPT="$(dirname "$0")/../prompts/05-landing.md"

headless_run "05-landing" "$PROMPT" "sonnet" 1200 "$LOG"
