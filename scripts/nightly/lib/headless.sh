#!/bin/bash
# headless.sh — invoke `claude -p` for a lane with prompt-file substitution.
#
# Usage:
#   headless_run <lane_id> <prompt_file> <model> <timeout_sec> <log_file>
#
# Substitutes in prompt file:
#   __TODAY__         → YYYY-MM-DD
#   __LEARNINGS__     → contents of docs/nightly/learnings.md (or empty)
#   __PER_LANE_CAP__  → 8
#
# Returns exit code from claude -p. Tees output to $log_file.
# DOES NOT trust Claude's stdout claim of "clean" — caller runs build/test independently.

set -uo pipefail

PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"

headless_run() {
  local lane_id="$1"
  local prompt_file="$2"
  local model="${3:-sonnet}"
  local timeout_sec="${4:-900}"
  local log_file="$5"

  if [ ! -f "$prompt_file" ]; then
    echo "headless: prompt file missing: $prompt_file" | tee -a "$log_file"
    return 2
  fi

  local today=$(date +%Y-%m-%d)
  local learnings_file="$PROJECT_DIR/docs/nightly/learnings.md"
  local learnings_content=""
  if [ -f "$learnings_file" ]; then
    learnings_content=$(cat "$learnings_file")
  fi

  local rendered
  rendered=$(mktemp -t "lane-${lane_id}-prompt.XXXXXX")
  # Python: handles multi-line learnings cleanly (awk -v chokes on newlines,
  # sed chokes on special chars in the content).
  /usr/bin/env python3 - "$today" "8" "${learnings_file}" "$prompt_file" > "$rendered" <<'PY'
import sys, os
today, cap, learnings_path, prompt_path = sys.argv[1:5]
learnings = ''
if learnings_path and os.path.exists(learnings_path):
    with open(learnings_path, encoding='utf-8') as f:
        learnings = f.read()
with open(prompt_path, encoding='utf-8') as f:
    text = f.read()
text = (text
        .replace('__TODAY__', today)
        .replace('__PER_LANE_CAP__', cap)
        .replace('__LEARNINGS__', learnings))
sys.stdout.write(text)
PY

  echo "headless: lane=$lane_id model=$model timeout=${timeout_sec}s prompt=$(wc -c < "$rendered")B" | tee -a "$log_file"

  # Inherit env (claude needs HOME + its own oauth state). Secrets already exported.
  # macOS ships without GNU timeout; prefer system `timeout`, fall back to
  # gtimeout (brew coreutils) or perl alarm wrapper. Perl always present on macOS.
  local timeout_cmd
  if command -v timeout >/dev/null 2>&1; then
    timeout_cmd=(timeout "${timeout_sec}s")
  elif command -v gtimeout >/dev/null 2>&1; then
    timeout_cmd=(gtimeout "${timeout_sec}s")
  else
    timeout_cmd=(/usr/bin/perl -e 'alarm shift; exec @ARGV or die "exec: $!"' -- "$timeout_sec")
  fi

  "${timeout_cmd[@]}" \
    claude -p "$(cat "$rendered")" \
      --allowedTools '*' \
      --dangerously-skip-permissions \
      --model "$model" \
      2>&1 | tee -a "$log_file"
  local rc=${PIPESTATUS[0]}

  rm -f "$rendered"
  return "$rc"
}

# Diff-stat sanity cap for a single lane (touched files since BASE_SHA).
# Args: base_sha cap_files
# Returns 0 if within cap, 1 if exceeded.
lane_diff_within_cap() {
  local base="$1"
  local cap="${2:-8}"
  local n=$(git diff --name-only "$base" -- | wc -l | tr -d ' ')
  echo "headless: lane changed $n files (cap=$cap)"
  [ "$n" -le "$cap" ]
}
