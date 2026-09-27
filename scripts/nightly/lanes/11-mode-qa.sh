#!/bin/bash
# Lane 11 — Mode-readiness QA. Audits ONE game mode per night for production readiness,
# scores it 0–100, fixes what's safe, and carries the mode across nights (handoff) until
# it's ≥90% ready (state in docs/nightly/mode-readiness.md). Runs EARLY (right after triage)
# so the headline lane executes before the shared usage window can drain — see run.sh LANES.
# Sonnet · 20 min cap: deliberately TIGHTER than landing's 25m. This lane runs at position 2,
# so a too-generous cap would starve perf/landing/seo behind it; and the multi-night handoff
# means it never needs to finish in one night — incremental progress per night is the design.
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-11.log}"
PROMPT="$(dirname "$0")/../prompts/11-mode-qa.md"

headless_run "11-mode-qa" "$PROMPT" "sonnet" 1200 "$LOG"
