#!/bin/bash
# Lane 12 — Telemetry coverage health. Audits the EXISTING event contract: every event the
# code claims to fire (GrowthEvent union) vs what PostHog actually receives. Catches DEAD
# emitters (deploy silently broke a call site) + CRATERED volumes + per-mode completion holes,
# then wires/fixes ONE high-value gap per night. Distinct from lane 03 (which instruments NEW
# funnel gaps tied to an experiment) — this guards what already exists.
# Sonnet · 15 min cap: read-mostly + a small wiring edit; lighter than mode-qa. Runs in the
# tail (low per-night urgency; the backlog drains incrementally across nights).
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-12.log}"
PROMPT="$(dirname "$0")/../prompts/12-telemetry-coverage.md"

headless_run "12-telemetry-coverage" "$PROMPT" "sonnet" 900 "$LOG"
