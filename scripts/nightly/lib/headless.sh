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
nightly_artifact_contract() { # <lane_id> <today> <timeout_sec>
  local lane_id="$1" today="$2" timeout_sec="${3:-900}"
  local budget_min=$(( timeout_sec / 60 ))
  # 80% of budget, floored, is the "stop starting new edits, finalize now" mark.
  local finalize_min=$(( (timeout_sec * 8 / 10) / 60 )); [ "$finalize_min" -lt 1 ] && finalize_min=1
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

═══ TIME BUDGET & SCOPE DISCIPLINE (the #1 reason lanes ship nothing) ═══
LIVE ENFORCEMENT (not advice — a hook acts before each tool call): you cannot feel
time pass, so a guard injects your remaining minutes before every edit/Bash, and it
will BLOCK (deny) any NEW file edit once you pass the ~${finalize_min}-min finalize
cutoff or exceed your working-set file cap. When you see such a deny, do
NOT retry it — it means "stop opening new work": finish + tsc/lint-verify the files you
already changed (or \`git checkout -- <file>\` to revert an incomplete one), update your
artifact, and END the turn. Plan so this never bites: pick a change small enough to land
AND self-verify well before the cutoff.
You have ~${budget_min} MINUTES of wall-clock. At ~${finalize_min} min you are HARD-KILLED
(SIGTERM) — anything you have not finished is left HALF-WRITTEN, and a half-written
file (broken import, unclosed JSX, dangling edit) FAILS the lint/build gate and gets
your code DROPPED. On 2026-06-01 five of six code lanes were killed mid-edit and shipped
ZERO code this way. Avoid that:
  • Make ONE focused, COMPLETE, gate-clean change — not three half-finished ones.
    One small correct shipped change beats a sprawling broken one every time.
  • NEVER begin an edit you cannot FINISH **and self-verify** within budget. Before a
    large multi-file change, ask: "can I land + tsc/lint-check this in the time left?"
    If not, pick a smaller change.
  • By ~${finalize_min} min: STOP starting new work. Finish the edit in flight, run a
    quick \`cd fe-next && npx tsc --noEmit\` (or \`npx eslint <your changed files>\`) on
    ONLY your changed files to confirm they are clean, then update the artifact and END.
    A lane that voluntarily finishes clean at ${finalize_min} min ships; one that sprawls
    to the kill at ${budget_min} min ships nothing.
  • Leaving a file mid-edit is WORSE than not touching it: it poisons the gate. If you
    are out of time, REVERT any incomplete edit (\`git checkout -- <file>\`) before ending.

SPEED: code search is your dominant wall-clock cost. ALWAYS use \`rg\` (ripgrep — installed)
over \`grep -r\`/\`find\` (10× faster on the fe-next/ tree). Trust the intelligence brief
below: act on its ranked signals; do NOT re-run broad discovery the brief already did.

REVENUE (standing priority): earning money is a MAIN goal of this loop — ad revenue
(Android AdMob live; web H5/AdSense pending approval) AND education-institution upsell.
When a change you are ALREADY making has a revenue angle (a CTA that could convert, a
page that could capture a school lead, an ad surface that could fill), prefer the
revenue-positive option — as long as it stays truthful and does not harm the core
experience. HARD LINE: never change coin-award amounts, ad-reward values, the coin
economy, or payment/billing logic — human-queue-only, NEVER an autonomous change in
ANY lane (including Lane 09). Lane 09 owns the OTHER dedicated monetization work:
ad-UX (flagged), education upsell, and demand experiments — not the economy itself.

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

  # Per-lane intelligence brief slice (Phase 0 wrote brief.json; spec §6). The
  # brief-slice helper prints this lane's top scored items, or the brief-first /
  # bounded-fallback contract text when the lane has none. Path is exported as
  # BRIEF_JSON_FILE; fall back to the conventional path.
  local brief_json_file="${BRIEF_JSON_FILE:-$PROJECT_DIR/docs/nightly/intel/$today/brief.json}"
  local brief_file
  brief_file=$(mktemp -t "lane-${lane_id}-brief.XXXXXX")
  bash "$(dirname "${BASH_SOURCE[0]}")/intel/brief-slice.sh" "$brief_json_file" "$lane_id" > "$brief_file" 2>/dev/null || true

  local rendered
  rendered=$(mktemp -t "lane-${lane_id}-prompt.XXXXXX")
  # Python: handles multi-line learnings cleanly (awk -v chokes on newlines,
  # sed chokes on special chars in the content).
  /usr/bin/env python3 - "$today" "8" "${learnings_file}" "${feedback_file}" "$prompt_file" "${brief_file}" > "$rendered" <<'PY'
import sys, os
today, cap, learnings_path, feedback_path, prompt_path, brief_path = sys.argv[1:7]
learnings = ''
if learnings_path and os.path.exists(learnings_path):
    with open(learnings_path, encoding='utf-8') as f:
        learnings = f.read()
feedback = ''
if feedback_path and os.path.exists(feedback_path):
    with open(feedback_path, encoding='utf-8') as f:
        feedback = f.read()
brief = ''
if brief_path and os.path.exists(brief_path):
    with open(brief_path, encoding='utf-8') as f:
        brief = f.read()
with open(prompt_path, encoding='utf-8') as f:
    text = f.read()
text = (text
        .replace('__TODAY__', today)
        .replace('__PER_LANE_CAP__', cap)
        .replace('__LEARNINGS__', learnings)
        .replace('__FEEDBACK_SUMMARY__', feedback.strip() or 'No player feedback in the window. Proceed normally.')
        .replace('__BRIEF__', brief.strip() or 'No intelligence brief available this run. Proceed with a standard scan.'))
sys.stdout.write(text)
PY
  rm -f "$brief_file" 2>/dev/null || true

  # Prepend the Mandatory-Minimum-Artifact contract so every lane has a shippable
  # floor even on timeout (the "never give up on a lane" guarantee). Goes above the
  # lane body; the founder-directives block below still lands on top of it.
  local with_contract
  with_contract=$(mktemp -t "lane-${lane_id}-contract.XXXXXX")
  { nightly_artifact_contract "$lane_id" "$today" "$timeout_sec"; cat "$rendered"; } > "$with_contract" && mv "$with_contract" "$rendered"

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

  # Per-lane MCP scoping: boot ONLY the servers this lane uses (lib/mcp-config.sh)
  # instead of all ~23 global+plugin servers. Lanes needing none get an empty config →
  # zero MCP boot. On any build failure we DROP the flags and fall back to the full set
  # (today's behavior) so a lane is never stranded without a server it needs.
  local mcp_args=() lane_mcp_cfg=""
  # shellcheck source=/dev/null
  . "$(dirname "${BASH_SOURCE[0]}")/mcp-config.sh"
  lane_mcp_cfg=$(mktemp -t "lane-${lane_id}-mcp.XXXXXX")
  if build_lane_mcp_config "$lane_id" "$lane_mcp_cfg"; then
    mcp_args=(--mcp-config "$lane_mcp_cfg" --strict-mcp-config)
    echo "headless: lane=$lane_id MCP scoped → $(jq -rc '.mcpServers|keys|join(",")|if .=="" then "(none)" else . end' "$lane_mcp_cfg" 2>/dev/null)" | tee -a "$log_file"
  else
    rm -f "$lane_mcp_cfg" 2>/dev/null || true; lane_mcp_cfg=""
    echo "headless: lane=$lane_id MCP scope build failed → falling back to full MCP set" | tee -a "$log_file"
  fi

  # --- Mechanical time + scope enforcement (PreToolUse hook) -------------------
  # ROOT-CAUSE fix for the recurring exit-124 epidemic. Forensics (2026-06-02)
  # proved the lane agent is CLOCK-BLIND — across every timed-out AND every
  # successful lane it ran `date` zero times — so the relative "you have ~N min"
  # prompt budget was physically unactionable. Successful lanes weren't better at
  # time-telling; they just made small (1–5 edit) changes and exited naturally,
  # while losers sprawled (10 files, repeated full-repo tsc) until the invisible
  # SIGTERM fell mid-edit. Three weeks of PROMPT-layer fixes failed because the
  # agent can ignore prose. A PreToolUse hook fires OUTSIDE its control: even
  # under --dangerously-skip-permissions a `deny` blocks the edit. We write this
  # lane's deadline epochs + a fresh file-set scratch, then inject the guard via
  # --settings (which MERGES — existing user/project hooks still fire). The hook
  # is inert when LEXI_LANE_DEADLINE_FILE is unset, so it never affects normal use.
  local now_epoch finalize_epoch hard_epoch deadline_file fileset_file hook_settings hook_path
  now_epoch=$(date +%s)
  hard_epoch=$(( now_epoch + timeout_sec ))
  finalize_epoch=$(( now_epoch + timeout_sec * 8 / 10 ))   # 80% → leave a wrap-up window
  deadline_file=$(mktemp -t "lane-${lane_id}-deadline.XXXXXX")
  printf '%s %s %s\n' "$now_epoch" "$finalize_epoch" "$hard_epoch" > "$deadline_file"
  fileset_file=$(mktemp -t "lane-${lane_id}-fileset.XXXXXX"); : > "$fileset_file"
  export LEXI_LANE_DEADLINE_FILE="$deadline_file" \
         LEXI_LANE_FILESET_FILE="$fileset_file" \
         LEXI_LANE_FILE_CAP="${LANE_FILE_CAP:-8}"
  hook_path="$(dirname "${BASH_SOURCE[0]}")/hooks/lane-time-guard.sh"
  hook_settings=$(mktemp -t "lane-${lane_id}-hooks.XXXXXX")
  jq -nc --arg cmd "$hook_path" \
    '{hooks:{PreToolUse:[{matcher:"Edit|Write|MultiEdit|NotebookEdit|Bash",hooks:[{type:"command",command:("bash "+$cmd),timeout:10}]}]}}' \
    > "$hook_settings"
  echo "headless: lane=$lane_id time-guard armed → finalize @ +$(( timeout_sec*8/10/60 ))m, hard @ +$(( timeout_sec/60 ))m, file-cap=${LANE_FILE_CAP:-8}" | tee -a "$log_file"

  "${timeout_cmd[@]}" \
    claude -p "$(cat "$rendered")" \
      --allowedTools '*' \
      --settings "$hook_settings" \
      ${mcp_args[@]+"${mcp_args[@]}"} \
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

  [ -n "$lane_mcp_cfg" ] && rm -f "$lane_mcp_cfg" 2>/dev/null || true
  rm -f "$rendered" "$deadline_file" "$fileset_file" "$hook_settings" 2>/dev/null || true
  unset LEXI_LANE_DEADLINE_FILE LEXI_LANE_FILESET_FILE LEXI_LANE_FILE_CAP
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
