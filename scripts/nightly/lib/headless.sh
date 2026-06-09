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

# Progress watchdog (replaces the fixed wall-clock gtimeout cap on each lane).
# shellcheck source=/dev/null
. "$(dirname "${BASH_SOURCE[0]}")/idle-timeout.sh"

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

# --- session/usage-limit aware retry (root-cause fix 2026-06-09) --------------
# On 2026-06-09 the shared 5h Claude usage window was exhausted mid-run (evening
# interactive use before the 01:00 start). Lane 02 died after 47 turns with
# is_error:true result "You've hit your session limit · resets 3:40am
# (Europe/Stockholm)"; lanes 03-08 then instant-failed (1 turn, "rate_limit") and
# 09-10 recovered only AFTER the 3:40am reset. The runner was limit-blind: it
# treated the limit exactly like a code failure (rc=1 → revert lane → advance),
# so it burned six lanes as 1-second instant-fails instead of waiting ~2 min for
# the reset. These two PURE helpers are the testable core of the fix; the retry
# loop in headless_run() uses them to sleep-until-reset (overnight) or
# abort-and-report (LANE_LIMIT_NO_WAIT=1, for a budget-aware daytime re-run).

# _seconds_until_reset <message> — seconds from now until the reset clock named in
# a usage-limit message (e.g. "resets 3:40am"). LEXI_FAKE_NOW overrides now for
# tests. Echoes a non-negative integer, or "" when no am/pm clock is parseable
# (caller falls back to a bounded backoff). Reset clock is wall-time in the local
# TZ (the limit message clock is the machine's TZ).
_seconds_until_reset() {
  local msg="$1" clock hh mm ampm now reset_today secs
  # First am/pm clock following the word "resets".
  clock=$(printf '%s' "$msg" \
    | grep -oiE 'resets[^0-9]*[0-9]{1,2}(:[0-9]{2})?[[:space:]]*[ap]m' \
    | grep -oiE '[0-9]{1,2}(:[0-9]{2})?[[:space:]]*[ap]m' | head -1)
  [ -z "$clock" ] && { printf ''; return; }
  hh=$(printf '%s' "$clock" | grep -oE '^[0-9]{1,2}')
  mm=$(printf '%s' "$clock" | grep -oE ':[0-9]{2}' | tr -d ':'); [ -z "$mm" ] && mm=0
  ampm=$(printf '%s' "$clock" | grep -oiE '[ap]m' | tr 'A-Z' 'a-z')
  hh=$((10#$hh)); mm=$((10#$mm))
  if [ "$ampm" = "pm" ] && [ "$hh" -ne 12 ]; then hh=$((hh + 12)); fi
  if [ "$ampm" = "am" ] && [ "$hh" -eq 12 ]; then hh=0; fi
  now="${LEXI_FAKE_NOW:-$(date +%s)}"
  # Today's epoch (relative to `now`) at hh:mm local. BSD date (darwin runner).
  reset_today=$(date -j -f "%Y-%m-%d %H:%M:%S" \
    "$(date -r "$now" +%Y-%m-%d) $(printf '%02d:%02d:00' "$hh" "$mm")" +%s 2>/dev/null)
  [ -z "$reset_today" ] && { printf ''; return; }
  secs=$(( reset_today - now ))
  [ "$secs" -le 0 ] && secs=$(( secs + 86400 ))   # already past today → tomorrow
  printf '%s' "$secs"
}

# _detect_limit_signal <sidecar_file> — classify a failed lane's stream-json:
#   "WAIT <secs>" → an explicit usage/session limit with a parseable reset clock
#   "BACKOFF"     → a limit/rate_limit with no reset clock (short bounded wait)
#   ""            → no limit signal: a genuine code failure (caller reverts as usual)
_detect_limit_signal() {
  local f="$1" result_line secs
  [ -f "$f" ] || { printf ''; return; }
  # The session-limit surfaces as a result string mentioning "session/usage limit"
  # or "resets <clock>". Match the full "result":"..." value to feed the parser.
  result_line=$(grep -aoiE '"result":"[^"]*(session limit|usage limit|resets[^"]*)[^"]*"' "$f" 2>/dev/null | head -1)
  if [ -n "$result_line" ]; then
    secs=$(_seconds_until_reset "$result_line")
    if [ -n "$secs" ]; then printf 'WAIT %s' "$secs"; return; fi
    printf 'BACKOFF'; return
  fi
  # Bare rate_limit (assistant/error turn) with no reset clock.
  if grep -aqE 'rate_limit' "$f" 2>/dev/null; then printf 'BACKOFF'; return; fi
  printf ''
}

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
    large multi-file change, ask: "can I land + eslint-check this in the time left?"
    If not, pick a smaller change.
  • DO NOT run full-repo \`npx tsc --noEmit\`, \`npm run build\`, or \`npm run test\` to
    self-check — each is ~60s+ and the nightly GATE runs the FULL lint+type+test+build
    AUTHORITATIVELY after your lane (a half-written file is caught and dropped there).
    Re-running them yourself is the #1 timeout cause: a build kicked off near the
    deadline gets your lane SIGKILLed mid-run with nothing shipped. A live hook now
    CAPS these and BLOCKS them past the finalize cutoff — don't fight it. For a quick
    self-check, \`npx eslint <only your changed files>\` is fast and enough.
  • By ~${finalize_min} min: STOP starting new work. Finish the edit in flight, eslint
    ONLY your changed files to confirm they're clean, then update the artifact and END.
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

  echo "headless: lane=$lane_id model=$model budget=${timeout_sec}s (idle-watchdog; see time-guard line) prompt=$(wc -c < "$rendered")B" | tee -a "$log_file"

  # Bounding policy (2026-06-07): a PROGRESS watchdog, NOT a fixed wall-clock cap.
  # The old `gtimeout ${timeout_sec}s` SIGKILLed lanes that were still emitting
  # stream-json (4 lanes cut mid-edit on 2026-06-07). A lane streams a tool event on
  # every action, so "no new output for LANE_IDLE_SECS" (default 300s = 5min) is a
  # true wedge — a hung MCP call / dead loop — and the ONLY thing we kill on. The
  # per-lane `timeout_sec` arg + LANE_MAX_SECS (default 1800s) are kept only as a
  # far-out absolute backstop against a busy-but-useless lane (launchd's TimeOut is
  # advisory and won't stop a hang). A productive lane now runs to natural completion.
  local lane_idle lane_max
  lane_idle="${LANE_IDLE_SECS:-300}"
  lane_max="${LANE_MAX_SECS:-1800}"
  [ "$timeout_sec" -gt "$lane_max" ] && lane_max="$timeout_sec"

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
  # Epochs track the absolute backstop (lane_max), not the old fixed cap — the soft
  # edit-blocking guard must match the watchdog ceiling, not fire at the old 600/900s.
  hard_epoch=$(( now_epoch + lane_max ))
  finalize_epoch=$(( now_epoch + lane_max * 8 / 10 ))   # 80% → leave a wrap-up window
  deadline_file=$(mktemp -t "lane-${lane_id}-deadline.XXXXXX")
  printf '%s %s %s\n' "$now_epoch" "$finalize_epoch" "$hard_epoch" > "$deadline_file"
  fileset_file=$(mktemp -t "lane-${lane_id}-fileset.XXXXXX"); : > "$fileset_file"
  export LEXI_LANE_DEADLINE_FILE="$deadline_file" \
         LEXI_LANE_FILESET_FILE="$fileset_file" \
         LEXI_LANE_FILE_CAP="${LANE_FILE_CAP:-8}"
  hook_path="$(dirname "${BASH_SOURCE[0]}")/hooks/lane-time-guard.sh"
  hook_settings=$(mktemp -t "lane-${lane_id}-hooks.XXXXXX")
  # Matcher also covers WebSearch/WebFetch + all mcp__ tools so the guard can bound
  # runaway research (read-only intel MCP + web) past the research window — the
  # remaining timeout sink after edit-sprawl was already capped. The hook no-ops for
  # non-research mcp tools, so write-capable servers (supabase/railway) stay ungated.
  jq -nc --arg cmd "$hook_path" \
    '{hooks:{PreToolUse:[{matcher:"Edit|Write|MultiEdit|NotebookEdit|Bash|WebSearch|WebFetch|mcp__.*",hooks:[{type:"command",command:("bash "+$cmd),timeout:10}]}]}}' \
    > "$hook_settings"
  echo "headless: lane=$lane_id time-guard armed → idle-kill @ ${lane_idle}s no-output, finalize @ +$(( lane_max*8/10/60 ))m, hard backstop @ +$(( lane_max/60 ))m, file-cap=${LANE_FILE_CAP:-8}" | tee -a "$log_file"

  # Write claude's stream straight to the sidecar FILE — NOT a live `| tee | python3
  # | tee` pipe. A long-lived MCP server is a child of claude and inherits its
  # stdout fd; on a live pipe that fd keeps the downstream tee/python from ever
  # seeing EOF, so AFTER the agent emits its final `result` the lane sat idle until
  # the SIGTERM — a FALSE exit-124 (lane 05 hung 5m45s post-completion on 2026-06-03).
  # A file redirect never blocks on a child fd: the watchdog waits on claude's OWN pid
  # and returns the instant claude exits; we render the timeline from the file after.
  # The sidecar's byte-growth IS the progress signal run_with_idle_timeout watches —
  # every tool event appends to it, so a working lane never idle-trips; on a real wedge
  # (no event for lane_idle) it kills claude + its MCP server tree and returns 124,
  # exactly the exit code the KEEP_TIMEOUT_PARTIALS salvage already handles.
  # Inner runner so the limit-aware retry below re-invokes IDENTICALLY (no drift).
  # --allowedTools is intentionally omitted: --dangerously-skip-permissions already
  # grants every tool, and the CLI now REJECTS the legacy `--allowedTools '*'`
  # wildcard with a warning banner (a latent hard-error in a future CLI) — dropping
  # the redundant flag removes the noise and that risk.
  _invoke_claude_lane() { # <sidecar>
    run_with_idle_timeout "$lane_idle" "$lane_max" "$1" -- \
      claude -p "$(cat "$rendered")" \
        --settings "$hook_settings" \
        ${mcp_args[@]+"${mcp_args[@]}"} \
        --dangerously-skip-permissions \
        --output-format stream-json \
        --verbose \
        --model "$model"
  }
  _invoke_claude_lane "$stream_sidecar"
  local rc=$?

  # --- limit-aware retry: pause across a usage-window reset, don't cascade ------
  # A session/usage-limit error is TRANSIENT, not a code failure. Without this the
  # loop reverts the lane and advances — and every subsequent lane instant-fails on
  # the same exhausted window (six lanes lost 2026-06-09). Detect it, wait for the
  # reset (capped), RECOMPUTE the deadline epochs (CRITICAL: the lane-time-guard hook
  # keys off them; reusing stale epochs after a long sleep would deny every tool call
  # on the retry and reproduce the very instant-fail this fixes), then re-run.
  # LANE_LIMIT_NO_WAIT=1 → abort-and-report (rc=75) instead of a multi-hour daytime
  # sleep, for a budget-aware manual re-run.
  local limit_tries=0 max_limit_tries="${LANE_LIMIT_RETRIES:-1}"
  while [ "$rc" -ne 0 ] && [ "$limit_tries" -lt "$max_limit_tries" ]; do
    local signal wait_secs cap
    signal=$(_detect_limit_signal "$stream_sidecar")
    [ -z "$signal" ] && break   # genuine failure → fall through to the normal revert
    case "$signal" in
      WAIT\ *) wait_secs="${signal#WAIT }" ;;
      *)       wait_secs="${LANE_LIMIT_BACKOFF:-120}" ;;   # BACKOFF / unparsed
    esac
    cap="${LANE_LIMIT_MAX_WAIT:-21600}"                    # 6h ceiling
    [ "$wait_secs" -gt "$cap" ] && wait_secs="$cap"
    [ "$wait_secs" -lt 1 ] && wait_secs="${LANE_LIMIT_BACKOFF:-120}"
    if [ "${LANE_LIMIT_NO_WAIT:-0}" = "1" ]; then
      echo "headless: lane=$lane_id USAGE-LIMIT hit; LANE_LIMIT_NO_WAIT=1 → abort (would wait ${wait_secs}s); rc=75 (retry-later, not a code failure)" | tee -a "$log_file"
      rc=75; break
    fi
    echo "headless: lane=$lane_id USAGE-LIMIT hit ($signal) — sleeping ${wait_secs}s for window reset, then retry (attempt $((limit_tries + 2)))" | tee -a "$log_file"
    sleep "$wait_secs"
    now_epoch=$(date +%s)
    hard_epoch=$(( now_epoch + lane_max ))
    finalize_epoch=$(( now_epoch + lane_max * 8 / 10 ))
    printf '%s %s %s\n' "$now_epoch" "$finalize_epoch" "$hard_epoch" > "$deadline_file"
    : > "$fileset_file"; rm -f "${deadline_file}.heavy" 2>/dev/null || true
    stream_sidecar="$(dirname "$log_file")/stream-${lane_id}-$(date +%H%M%S).ndjson"
    _invoke_claude_lane "$stream_sidecar"
    rc=$?
    limit_tries=$((limit_tries + 1))
  done

  # Render the compact wall-clock timeline from the (final) captured sidecar into the
  # run log (post-hoc, not live — observability is preserved; the hang is not).
  python3 "$timeline" < "$stream_sidecar" 2>/dev/null | tee -a "$log_file" \
    || tail -40 "$stream_sidecar" >> "$log_file" 2>/dev/null || true
  echo "headless: lane=$lane_id rc=$rc — full stream-json sidecar: $stream_sidecar" | tee -a "$log_file"

  [ -n "$lane_mcp_cfg" ] && rm -f "$lane_mcp_cfg" 2>/dev/null || true
  rm -f "$rendered" "$deadline_file" "${deadline_file}.heavy" "$fileset_file" "$hook_settings" 2>/dev/null || true
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
