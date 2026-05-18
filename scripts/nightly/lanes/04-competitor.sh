#!/bin/bash
# Lane 4 — Competitor + Reddit research via Claude's WebSearch/WebFetch
# (+ agent-browser skill fallback). No external API key required.
# Sonnet · 10 min cap · 2 files (idea backlog + reddit replies)
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-04.log}"
PROMPT="$(dirname "$0")/../prompts/04-competitor.md"

headless_run "04-competitor" "$PROMPT" "sonnet" 600 "$LOG"
