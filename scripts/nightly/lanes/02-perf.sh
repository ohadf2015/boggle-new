#!/bin/bash
# Lane 02 — Performance (backend slow queries + frontend Core Web Vitals + bundle).
# Sonnet · 10 min cap (cut from 12m: Phase 0 brief carries CWV/LCP + advisors from
# PostHog/Supabase REST; lane fixes rather than re-discovers via execute_sql).
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-02.log}"
PROMPT="$(dirname "$0")/../prompts/02-perf.md"

headless_run "02-perf" "$PROMPT" "sonnet" 600 "$LOG"
