#!/bin/bash
# Lane 3 — Engagement A/B + flag hygiene.
# Sonnet · 15 min cap (cut from 25m: Phase 0 brief carries funnel drop-off + rage
# clicks from PostHog REST — full today; lane wires one experiment at the worst step).
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-03.log}"
PROMPT="$(dirname "$0")/../prompts/03-engagement.md"

headless_run "03-engagement" "$PROMPT" "sonnet" 900 "$LOG"
