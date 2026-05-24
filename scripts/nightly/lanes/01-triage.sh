#!/bin/bash
# Lane 1 — Triage Sentry/Supabase/PostHog errors.
# Sonnet · 15 min cap · ≤8 files
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-01.log}"
PROMPT="$(dirname "$0")/../prompts/01-triage.md"

headless_run "01-triage" "$PROMPT" "sonnet" 1200 "$LOG"
