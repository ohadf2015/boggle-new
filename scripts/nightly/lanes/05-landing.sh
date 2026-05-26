#!/bin/bash
# Lane 5 — Landing/CVR variant (frontend-design + animate-ai).
# Sonnet · 10 min cap · ≤8 files
#
# Downgrade history: was opus/1500s (25 min) — 0/6 ships across 05-21..05-26
# (lane 07 self-review 2026-05-26 ranked this the #1 improvement). Sonnet at
# 600s burns less budget per failure and may actually ship if the bottleneck is
# the prompt scope rather than model capability. Re-evaluate after 7 nights.
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-05.log}"
PROMPT="$(dirname "$0")/../prompts/05-landing.md"

headless_run "05-landing" "$PROMPT" "sonnet" 600 "$LOG"
