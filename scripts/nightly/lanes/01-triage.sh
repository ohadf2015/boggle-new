#!/bin/bash
# Lane 1 — Triage Sentry/Supabase/PostHog errors.
# Sonnet · 15 min cap (cut from 20m: Phase 0 brief carries the errors; brief-first
# contract allows one bounded fallback discovery if its slice is empty/stale).
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-01.log}"
PROMPT="$(dirname "$0")/../prompts/01-triage.md"

headless_run "01-triage" "$PROMPT" "sonnet" 900 "$LOG"
