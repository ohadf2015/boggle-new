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

  # Prepend the founder's directives (texted to the bot) at the TOP of the
  # prompt — higher priority than the carried-forward learnings playbook.
  # consume_user_directives() (lib/user-directives.sh) writes this file at the
  # start of the run; it is empty when the founder texted nothing.
  local directives_file="${ACTIVE_DIRECTIVES_FILE:-$HOME/.cache/lexi-nightly/active-directives.md}"
  if [ -s "$directives_file" ]; then
    local combined
    combined=$(mktemp -t "lane-${lane_id}-combined.XXXXXX")
    cat "$directives_file" "$rendered" > "$combined" && mv "$combined" "$rendered"
    echo "headless: prepended founder directives ($(wc -c < "$directives_file" | tr -d ' ')B) to lane=$lane_id" | tee -a "$log_file"
  fi

  echo "headless: lane=$lane_id model=$model timeout=${timeout_sec}s prompt=$(wc -c < "$rendered")B" | tee -a "$log_file"

  # Inherit env (claude needs HOME + its own oauth state). Secrets already exported.
  # macOS ships without GNU timeout; prefer system `timeout`, fall back to
  # gtimeout (brew coreutils) or perl alarm wrapper. Perl always present on macOS.
  # Use real timeout (GNU coreutils via brew, or BSD on Linux). Hard-prefer
  # gtimeout/timeout — earlier perl-alarm fallback was BROKEN: `perl -e 'alarm; exec'`
  # replaces the perl process with claude, so SIGALRM never fires and claude
  # hangs indefinitely. Confirmed empirically: lane 1 hung 67 min on 2026-05-19.
  local timeout_cmd
  if command -v gtimeout >/dev/null 2>&1; then
    timeout_cmd=(gtimeout --kill-after=10s "${timeout_sec}s")
  elif command -v timeout >/dev/null 2>&1; then
    timeout_cmd=(timeout --kill-after=10s "${timeout_sec}s")
  else
    echo "headless: FATAL — neither timeout nor gtimeout found. Install: brew install coreutils" | tee -a "$log_file"
    return 127
  fi

  "${timeout_cmd[@]}" \
    claude -p "$(cat "$rendered")" \
      --allowedTools '*' \
      --dangerously-skip-permissions \
      --model "$model" \
      < /dev/null \
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
