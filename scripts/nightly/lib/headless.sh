#!/bin/bash
# headless.sh — invoke `claude -p` for a lane with prompt-file substitution.
#
# Usage:
#   headless_run <lane_id> <prompt_file> <model> <timeout_sec> <log_file>
#
# Substitutes in prompt file:
#   __TODAY__         → YYYY-MM-DD
#   __LEARNINGS__     → contents of docs/nightly/learnings.md (or empty)
#   __PER_LANE_CAP__  → 8 (DEPRECATED — file-count caps removed; substitution kept as harmless no-op)
#   __FEEDBACK_SUMMARY__ → contents of $FEEDBACK_SUMMARY_FILE (player feedback
#                          digest written before the lane loop; empty if none)
#
# Returns exit code from claude -p. Tees output to $log_file.
# DOES NOT trust Claude's stdout claim of "clean" — caller runs build/test independently.

set -uo pipefail

PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"

# --- per-MCP-call watchdogs (the root-cause fix for the exit-124 epidemic) ----
# Lanes are bounded ONLY by the wall-clock gtimeout below. Before this, a single
# hung Sentry/Supabase MCP tool call (zero output, indefinite block) stalled the
# whole lane until the multi-minute ceiling fired (exit 124) — discarding all
# work and burning ~25 min of sonnet/opus. 12/37 lane-runs (32%) died this way on
# 2026-05-25; the loop self-proposed "wrap each MCP call in gtimeout 30" for 4
# nights but that is unimplementable — MCP tools run INSIDE the claude process,
# not as shell commands. The real lever is Claude's CLIENT-SIDE watchdog:
#   MCP_TOOL_TIMEOUT — hard wall-clock per tool call (ms). On exceed, Claude gets
#                      a tool error and CONTINUES; it does not kill the process.
#   MCP_TIMEOUT      — MCP server startup budget (ms); a dead server fails fast.
# 60s/20s are deliberately generous for night one (Sentry MCP is HTTP/SSE, whose
# first-byte budget has a 60s floor regardless — only the tool-call watchdog
# honours sub-60s) so no legitimate slow query is clipped; tune DOWN after a
# clean run. Both are overridable so the operator can retune without editing.
export MCP_TOOL_TIMEOUT="${MCP_TOOL_TIMEOUT:-60000}"
export MCP_TIMEOUT="${MCP_TIMEOUT:-20000}"

# --- Mandatory-Minimum-Artifact contract -------------------------------------
# Prepended to EVERY lane prompt so a lane can never "give up" / produce nothing.
# The lane writes docs/nightly/artifacts/lane-<id>-<date>.md as its FIRST action
# and updates it last. Because docs/ lives outside fe-next/ (where lint/test/build
# run) the artifact is gate-clean by construction, so even a lane that times out
# after writing only this file still ships it (with KEEP_TIMEOUT_PARTIALS=1) — the
# floor is "a reviewable artifact every run", not "a perfect deliverable".
nightly_artifact_contract() { # <lane_id> <today>
  local lane_id="$1" today="$2"
  cat <<EOF
═══ MANDATORY MINIMUM ARTIFACT (non-negotiable — do this FIRST, before any heavy work) ═══
Your FIRST action this lane: create docs/nightly/artifacts/lane-${lane_id}-${today}.md
(mkdir -p the dir if missing) containing at least:
    status: planned
    attempted: <one line — what you intend to do tonight>
Then do the lane's work. Just before you finish — OR the moment you sense the time
budget is nearly spent — UPDATE that file to:
    status: shipped | partial | research-only | blocked
    files_touched: <list, or none>
    next_steps: <what tomorrow's run should pick up>
NEVER exit having produced nothing. A timed-out lane that leaves only this artifact
still counts as a successful-but-degraded run: the artifact is gate-clean (docs/ is
outside fe-next/) and ships, so the lane is never a total loss. This is your floor.

EOF
}

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
  # Player-feedback digest written once before the lane loop (lib/feedback-digest.sh).
  # Path is exported as FEEDBACK_SUMMARY_FILE; fall back to the conventional path.
  local feedback_file="${FEEDBACK_SUMMARY_FILE:-$PROJECT_DIR/docs/nightly/feedback/summary-$today.md}"

  local rendered
  rendered=$(mktemp -t "lane-${lane_id}-prompt.XXXXXX")
  # Python: handles multi-line learnings cleanly (awk -v chokes on newlines,
  # sed chokes on special chars in the content).
  /usr/bin/env python3 - "$today" "8" "${learnings_file}" "${feedback_file}" "$prompt_file" > "$rendered" <<'PY'
import sys, os
today, cap, learnings_path, feedback_path, prompt_path = sys.argv[1:6]
learnings = ''
if learnings_path and os.path.exists(learnings_path):
    with open(learnings_path, encoding='utf-8') as f:
        learnings = f.read()
feedback = ''
if feedback_path and os.path.exists(feedback_path):
    with open(feedback_path, encoding='utf-8') as f:
        feedback = f.read()
with open(prompt_path, encoding='utf-8') as f:
    text = f.read()
text = (text
        .replace('__TODAY__', today)
        .replace('__PER_LANE_CAP__', cap)
        .replace('__LEARNINGS__', learnings)
        .replace('__FEEDBACK_SUMMARY__', feedback.strip() or 'No player feedback in the window. Proceed normally.'))
sys.stdout.write(text)
PY

  # Prepend the Mandatory-Minimum-Artifact contract so every lane has a shippable
  # floor even on timeout (the "never give up on a lane" guarantee). Goes above the
  # lane body; the founder-directives block below still lands on top of it.
  local with_contract
  with_contract=$(mktemp -t "lane-${lane_id}-contract.XXXXXX")
  { nightly_artifact_contract "$lane_id" "$today"; cat "$rendered"; } > "$with_contract" && mv "$with_contract" "$rendered"

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

  # Run in stream-json + verbose so EVERY tool call is observable. In plain text
  # output `-p` prints only the final message, so a lane that hangs mid-tool
  # produced 20 min of silence then exit 124 — we could never see WHICH MCP call
  # hung (every diagnosis was inference; logs run-20260525 lane 1 = zero output).
  # Now: the full stream-json goes to a per-lane sidecar (greppable forensics),
  # and lib/stream-timeline.py collapses it into a compact wall-clock timeline
  # teed into the run log. The LAST "▶ <tool>" with no matching "✓ <tool>" is the
  # hung call, NAMED (e.g. mcp__supabase__execute_sql + its SQL preview).
  local stream_sidecar timeline
  stream_sidecar="$(dirname "$log_file")/stream-${lane_id}-$(date +%H%M%S).ndjson"
  timeline="$(dirname "${BASH_SOURCE[0]}")/stream-timeline.py"

  "${timeout_cmd[@]}" \
    claude -p "$(cat "$rendered")" \
      --allowedTools '*' \
      --dangerously-skip-permissions \
      --output-format stream-json \
      --verbose \
      --model "$model" \
      < /dev/null 2>&1 \
    | tee "$stream_sidecar" \
    | python3 "$timeline" \
    | tee -a "$log_file"
  local rc=${PIPESTATUS[0]}
  echo "headless: lane=$lane_id rc=$rc — full stream-json sidecar: $stream_sidecar" | tee -a "$log_file"

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
