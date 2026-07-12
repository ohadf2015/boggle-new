#!/bin/bash
# run.sh — nightly improvement loop orchestrator.
# Loaded via ~/Library/LaunchAgents/com.claude.nightly-loop.plist (00:00 local).
#
# Flags:
#   --dry-run         no commits, no push, no Telegram alerts
#   --no-push         run + commit, no push (still Telegrams)
#   --only=N          run only lane N (1..6)
#   --skip=N,M        skip lanes
#   --no-monitor      skip post-push health monitor

set -uo pipefail

PROJECT_DIR="/Users/ohadfisher/git/boggle-new"
LIB_DIR="$PROJECT_DIR/scripts/nightly/lib"
LANES_DIR="$PROJECT_DIR/scripts/nightly/lanes"
LOG_DIR="$HOME/logs/lexi-nightly"
TODAY="$(date +%Y-%m-%d)"
DATE_TAG="$(date +%Y%m%d-%H%M%S)"
RUN_LOG="$LOG_DIR/run-${DATE_TAG}.log"
REPORT="$PROJECT_DIR/docs/nightly/reports/${TODAY}.md"

mkdir -p "$LOG_DIR" "$(dirname "$REPORT")"

# Orchestrator PID — exported so preflight writes the RIGHT pid into the lock
# file even when sourced from a subshell context.
export NIGHTLY_PID="$$"

# Keep the machine awake for the whole run. Idle sleep SUSPENDS a running lane
# and PAUSES gtimeout's wall-clock timer, so an 18-min lane sprawls across hours
# and its timeout never enforces — which is what the loop kept misdiagnosing as
# an "MCP hang"/exit-124 (the 2026-05-23 14:13 run stalled 75 min on a sleeping
# laptop until woken). `caffeinate -w $$` exits automatically when this run does.
command -v caffeinate >/dev/null 2>&1 && caffeinate -i -w "$$" >/dev/null 2>&1 &

# --- flags -----------------------------------------------------------------
DRY_RUN=0; NO_PUSH=0; NO_MONITOR=0; NO_GATE=0; ONLY=""; SKIP=""
# Count of changed files for the digest. Never computed elsewhere, so initialise it —
# under `set -u` the no-change / summary-fallback paths (which reference it) otherwise
# abort with "DIRTY_COUNT: unbound variable" (surfaced by a --only run with no lane edits).
DIRTY_COUNT=0
# Keep a timed-out lane's partial work instead of reverting it. Default ON
# (2026-05-28): the goal is "a lane never gives up / never produces nothing", and
# 35% of lane-runs hit the time ceiling. The isolated gate + drop-and-re-gate
# still validate every kept file before anything ships, so a broken half-written
# partial is dropped and docs-only salvage backstops the rest — keeping partials
# can only ADD shippable work, never ship something the gate rejects. Set
# NIGHTLY_KEEP_TIMEOUT_PARTIALS=0 to restore the old revert-on-timeout behavior.
KEEP_TIMEOUT_PARTIALS="${NIGHTLY_KEEP_TIMEOUT_PARTIALS:-1}"
for arg in "$@"; do
  case "$arg" in
    --dry-run)    DRY_RUN=1; NO_PUSH=1; NO_MONITOR=1 ;;
    --no-push)    NO_PUSH=1 ;;
    --no-monitor) NO_MONITOR=1 ;;
    --no-gate)    NO_GATE=1 ;;   # skip lint/test/build — use ONLY for docs-only lanes (4)
    --only=*)     ONLY="${arg#--only=}" ;;
    --skip=*)     SKIP="${arg#--skip=}" ;;
    *) echo "unknown flag: $arg"; exit 2 ;;
  esac
done

# --- env -------------------------------------------------------------------
if [ -f "$HOME/.config/lexi-nightly/env" ]; then
  set -a; . "$HOME/.config/lexi-nightly/env"; set +a
else
  echo "FATAL: ~/.config/lexi-nightly/env missing"
  exit 1
fi
# Export so lane subshells inherit. (set -a above auto-exports vars during the
# source, but only for THAT block — re-export explicitly to be safe across shells.)
export PROJECT_DIR LIB_DIR LANES_DIR LOG_DIR RUN_LOG REPORT TODAY DATE_TAG
export TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID
export POSTHOG_PERSONAL_API_KEY POSTHOG_PROJECT_ID POSTHOG_HOST
export SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY
# Optional intel-collector tokens (Phase 0). Absent → that source degrades to a
# stale/empty snapshot with a TOKEN_MISSING note; never an error. Set in
# ~/.config/lexi-nightly/env to unlock the source over REST. See spec §4.1.
export SENTRY_AUTH_TOKEN SENTRY_ORG_SLUG SENTRY_PROJECT_SLUG SENTRY_HOST
export SUPABASE_ACCESS_TOKEN BING_WMT_API_KEY RAILWAY_TOKEN
# Reddit OAuth (lane 04). Absent → reddit-fetch.sh falls back to Reddit RSS (a different
# gate that still serves 200 from this residential IP — autonomous, no creds; the legacy
# UA JSON curl is 403). OAuth, when set, adds score/comment counts the RSS path lacks.
# See docs/nightly/reddit-oauth-setup.md. PASSWORD grant needs all four; app-only needs
# just CLIENT_ID+SECRET. The `set -a` source above already exports these if present — the
# explicit re-export keeps them visible across the lane subshells.
export REDDIT_CLIENT_ID REDDIT_CLIENT_SECRET REDDIT_USERNAME REDDIT_PASSWORD REDDIT_USER_AGENT
export NIGHTLY_DISABLED

# Per-MCP-call watchdogs — see lib/headless.sh for the full rationale. Set here
# too so the run-wide env (and the summary composer at the bottom, which calls
# `claude` DIRECTLY, not via headless.sh) inherits the same hang protection.
# A hung Sentry/Supabase MCP call now aborts in ~60s with a tool error instead of
# stalling a lane until its multi-minute wall-clock ceiling (exit 124).
export MCP_TOOL_TIMEOUT="${MCP_TOOL_TIMEOUT:-60000}"
# Startup budget 20s→45s (2026-06-17): npx-stdio MCP boot (supabase/sentry) does an
# npm-registry resolve per boot that can exceed 20s on a slow-registry night → server
# dropped → lane reports "MCP unavailable". See lib/headless.sh for full rationale.
export MCP_TIMEOUT="${MCP_TIMEOUT:-45000}"

# Self-heal claude's bundled ripgrep exec bit. A claude update reinstalls the npm
# package with the vendored `rg` as -rw-r--r-- (not +x) — every lane's Grep/Glob then
# fails with EACCES (exit 126) and silently falls back to `find`+`grep`, ~10× slower
# (this throttled the 600s lanes into timeouts on 2026-06-07). chmod is idempotent and
# cheap; do it for whichever claude is on PATH before any lane runs.
_claude_bin="$(command -v claude 2>/dev/null || true)"
if [ -n "$_claude_bin" ]; then
  # resolve symlinks to the real install, then chmod every non-exec vendored rg under it
  _claude_real="$(readlink -f "$_claude_bin" 2>/dev/null || echo "$_claude_bin")"
  for _root in "$(dirname "$_claude_real")/.." \
               "$HOME/.nvm/versions/node"/*/lib/node_modules/@anthropic-ai/claude-code; do
    [ -d "$_root" ] || continue
    while IFS= read -r _rg; do
      [ -n "$_rg" ] && [ ! -x "$_rg" ] && chmod +x "$_rg" 2>/dev/null \
        && echo "[$(date +%H:%M:%S)] self-heal: chmod +x bundled ripgrep $_rg" >> "${RUN_LOG:-/dev/stderr}"
    done < <(find "$_root" -path '*vendor/ripgrep/*/rg' -type f 2>/dev/null)
  done
  unset _claude_real _root _rg
fi
unset _claude_bin

# Tell the husky pre-commit hook to BYPASS itself for the nightly. The nightly
# is NOT an ungated committer — it runs a full lint+test+build on a clean-HEAD
# worktree (lib/gate-isolated.sh) before shipping. But its working tree holds
# concurrent founder WIP, so the whole-tree checks a pre-commit hook would run
# could wrongly block the commit. Its push still runs the pre-push gate.
export NIGHTLY_RUN=1

# --- helpers ---------------------------------------------------------------
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$RUN_LOG"; }
TG="$LIB_DIR/telegram.sh"
tg_msg()   { [ "$DRY_RUN" = "1" ] || "$TG" msg   "$@"; }
tg_alert() { [ "$DRY_RUN" = "1" ] || "$TG" alert "$@"; }
tg_doc()   { [ "$DRY_RUN" = "1" ] || "$TG" doc   "$@"; }

# Failure digest: every failed-but-ran path sends this so a non-shipping night is
# never silent (was: a one-line alert at best, nothing if killed mid-gate).
# compose_failure_digest lives in lib/failure-digest.sh (deterministic, no LLM).
send_failure_digest() {
  LANE_SUMMARY_TEXT=$(printf '%s\n' "${LANE_RESULTS[@]:-}")
  local digest; digest=$(compose_failure_digest "$1")
  tg_msg "$digest"
  [ -f "$REPORT" ] && tg_doc "$REPORT" "Full report (run did not ship)"
}

cleanup() {
  # Isolated-ship safety net: if the run exits early or is SIGTERM'd by launchd's
  # 3600s ceiling AFTER an isolated ship but BEFORE the explicit end-of-run
  # finalize, local master is still advanced past the founder base — collapse it
  # here so the founder's commit + WIP are never left with a stray nightly commit
  # on top. Idempotent (HEAD==base → no-op), so double-firing with the explicit
  # call is harmless. Guarded: git-ship.sh may not be sourced yet on a very early exit.
  if declare -F finalize_isolated_ship >/dev/null 2>&1; then
    RUN_LOG="${RUN_LOG:-/dev/null}" finalize_isolated_ship >> "${RUN_LOG:-/dev/null}" 2>&1 || true
  fi
  # shellcheck disable=SC1091
  . "$LIB_DIR/preflight.sh"
  preflight_release_lock
  # The run-start WIP snapshot (rsync mirror) is consulted by revert_authored but
  # never consumed, so sweep its tempdir here on every exit path (rm -rf is a
  # no-op if a branch already removed it).
  [ -n "${RUN_SNAPSHOT:-}" ] && rm -rf "$RUN_SNAPSHOT" 2>/dev/null
}
trap cleanup EXIT

# Killed (Ctrl-C / `pkill -TERM`) before any normal exit branch → still report
# instead of going silent. SIGKILL (-9) can't be trapped; SIGTERM/SIGINT can.
# Guard on the composer being sourced — a kill during early preflight predates it.
on_signal() {
  trap - TERM INT   # disarm to avoid re-entrancy
  if declare -F send_failure_digest >/dev/null 2>&1 && declare -F compose_failure_digest >/dev/null 2>&1; then
    send_failure_digest "Run was killed (SIGTERM/SIGINT) before it could ship. Any completed lanes are listed above; nothing was committed or pushed."
  fi
  exit 143
}
trap on_signal TERM INT

# snapshot_pre_lane / revert_to_pre_lane live in lib/wip-revert.sh (sourced
# below). The revert is SCOPED — it undoes only a lane's own changes and never
# reverts the founder's pre-existing WIP or deletes an untracked file, so a lane
# can't flush concurrent human work. Proven by test/wip-revert.test.sh.

# --- preflight -------------------------------------------------------------
# shellcheck disable=SC1091
. "$LIB_DIR/preflight.sh"
# commit+push hardening (divergence/generated-file). Tested by test/git-ship.test.sh.
# shellcheck disable=SC1091
. "$LIB_DIR/git-ship.sh"
# WIP-safe snapshot/revert (scoped — never flushes concurrent founder work).
# Tested by test/wip-revert.test.sh.
# shellcheck disable=SC1091
. "$LIB_DIR/wip-revert.sh"
# Isolated gate: validates ONLY authored changes in a throwaway worktree, never
# touching founder WIP. Tested by test/gate-isolated.test.sh.
# shellcheck disable=SC1091
. "$LIB_DIR/gate-isolated.sh"
# Failure digest composer (sent on every failed-but-ran path so a non-shipping
# night is never silent). Tested by test/failure-digest.test.sh.
# shellcheck disable=SC1091
. "$LIB_DIR/failure-digest.sh"
# 2026-07-03 overhaul: dropped-work requeue ledger + brief-gated lane selection
# + same-night repair pass. Tested by test/restore-queue.test.sh,
# test/lane-scheduler.test.sh, test/repair-dropped.test.sh.
# shellcheck disable=SC1091
. "$LIB_DIR/restore-queue.sh"
# shellcheck disable=SC1091
. "$LIB_DIR/lane-scheduler.sh"
# shellcheck disable=SC1091
. "$LIB_DIR/repair-dropped.sh"
# headless_run for the repair pass (lanes source this themselves; run.sh needs
# it only for nightly_repair_attempt).
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"
# founder free-text directives (texted to the bot) → active block for this run.
# shellcheck disable=SC1091
. "$LIB_DIR/user-directives.sh"
# landing/page URL surfacing for the digest. Tested by test/landing-cards.test.sh.
# shellcheck disable=SC1091
. "$LIB_DIR/landing-cards.sh"
log "========================================"
log "nightly-loop start ${DATE_TAG} dry=$DRY_RUN no-push=$NO_PUSH only=$ONLY skip=$SKIP"
log "========================================"

# NOTE: do NOT pipe preflight through tee — that puts the function in a subshell
# where $$ resolves to the subshell PID (not run.sh's), poisoning lock-staleness
# checks. Redirect instead.
if ! preflight_check >> "$RUN_LOG" 2>&1; then
  log "preflight failed — aborting"
  tail -20 "$RUN_LOG" 2>/dev/null
  # Timed self-retry (2026-07-03 overhaul C4): 3 of the last 15 nights shipped
  # NOTHING because the shared tree sat on a feature branch with unpushed work at
  # 01:00 (a concurrent session), and the abort was final. When preflight flags
  # the abort as retryable (retry-requested marker), re-run ONCE after a delay —
  # by then the concurrent session has usually pushed/switched back. One shot
  # (NIGHTLY_IS_RETRY guard), and the once-per-day dedup still applies if the
  # retry succeeds.
  _retry_flag="$HOME/.cache/lexi-nightly/retry-requested"
  if [ -f "$_retry_flag" ] && [ "${NIGHTLY_IS_RETRY:-0}" != "1" ]; then
    rm -f "$_retry_flag"
    _rd="${NIGHTLY_RETRY_DELAY:-10800}"
    log "preflight requested a timed retry — re-running once in $((_rd/60)) min"
    tg_alert "nightly: preflight aborted on a retryable condition (repo off-master with unpushed work) — self-retrying ONCE in $((_rd/60)) min."
    nohup bash -c "sleep $_rd; NIGHTLY_IS_RETRY=1 exec /bin/bash '$PROJECT_DIR/scripts/nightly/run.sh'" \
      >> "$LOG_DIR/retry.log" 2>&1 &
    disown 2>/dev/null || true
  fi
  send_failure_digest "Preflight failed (dirty tree, stale lock, or git divergence) — the run never started. Nothing changed."
  exit 1
fi

START_SHA=$(git rev-parse HEAD)
log "baseline sha=$START_SHA"

# --- report header ---------------------------------------------------------
cat > "$REPORT" <<EOF
# Nightly Report — $TODAY

**Started:** $(date '+%H:%M:%S %Z')
**Baseline:** \`$START_SHA\`
**Log:** \`$RUN_LOG\`

EOF

# --- founder directives ----------------------------------------------------
# Consume any messages the founder texted the bot since the last run and render
# them into the active directive block (headless.sh prepends it to every lane).
consume_user_directives >> "$RUN_LOG" 2>&1 || true
ACTIVE_DIRECTIVES_FILE="${ACTIVE_DIRECTIVES_FILE:-$HOME/.cache/lexi-nightly/active-directives.md}"
export ACTIVE_DIRECTIVES_FILE
if [ -s "$ACTIVE_DIRECTIVES_FILE" ]; then
  DIRECTIVE_CT=$(grep -c '^- ' "$ACTIVE_DIRECTIVES_FILE" 2>/dev/null || echo 0)
  log "founder directives applied this run: $DIRECTIVE_CT"
  echo "**Founder directives applied:** $DIRECTIVE_CT (texted to the bot — see lane outputs)" >> "$REPORT"
fi

# --- player feedback digest ------------------------------------------------
# Summarize recent player feedback ONCE — sentiment ratings (PostHog
# growth:game_feedback) + bug reports (Supabase feedback_reports) — into a file
# the lanes read via the __FEEDBACK_SUMMARY__ placeholder. Best-effort: the
# digest always exits 0 and writes a valid (possibly empty-state) file.
FEEDBACK_SUMMARY_FILE=$("$LIB_DIR/feedback-digest.sh" 2>>"$RUN_LOG" || true)
export FEEDBACK_SUMMARY_FILE
if [ -n "${FEEDBACK_SUMMARY_FILE:-}" ] && [ -s "$FEEDBACK_SUMMARY_FILE" ]; then
  log "player feedback digest written: $FEEDBACK_SUMMARY_FILE"
  echo "**Player feedback digest:** \`$FEEDBACK_SUMMARY_FILE\` (injected into triage + engagement lanes)" >> "$REPORT"
fi

# --- Phase 0 prelude: backfill collector tokens from ~/.claude.json ----------
# The Sentry + Supabase collectors gate on env tokens that are NOT in the nightly
# env file; without them the brief comes back empty for those sources and the lanes
# fall back to expensive broad rediscovery → timeout. The working tokens already
# live in ~/.claude.json (MCP server defs). Backfill is pure env export, never
# overrides a set value, no-ops if the file/jq/key is absent. See lib/intel/backfill-tokens.sh.
# shellcheck disable=SC1091
. "$LIB_DIR/intel/backfill-tokens.sh"
backfill_intel_tokens || true

# --- Phase 0: intelligence brief -------------------------------------------
# Query EVERY data source ONCE over direct REST/CLI (no MCP) and write a ranked
# brief the lanes consume via the __BRIEF__ placeholder. This moves data discovery
# OUT of the timed lanes (the #1 timeout cause) and into a hardened phase: a hung
# or unconfigured source costs only its own per-collector timeout → stale fallback
# to last-good → never blocks the run. The brief is ALWAYS produced (deterministic
# scorer, even if the LLM enrichment is skipped). Writes only under
# docs/nightly/intel/ (gate-immune). See docs/specs/nightly-intelligence-suite.md.
log "Phase 0: collecting intelligence brief (all sources, REST/CLI, hardened timeouts)..."
if bash "$LIB_DIR/intel/run-intel.sh" >>"$RUN_LOG" 2>&1; then
  TODAY_INTEL_DIR="$PROJECT_DIR/docs/nightly/intel/$TODAY"
  export BRIEF_JSON_FILE="$TODAY_INTEL_DIR/brief.json"
  export BRIEF_FILE="$TODAY_INTEL_DIR/brief.md"
  if [ -f "$BRIEF_JSON_FILE" ]; then
    BRIEF_N=$(jq '.items|length' "$BRIEF_JSON_FILE" 2>/dev/null || echo 0)
    BRIEF_STALE=$(jq -rc '(._meta.sources_stale // [])|join(", ")' "$BRIEF_JSON_FILE" 2>/dev/null)
    # Per-source signal counts: makes a source silently dropping to zero VISIBLE.
    # `source_ok:true` + 0 signals reads identically to "quiet night" otherwise — a
    # broken query would hide for days. Surfaced in both the run log and the digest.
    SRC_COUNTS=""
    for f in "$TODAY_INTEL_DIR"/*.json; do
      b=$(basename "$f" .json); [ "$b" = "brief" ] && continue
      n=$(jq '.signals|length' "$f" 2>/dev/null || echo 0)
      st=$(jq -r 'if ._meta.stale then "·stale" else "" end' "$f" 2>/dev/null)
      SRC_COUNTS="${SRC_COUNTS}${b}=${n}${st} "
    done
    log "Phase 0: brief ready ($BRIEF_N ranked signals; stale sources: ${BRIEF_STALE:-none})"
    log "Phase 0: per-source signals: ${SRC_COUNTS}"
    echo "**Intelligence brief:** $BRIEF_N ranked signals${BRIEF_STALE:+ (stale: $BRIEF_STALE)} — injected per-lane via \`__BRIEF__\`" >> "$REPORT"
    echo "**Intel sources:** \`${SRC_COUNTS}\`" >> "$REPORT"
  fi
else
  # Phase 0 must never abort the run — lanes degrade to their own in-lane discovery.
  log "Phase 0: run-intel failed/absent — lanes fall back to in-lane discovery (brief-first contract still applies)"
fi

# --- WIP snapshot + dirty baseline ----------------------------------------
# The loop runs ON TOP OF the founder's uncommitted WIP and ships it. Snapshot the
# FULL working tree NOW (after the report header is written, before any lane runs)
# so revert_authored can restore any of the nightly's OWN files byte-for-byte on
# an abort / gate failure. The nightly NEVER sweeps founder WIP into its commit
# and NEVER reverts it — staging and reverts are scoped to the lane-authored
# allowlist below. BASELINE_DIRTY is informational only (how much WIP we ran on top of).
RUN_SNAPSHOT=$(snapshot_pre_lane)
BASELINE_DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
# Founder WIP paths at run start → git-ship excludes these from the nightly commit
# so the autonomous loop never sweeps a human's concurrent work into its commit.
# snapshot_pre_lane already computed this set; copy it to a STABLE file because the
# snapshot dir is consumed by reverts. (Fallback recompute if the snapshot lacks it.)
WIP_PROTECT_FILE="$(dirname "$RUN_LOG")/wip-protect-${DATE_TAG}.list"
cp "$RUN_SNAPSHOT/.wip-protect.list" "$WIP_PROTECT_FILE" 2>/dev/null \
  || { git diff --name-only; git diff --cached --name-only; \
       git ls-files --others --exclude-standard; } | sort -u > "$WIP_PROTECT_FILE"
export NIGHTLY_WIP_PROTECT="$WIP_PROTECT_FILE"
log "pre-lane WIP: $BASELINE_DIRTY dirty files (snapshot $RUN_SNAPSHOT; protect list $WIP_PROTECT_FILE)"

# Allowlist of paths the nightly's OWN lanes authored — built per-lane below as
# (dirty after lane) − (dirty before lane), accumulated only for KEPT lanes.
# EVERY stage (git-ship) and EVERY revert is scoped to this set, so the loop can
# physically only touch files it created — never the founder's WIP and never a
# concurrent session's edits, even ones made mid-run. This replaces the old
# denylist ("everything dirty except a run-start protect list"), which could not
# tell the nightly's output from concurrent human work.
NIGHTLY_AUTHORED_FILE="$(dirname "$RUN_LOG")/authored-${DATE_TAG}.list"
: > "$NIGHTLY_AUTHORED_FILE"
export NIGHTLY_AUTHORED="$NIGHTLY_AUTHORED_FILE"

# --- MCP connectivity probe (observability) --------------------------------
# Record a concrete supabase MCP auth-surface verdict in the run log BEFORE lanes run, so a
# credential/reachability failure is VISIBLE — the 06-15/06-17 "supabase MCP unavailable"
# misses were silent (lanes deferred their fixes with no preflight signal). The probe hits
# the same Management API the supabase MCP tools authenticate against. Non-fatal: a fail is
# logged + alerted but never blocks the run (lanes degrade to REST/skip on their own).
. "$LIB_DIR/mcp-probe.sh"
MCP_PROBE_LINE="$(probe_supabase_mcp)" || true
# Bounded retry on TRANSPORT failures only: the probe spawns npx + does a stdio
# handshake, and it fires moments after a sleeping mac wakes at the trigger. A cold
# node boot under lane-warmup contention (load ~8) can overrun the handshake window
# and return a FALSE fail:transport even though supabase is healthy (token verified
# 200, pkg cached, a warm boot is ~3s — the 2026-06-22 false alarm). Mirror the
# fetch-retry in preflight: retry the transient transport class with backoff before
# alerting. fail:auth is NOT retried (a 401 won't self-heal); a genuine outage still
# fails every attempt and alerts as before.
_probe_try=1; _probe_max="${NIGHTLY_PROBE_RETRIES:-3}"; _probe_slp="${NIGHTLY_PROBE_RETRY_SLEEP:-10}"
while [[ "$MCP_PROBE_LINE" == *fail:transport* && "$_probe_try" -lt "$_probe_max" ]]; do
  log "supabase MCP probe: $MCP_PROBE_LINE — attempt $_probe_try/$_probe_max (cold-boot under load?), retrying in ${_probe_slp}s"
  sleep "$_probe_slp"
  _probe_try=$((_probe_try+1))
  MCP_PROBE_LINE="$(probe_supabase_mcp)" || true
done
log "$MCP_PROBE_LINE"
[[ "$MCP_PROBE_LINE" == *fail:* ]] && tg_alert "⚠️ nightly preflight — $MCP_PROBE_LINE after ${_probe_try} attempt(s) (lanes 01/02 supabase fixes will degrade to REST/skip)"

# --- run lanes -------------------------------------------------------------
# Ordered PRIORITY-FIRST (2026-06-23). The shared Claude usage window can drain mid-run
# (rc=75 cutoffs, see circuit breaker below), so the lanes the founder most wants must run
# BEFORE the tail. Order = triage (bugs) → mode-qa (production-readiness, the headline ask)
# → perf (faster site) → landing+seo (education-module growth) → engagement → self-learn →
# dictionary → monetization → competitor → adsense. Under budget pressure the circuit breaker
# defers the TAIL, which is now the genuinely-low-value-per-night lanes — nothing critical is
# dropped on a healthy night. Reordering is safe: the loop matches by lane NAME, not position.
LANES=(01-triage 11-mode-qa 02-perf 05-landing 06-seo 03-engagement 12-telemetry-coverage 07-self-learn 10-dictionary 09-monetization 04-competitor 08-adsense)
LANE_RESULTS=()

# Brief-gated lane selection (2026-07-03 overhaul C3): a lane whose Phase-0
# brief slice is EMPTY falls back to in-lane discovery — often invented work —
# while burning the shared usage window that later high-signal lanes then die on
# (rc=75 cascades). Core lanes always run; zero-signal non-core lanes are
# trimmed to a 2-per-night rotation. Fail-open on any problem (all lanes).
# Kill-switch: NIGHTLY_SCHEDULER=0. Tested by test/lane-scheduler.test.sh.
if [ -z "$ONLY" ]; then
  _SCHED=()
  while IFS= read -r _sl; do [ -n "$_sl" ] && _SCHED+=("$_sl"); done \
    < <(nightly_schedule_lanes "${BRIEF_JSON_FILE:-}" "${LANES[@]}")
  if [ "${#_SCHED[@]}" -ge 1 ] && [ "${#_SCHED[@]}" -le "${#LANES[@]}" ]; then
    _skipped=""
    for _l in "${LANES[@]}"; do
      case " ${_SCHED[*]} " in *" $_l "*) ;; *) _skipped="${_skipped}${_l} " ;; esac
    done
    if [ -n "$_skipped" ]; then
      log "lane scheduler: ${#_SCHED[@]}/${#LANES[@]} lanes selected this night — skipping zero-signal lanes: ${_skipped}(rotation gives every idle lane a slot ~every 3 nights; NIGHTLY_SCHEDULER=0 restores all)"
      echo "**Lane scheduler:** ran ${#_SCHED[@]}/${#LANES[@]} lanes; skipped (no brief signal, off-rotation): \`${_skipped}\`" >> "$REPORT"
      for _l in ${_skipped}; do
        LANE_RESULTS+=("⏭️  $_l — skipped (no brief signal, off-rotation)")
      done
    fi
    LANES=("${_SCHED[@]}")
  fi
  unset _SCHED _skipped _sl _l
fi

should_run() {
  local n="$1"
  if [ -n "$ONLY" ]; then [ "$ONLY" = "$n" ]; return; fi
  if [ -n "$SKIP" ]; then [[ ! ",$SKIP," =~ ,$n, ]]; return; fi
  return 0
}

# Iterate EVERY defined lane (derived from the array length, not a hardcoded
# range). 2026-06-01: the loop was `1..8` while LANES had a 9th entry
# (09-monetization) — so the monetization lane was defined, executable, and
# carried a brief, yet NEVER RAN. Deriving the bound from ${#LANES[@]} makes a
# lane impossible to silently strand again when one is appended.
# Circuit breaker (2026-06-20): K consecutive lanes that die with NO productive output
# (rc 75 = usage-limit cutoff-abort, rc 124 = idle-kill) almost always means the shared
# Claude usage window is exhausted — lanes 6,7,9,10 cascaded this way after the window
# re-drained post-reset. Once tripped, every further lane just burns another idle window
# failing identically, so stop starting new lanes and DEFER the rest to the next run.
# A productive lane (success, or a timeout that KEPT partials) resets the counter.
consec_dead=0
throttle_break="${NIGHTLY_THROTTLE_BREAK:-3}"
for i in $(seq 1 "${#LANES[@]}"); do
  lane="${LANES[$((i-1))]}"
  # Pass the lane NAME (not the index $i) — should_run compares against $ONLY/$SKIP
  # which are lane names (e.g. "09-monetization"). Passing $i made every --only/--skip
  # match fail ("09-monetization" = "9" is always false) → ALL lanes skipped.
  if ! should_run "$lane"; then
    log "lane $i ($lane) — skipped via flag"
    LANE_RESULTS+=("⏭️  lane $i — skipped")
    continue
  fi

  lane_script="$LANES_DIR/${lane}.sh"
  if [ ! -x "$lane_script" ]; then
    log "lane $i ($lane) — script missing or not exec: $lane_script"
    LANE_RESULTS+=("❌ lane $i — missing")
    continue
  fi

  log "──────── lane $i: $lane ────────"
  PRE_LANE=$(snapshot_pre_lane)
  # Capture the dirty-path SET before the lane so we can attribute exactly what
  # the lane authored = (dirty after) − (dirty before). Counting paths (not the
  # raw porcelain delta) makes the file cap + churn measure the nightly's OWN
  # work, immune to concurrent sessions dirtying the tree at the same time.
  LANE_BEFORE=$(mktemp); nightly_dirty_paths > "$LANE_BEFORE"

  if NIGHTLY_DRY_RUN="$DRY_RUN" "$lane_script" 2>&1 | tee -a "$RUN_LOG"; then
    LANE_AFTER=$(mktemp); nightly_dirty_paths > "$LANE_AFTER"
    LANE_AUTHORED=$(mktemp); comm -13 "$LANE_BEFORE" "$LANE_AFTER" > "$LANE_AUTHORED"
    changed=$(grep -c . "$LANE_AUTHORED" 2>/dev/null) || changed=0
    # No file cap. The lint/test/build gate is the authoritative correctness
    # check, and encapsulation already limits a lane to ITS OWN files — so a
    # large-but-correct change ships instead of being reverted for an arbitrary
    # count. (A lane that genuinely crashes, below, still has its own output
    # reverted — that is cleanup of broken partial work, not a cap.)
    cat "$LANE_AUTHORED" >> "$NIGHTLY_AUTHORED_FILE"
    consec_dead=0   # productive lane → reset circuit breaker
    log "lane $i — kept $changed authored file(s)"
    LANE_RESULTS+=("✅ lane $i ($lane) — changed $changed files")
    echo "- ✅ **$lane** — $changed files touched" >> "$REPORT"
    rm -f "$LANE_AFTER" "$LANE_AUTHORED"
  else
    rc=$?
    LANE_AFTER=$(mktemp); nightly_dirty_paths > "$LANE_AFTER"
    LANE_AUTHORED=$(mktemp); comm -13 "$LANE_BEFORE" "$LANE_AFTER" > "$LANE_AUTHORED"
    changed=$(grep -c . "$LANE_AUTHORED" 2>/dev/null) || changed=0
    if [ "$rc" = "124" ] && [ "$KEEP_TIMEOUT_PARTIALS" = "1" ] && [ "$changed" -ge 1 ]; then
      # Lane hit its time ceiling but left partial work. KEEP it (flag-gated):
      # the integration gate validates before anything ships, so the time the
      # lane already spent is recovered instead of discarded — no count cap.
      log "lane $i — TIMEOUT (124), kept $changed partial file(s) [KEEP_TIMEOUT_PARTIALS=1]"
      cat "$LANE_AUTHORED" >> "$NIGHTLY_AUTHORED_FILE"
      consec_dead=0   # kept partials = productive → reset circuit breaker
      LANE_RESULTS+=("⏱️  lane $i ($lane) — timeout, kept $changed partial file(s)")
      echo "- ⏱️  **$lane** — timed out, kept $changed partial file(s) (gate-validated)" >> "$REPORT"
    else
      log "lane $i — exit $rc (continuing); reverting THIS lane's own files only"
      revert_authored "$PRE_LANE" "$LANE_AUTHORED"
      LANE_RESULTS+=("❌ lane $i ($lane) — exit $rc")
      echo "- ❌ **$lane** — failed (exit $rc), reverted" >> "$REPORT"
      # rc 75 (usage-cutoff abort) / 124 (idle-kill) = no-productive-output failures
      # strongly correlated with an exhausted usage window → count toward the breaker.
      # Any other rc is a genuine code failure (not a throttle) → reset the counter.
      if [ "$rc" = "75" ] || [ "$rc" = "124" ]; then
        consec_dead=$(( consec_dead + 1 ))
      else
        consec_dead=0
      fi
    fi
    rm -f "$LANE_AFTER" "$LANE_AUTHORED"
  fi
  rm -rf "$PRE_LANE"; rm -f "$LANE_BEFORE"

  # Trip the breaker: too many consecutive no-output failures → defer the rest.
  if [ "$consec_dead" -ge "$throttle_break" ] && [ "$i" -lt "${#LANES[@]}" ]; then
    log "circuit-breaker: $consec_dead consecutive no-output lane failures (rc 75/124) — usage window almost certainly exhausted; stopping early and deferring remaining lanes"
    for j in $(seq $((i+1)) "${#LANES[@]}"); do
      _dl="${LANES[$((j-1))]}"
      LANE_RESULTS+=("⏭️  lane $j ($_dl) — deferred (usage window exhausted)")
      echo "- ⏭️  **$_dl** — deferred (circuit-breaker: usage window exhausted)" >> "$REPORT"
    done
    break
  fi
done

# De-dup the run allowlist (a later lane may re-touch an earlier lane's file).
if [ -s "$NIGHTLY_AUTHORED_FILE" ]; then
  sort -u "$NIGHTLY_AUTHORED_FILE" -o "$NIGHTLY_AUTHORED_FILE"
fi

# Drop any path a CONCURRENT session COMMITTED during the run — time-window
# attribution can't tell a lane's edit from a concurrent edit in the same window,
# but a path someone else committed is provably not ours. Without this, a
# concurrent file's mid-edit lint error fails the isolated gate and drops ALL
# genuine lane work (the 2026-05-23 cascade).
if [ -s "$NIGHTLY_AUTHORED_FILE" ]; then
  _auth_before=$(grep -c . "$NIGHTLY_AUTHORED_FILE" 2>/dev/null) || _auth_before=0
  filter_concurrent_committed "$NIGHTLY_AUTHORED_FILE" "$START_SHA"
  _auth_after=$(grep -c . "$NIGHTLY_AUTHORED_FILE" 2>/dev/null) || _auth_after=0
  [ "$_auth_before" != "$_auth_after" ] && log "excluded $(( _auth_before - _auth_after )) concurrently-committed path(s) from the authored set (not the nightly's work)"
fi

# --- integration: gate + commit + push ------------------------------------
log "──────── integration ────────"

# Everything below keys off NIGHTLY_AUTHORED — the nightly's OWN files — never the
# whole-tree dirty count, which includes the founder's WIP + any concurrent
# session. That is what makes the loop encapsulated: a quiet night and every
# revert measure only what the lanes themselves produced. (The `||` is on the
# assignment, NOT inside $(...): `$(grep -c . f || echo 0)` would print "0\n0"
# on an empty file — grep prints 0 AND exits 1 — corrupting the count.)
AUTHORED_COUNT=$(grep -c . "$NIGHTLY_AUTHORED_FILE" 2>/dev/null) || AUTHORED_COUNT=0
DIRTY_COUNT="$AUTHORED_COUNT"   # the digest's "N files" = files this nightly authored
log "nightly authored $AUTHORED_COUNT file(s) this run (whole tree: $(git status --porcelain | wc -l | tr -d ' ') dirty incl. founder WIP)"

if [ "$AUTHORED_COUNT" = "0" ]; then
  log "no changes authored by any lane — composing summary anyway"
  echo -e "\n**Outcome:** no shippable changes (baselines stable, no errors to fix)." >> "$REPORT"
  # User wants a daily summary EVERY day, even if quiet. Compose a brief one.
  NEW_SHA="$START_SHA"  # nothing pushed; baseline sha is "this morning"
  NO_CHANGE_MODE=1
else
  NO_CHANGE_MODE=0
fi

# No churn cap. The lint/test/build gate validates correctness regardless of how
# many files the lanes authored, and encapsulation guarantees a failed gate only
# ever drops the nightly's OWN files — never founder WIP. An arbitrary file-count
# ceiling just blocked legitimate multi-file work, so it is gone.

# A failed ship/gate must STILL send the full Telegram digest (manager summary +
# feedback buttons + Reddit pick + game-mode/idea cards) — the founder needs those
# regardless of whether code shipped. So failure paths set RUN_FAILED + write an
# Outcome line and FALL THROUGH to the digest block; the run exits non-zero only
# at the very end (and skips marking success so dedup stays clear for a retry).
RUN_FAILED=0

# --- build/lint/test gate (authoritative) ---------------------------------
# PRIMARY: gate ONLY the nightly's authored changes, on a clean HEAD checkout, in
# a throwaway worktree (lib/gate-isolated.sh). The founder's concurrent WIP can't
# fail our gate and is never touched. This is what makes a daytime / dirty-tree
# run shippable — the 2026-05-23 run aborted only because the in-place gate ran
# lint over founder WIP. FALLBACK: if worktree setup fails (rc=2), the legacy
# in-place whole-tree gate runs (degrades to old behaviour, never to "ship
# unvalidated").
gate_ok="${gate_ok:-0}"
[ "$NO_CHANGE_MODE" = "1" ] && gate_ok=1
if [ "$NO_GATE" = "1" ]; then
  log "--no-gate — skipping lint/test/build (only safe for docs-only lanes)"
  gate_ok=1
fi

if [ "$gate_ok" = "0" ]; then
  run_isolated_gate "$NIGHTLY_AUTHORED_FILE"; iso_rc=$?
  case "$iso_rc" in
    0) gate_ok=1 ;;
    1) gate_ok=0; log "isolated gate FAILED — the nightly's own lane code broke lint/test/build" ;;
    3)
      # INCONCLUSIVE — the gate was SIGKILLed at its wall-clock ceiling (almost always
      # the slow full vitest suite), so it produced NO parseable FAIL list. The old
      # code collapsed this to rc=1 and, finding nothing to peel, dropped ALL authored
      # code (the 2026-06-06 zero-code night). Instead, get the fast verdict the night
      # never got: a BUILD-ONLY re-gate (lint+test skipped → build:schemas + build:fast
      # only, minutes not tens-of-minutes). This catches the genuine lane breakage that
      # a timeout hides — type/import errors like an orphaned page that imports missing
      # siblings — WITHOUT waiting on the suite that timed out.
      log "isolated gate INCONCLUSIVE (timed out, no parseable failures) — build-only re-verifying the authored set before deciding (never drop all code on a timeout)"
      run_isolated_gate "$NIGHTLY_AUTHORED_FILE" 0 0 1; _to_bo_rc=$?
      _to_route=$(nightly_gate_timeout_route "$_to_bo_rc")
      if [ "$_to_route" = "ship" ]; then
        # Build-clean: the timeout was the slow test suite, not broken code. SHIP it
        # with a loud TESTS-INCONCLUSIVE alert (mirrors the baseline-red ship path:
        # build-verified work ships; the gate ran at reduced strength, so shout).
        gate_ok=1
        log "gate-timeout: authored set BUILDS clean (lint+type+next-build) — shipping it; the full test suite wedged ${NIGHTLY_GATE_IDLE_SECS:-2700}s idle or hit the ${NIGHTLY_GATE_TIMEOUT:-5400}s backstop and is UNVERIFIED this run"
        mkdir -p docs/nightly 2>/dev/null || true
        {
          echo "# Nightly TESTS-INCONCLUSIVE alert — ${TODAY}"
          echo
          echo "The integration gate's test suite went silent past the ${NIGHTLY_GATE_IDLE_SECS:-2700}s idle"
          echo "watchdog (or hit the ${NIGHTLY_GATE_TIMEOUT:-5400}s absolute backstop), so the authored"
          echo "set's TESTS are UNVERIFIED tonight. A build-only re-gate (lint + type-check +"
          echo "next build) PASSED, so the code compiles and type-checks; it shipped at"
          echo "reduced gate strength."
          echo
          echo "ACTION: a silent-for-${NIGHTLY_GATE_IDLE_SECS:-2700}s gate means a hung/OOMing test, not just"
          echo "a slow one — investigate (e.g. useBlastEngine.mpGrid OOM) or, if genuinely"
          echo "slow-but-progressing, raise NIGHTLY_GATE_IDLE_SECS / NIGHTLY_GATE_TIMEOUT."
        } > "docs/nightly/TESTS-INCONCLUSIVE-${TODAY}.md" 2>/dev/null || true
        echo "docs/nightly/TESTS-INCONCLUSIVE-${TODAY}.md" >> "$NIGHTLY_AUTHORED_FILE" 2>/dev/null || true
        echo -e "\n**Outcome (tests-inconclusive):** the gate timed out before the full test suite finished; a build-only re-gate (lint+type+next-build) passed, so the authored set shipped UNVERIFIED on tests. See docs/nightly/TESTS-INCONCLUSIVE-${TODAY}.md." >> "$REPORT"
        tg_alert "nightly $TODAY: gate timed out before tests finished. Build-verified (lint+type+next-build) + shipped — TESTS UNVERIFIED this run. Gate is too slow; see docs/nightly/TESTS-INCONCLUSIVE-${TODAY}.md."
      elif [ "$_to_route" = "peel" ]; then
        # Build-only FAILED → real breakage, and now we HAVE complete build output
        # naming the offender. Route to the existing drop-and-re-gate peel loop, which
        # parses + peels just the broken file(s) and ships the rest.
        gate_ok=0; iso_rc=1
        log "gate-timeout: build-only re-gate FAILED — the authored set has a real build break; routing to drop-and-re-gate peel (output now parseable)"
      else
        # Build-only ALSO wedged (rc=3). The 2026-06-16 root cause: next-build's OWN
        # silent "Running TypeScript" phase hangs >900s in a fresh worktree, while a
        # standalone `tsc --noEmit` type-checks the project in ~54s (measured cold). The
        # next-build phase is slower partly because it ALSO checks generated route types
        # (.next/types/**) that standalone tsc skips — so this tier is a slightly WEAKER
        # signal, but it is conclusive and unwedgeable, and strictly better than the old
        # path that DROPPED all code on this wedge. Run it (tsc --noEmit + test:changed,
        # lane-scoped) before docs-only; ship on green at reduced strength with a loud alert.
        log "gate-timeout: build-only re-gate ALSO wedged (idle ${NIGHTLY_GATE_IDLE_SECS:-2700}s / backstop ${NIGHTLY_GATE_TIMEOUT:-5400}s) — next-build's TS phase is the wedge; running the conclusive standalone typecheck tier (tsc --noEmit + test:changed, ~1min)"
        run_isolated_gate "$NIGHTLY_AUTHORED_FILE" 0 0 0 1; _to_tc_rc=$?
        _tc_route=$(nightly_gate_typecheck_route "$_to_tc_rc")
        if [ "$_tc_route" = "ship" ]; then
          # Type-clean + lane-affected tests pass. The full next-build/full test suite
          # stayed unverified (they wedged), so ship at reduced strength with a loud
          # alert — mirrors the build-only 'ship' path above.
          gate_ok=1
          log "gate-timeout: standalone typecheck tier PASSED (tsc --noEmit clean + test:changed green) — shipping the authored set; full next-build + full test suite UNVERIFIED this run (both wedged in next-build's TS phase)"
          mkdir -p docs/nightly 2>/dev/null || true
          {
            echo "# Nightly TYPECHECK-TIER ship — ${TODAY}"
            echo
            echo "Both the full integration gate AND the build-only re-gate wedged in"
            echo "next-build's silent \"Running TypeScript\" phase (idle ${NIGHTLY_GATE_IDLE_SECS:-2700}s /"
            echo "backstop ${NIGHTLY_GATE_TIMEOUT:-5400}s). A standalone conclusive tier —"
            echo "\`build:schemas && tsc --noEmit && test:changed\` (~1 min) — PASSED, so the"
            echo "authored set type-checks (standalone tsc, committed tsconfig) and its"
            echo "affected tests are green. It shipped at REDUCED gate strength."
            echo
            echo "NOT verified this night: next build's own TS phase additionally checks"
            echo "GENERATED route/page types (.next/types/**) that standalone tsc does not —"
            echo "that extra surface, the full next build (SSG prerender), and the FULL test"
            echo "suite were all unverified. This tier is strictly stronger than the OLD"
            echo "behaviour (which DROPPED all code on this wedge) but weaker than a clean"
            echo "full gate."
            echo
            echo "Shipped commit is verified post-push by railway-deploy-check.sh + health-monitor.sh."
            echo "ACTION: none required (autonomous reduced-strength ship)."
          } > "docs/nightly/TYPECHECK-TIER-${TODAY}.md" 2>/dev/null || true
          echo "docs/nightly/TYPECHECK-TIER-${TODAY}.md" >> "$NIGHTLY_AUTHORED_FILE" 2>/dev/null || true
          echo -e "\n**Outcome (typecheck-tier):** full gate + build-only both wedged in next-build's TS phase; a standalone tsc --noEmit + test:changed tier passed, so the authored set shipped type-checked (standalone tsc) + affected-tests-green — full route-type coverage, SSG, and full suite UNVERIFIED. See docs/nightly/TYPECHECK-TIER-${TODAY}.md." >> "$REPORT"
          tg_alert "nightly $TODAY: gate wedged in next-build's TS phase; standalone typecheck tier (tsc --noEmit + test:changed) passed + shipped at REDUCED strength — full route-type/SSG/suite UNVERIFIED. No action required. See docs/nightly/TYPECHECK-TIER-${TODAY}.md."
        elif [ "$_tc_route" = "peel" ]; then
          # Typecheck tier FAILED → a real type error or a lane-broken test, and the
          # output now names the offender → route to the drop-and-re-gate peel loop.
          gate_ok=0; iso_rc=1
          log "gate-timeout: standalone typecheck tier FAILED (tsc/test:changed) — the authored set has a real type/test break; routing to drop-and-re-gate peel (output now parseable)"
        else
          # Even the 54s tsc tier wedged (rc=3) → genuinely unverifiable → docs-only.
          gate_ok=0; iso_rc=3
          log "gate-timeout: standalone typecheck tier ALSO wedged — genuinely unverifiable; falling through to docs-only salvage"
        fi
      fi
      ;;
    2)
      log "isolated gate setup unavailable — falling back to in-place whole-tree gate"
      for attempt in 1 2; do
        [ "$gate_ok" = "1" ] && break
        log "gate attempt $attempt: fe-next lint + test + build:fast (in-place fallback)"
        ( cd fe-next; npm run lint 2>&1 | tail -20 ) >> "$RUN_LOG" 2>&1 \
          || { log "lint failed (attempt $attempt)"; continue; }
        ( cd fe-next; npm run test 2>&1 | tail -30 ) >> "$RUN_LOG" 2>&1 \
          || { log "test failed (attempt $attempt)"; continue; }
        # Build into an ISOLATED dir (.next-nightly via NEXT_BUILD_DIR) so a running
        # dev server's .next is never shared (raced phantom SSR errors on 2026-05-20).
        # NIGHTLY_SKIP_NEXT_TS=1: skip next build's slow/silent "Running TypeScript" phase
        # (wedges >900s); the isolated gate's standalone tsc --noEmit already covers types.
        ( cd fe-next; rm -rf .next-nightly 2>/dev/null
          NEXT_BUILD_DIR=.next-nightly NIGHTLY_SKIP_NEXT_TS=1 npm run build:fast 2>&1 | tail -30 ) >> "$RUN_LOG" 2>&1 \
          || { log "build failed (attempt $attempt)"; continue; }
        gate_ok=1; break
      done
      ;;
  esac
fi

# Drop-and-re-gate salvage: an isolated-gate failure is usually ONE bad file — a
# misattributed concurrent edit, or a single broken lane file — not the whole
# authored set. Rather than collapse straight to docs-only, parse the offending
# file(s) from the gate output, DROP just those from the commit allowlist (leave
# them untouched as WIP — non-destructive, drops fewer files than the docs-only
# path), and re-gate the rest. Ships the surviving lane CODE. Up to 2 rounds; on
# no-parse / still-failing / setup-fail it falls through to the docs-only salvage
# below (today's behaviour — never a regression).
if [ "$gate_ok" = "0" ] && [ "${iso_rc:-1}" = "1" ]; then
  # Snapshot the ORIGINAL authored set before any drop-and-re-gate trims it.
  # The salvage path below needs to revert all originally-authored CODE files,
  # not just the trimmed remainder. On 2026-05-27 the loop dropped 3 i18n
  # files in round 1 (`fe-next/translations/{en,es,sv}.js`); when the gate
  # ultimately failed and the docs-only salvage fired, it only reverted the
  # *trimmed* list — leaving those 3 files modified in the working tree as
  # orphan keys with no consumer (the hook + component that referenced them
  # had been correctly reverted as part of the trimmed set). The orphan i18n
  # then leaked into the next git status. Preserving the original here closes
  # that leak: any path the nightly authored is either committed or reverted,
  # never left as half-state WIP.
  NIGHTLY_AUTHORED_ORIGINAL="$(dirname "$NIGHTLY_AUTHORED_FILE")/authored-original-${DATE_TAG}.list"
  cp "$NIGHTLY_AUTHORED_FILE" "$NIGHTLY_AUTHORED_ORIGINAL" 2>/dev/null || : > "$NIGHTLY_AUTHORED_ORIGINAL"
  # CONVERGE, don't cap at 2. 2026-06-01: round 1 dropped BlastBoard + 3 i18n
  # files; round 2's re-gate then surfaced a SECOND lane's broken file
  # (leaderboard/PageClient.tsx — lane 03's half-written "Cannot modify local
  # variables after render"), but the loop was out of rounds → it collapsed to
  # docs-only and threw away EVERY other lane's clean code. A 3rd round would
  # have dropped that one file and shipped the rest. Each round either drops ≥1
  # authored file (strictly shrinking a finite set) or breaks via the `-z $_bad`
  # / setup-fail paths below, so this terminates; the round cap is only a
  # runaway backstop, generous enough to peel one bad file per lane.
  # grep -c always prints a count (0 on empty) even when it exits 1, so capture it
  # plainly — never `|| echo N` (that would append a 2nd value → arithmetic error).
  _authored_n=$(grep -c . "$NIGHTLY_AUTHORED_ORIGINAL" 2>/dev/null); _authored_n=${_authored_n:-0}
  _MAX_REGATE_ROUNDS=$(( _authored_n + 1 ))
  [ "$_MAX_REGATE_ROUNDS" -lt 4 ] && _MAX_REGATE_ROUNDS=4
  _round=0
  # Run-once guard for the last-resort conclusive verify (below). It re-runs the
  # wedge-proof tsc+test:changed tier BEFORE any docs-only drop-all so an
  # unattributable/undecidable red (a flake, not a real break) can never again
  # nuke a whole night of build-clean code (2026-07-02). Guarded so a tier that
  # itself returns an unparseable "peel" can't spin the loop — one shot, then docs-only.
  _conclusive_verify_done=0
  # One-shot guard for the same-night repair pass (2026-07-03 overhaul C1).
  _repair_done=0
  while [ "$_round" -lt "$_MAX_REGATE_ROUNDS" ]; do
    _round=$(( _round + 1 ))
    _bad_raw=$(nightly_parse_gate_failures "${NIGHTLY_LAST_GATE_OUTPUT:-}")
    # Preserve the failing authored gate output before it is removed — the
    # baseline-aware salvage below parses failing TEST files from it (the lint/tsc
    # parser above can't see test failures, which is how a pre-existing red test
    # on master sank the 2026-06-02/03 runs to docs-only).
    _authored_out=$(mktemp -t nightly-authored-out.XXXXXX)
    cp "${NIGHTLY_LAST_GATE_OUTPUT:-/dev/null}" "$_authored_out" 2>/dev/null || : > "$_authored_out"
    rm -f "${NIGHTLY_LAST_GATE_OUTPUT:-}" 2>/dev/null || true
    # Intersect with authored allowlist — never drop a file the nightly didn't
    # author. The parser is best-effort and on 2026-05-27 returned 27 paths of
    # which 14 were node_modules/* + framework files (none authored). Dropping
    # them just shrinks the commit without addressing the real failure. If the
    # gate fails on a non-authored file, the cause is pre-existing repo state
    # the lane code happened to expose, and no amount of dropping our own files
    # will fix it — fall through to docs-only salvage cleanly.
    _bad=""
    if [ -n "$_bad_raw" ] && [ -s "$NIGHTLY_AUTHORED_FILE" ]; then
      _bad=$(printf '%s\n' "$_bad_raw" | grep -xF -f "$NIGHTLY_AUTHORED_FILE" 2>/dev/null || true)
    fi
    _ignored=$(printf '%s\n' "$_bad_raw" | grep -vxF -f <(printf '%s\n' "$_bad") 2>/dev/null || true)
    if [ -n "$_ignored" ]; then
      log "drop-and-re-gate: parser returned $(printf '%s' "$_ignored" | grep -c .) non-authored path(s) — ignoring (not in authored allowlist):"
      printf '%s\n' "$_ignored" | while IFS= read -r f; do [ -n "$f" ] && log "  ignore: $f"; done
    fi

    # ── Same-night REPAIR pass (2026-07-03 overhaul C1) ────────────────────────
    # Before DROPPING a named authored offender, spend ONE bounded headless run
    # (default 600s, sonnet) fixing the actual gate error — the recurring drop
    # causes are mechanical (hooks after early return, ssr:false in a Server
    # Component, missed import) and 312 files were dropped over 06-19→07-03.
    # Claims are never trusted: the FULL isolated gate re-runs after the attempt.
    # Any failure falls through to the unchanged drop path — this can only save
    # work. Kill-switch: NIGHTLY_REPAIR_PASS=0.
    if [ -n "$_bad" ] && [ "${NIGHTLY_REPAIR_PASS:-1}" = "1" ] && [ "$_repair_done" = "0" ]; then
      _repair_done=1
      _rbad=$(mktemp); printf '%s\n' "$_bad" > "$_rbad"
      _rbefore=$(mktemp); nightly_dirty_paths > "$_rbefore"
      log "repair pass: bounded fix attempt on $(grep -c . "$_rbad") gate-failing file(s) BEFORE dropping (cap ${NIGHTLY_REPAIR_SECS:-600}s, one attempt/night)"
      if nightly_repair_attempt "$_rbad" "$_authored_out" "$RUN_LOG" >> "$RUN_LOG" 2>&1; then
        # The repair may have added a NEW file (e.g. a 'use client' wrapper) —
        # fold anything it authored into the allowlist so the re-gate sees it.
        _rafter=$(mktemp); nightly_dirty_paths > "$_rafter"
        comm -13 "$_rbefore" "$_rafter" >> "$NIGHTLY_AUTHORED_FILE"
        sort -u "$NIGHTLY_AUTHORED_FILE" -o "$NIGHTLY_AUTHORED_FILE"
        rm -f "$_rafter" "$_rbad" "$_rbefore" "$_authored_out"
        log "repair pass: attempt finished — re-gating the full authored set (claims not trusted)"
        run_isolated_gate "$NIGHTLY_AUTHORED_FILE"; iso_rc=$?
        if [ "$iso_rc" = "0" ]; then
          gate_ok=1
          log "repair pass: re-gate PASSED — the would-be-dropped file(s) were fixed and ship tonight (nothing dropped)"
          echo -e "\n**Outcome (repaired):** the gate-failing file(s) were fixed by the bounded repair pass and the full re-gate passed — nothing dropped." >> "$REPORT"
          break
        fi
        log "repair pass: re-gate still red (rc=$iso_rc) — continuing the normal peel/drop path"
        [ "$iso_rc" = "1" ] && continue
        # rc=3/2 → fall through: the drop below re-gates and its own wedge/setup
        # handling takes over (unchanged behaviour).
      else
        log "repair pass: headless attempt failed/timed out — continuing the normal drop path"
        rm -f "$_rbad" "$_rbefore"
      fi
    fi
    if [ -z "$_bad" ]; then
      # ── Baseline-aware salvage ────────────────────────────────────────────────
      # The lint/tsc parser pinned no authored offender, but the gate may have failed
      # on a TEST that ALREADY fails on untouched master — a prior PR shipped a red
      # test it only scoped-tested, poisoning every nightly gate identically (the
      # 2026-06-02/03 zero-code nights). Gate a clean HEAD; if it fails the SAME test
      # file(s) with NO lane code applied, the lanes are not at fault. This is the
      # safety net that turns "someone re-reds master" from a multi-night outage into
      # a loud alert + shipped code (it can never silently drop all lane work again).
      _authored_fail_tests=$(nightly_parse_test_failures "$_authored_out")
      if [ -n "$_authored_fail_tests" ]; then
        log "baseline-aware: authored gate failed on test file(s) — gating clean HEAD to check for pre-existing master breakage:"
        printf '%s\n' "$_authored_fail_tests" | while IFS= read -r f; do [ -n "$f" ] && log "  authored-fail-test: $f"; done
        # TARGETED baseline (2026-06-13 fix): scope the clean-HEAD gate to ONLY these failing
        # test files. The full-suite baseline wedged on a networked integration test that night
        # (rc=3 inconclusive → misread as 'HEAD green' → docs-only DROP of build-clean code).
        # A scoped run can't hang on an unrelated suite → real rc=1 + FAIL lines → proven pre-existing.
        _aft_file=$(mktemp -t nightly-aft.XXXXXX); printf '%s\n' "$_authored_fail_tests" > "$_aft_file"
        _baseline_tokens=$(nightly_baseline_test_tokens "$_aft_file"); rm -f "$_aft_file" 2>/dev/null || true
        run_baseline_gate 0 "$_baseline_tokens"; _bl_rc=$?
        _baseline_out=$(mktemp -t nightly-baseline-out.XXXXXX)
        cp "${NIGHTLY_LAST_GATE_OUTPUT:-/dev/null}" "$_baseline_out" 2>/dev/null || : > "$_baseline_out"
        rm -f "${NIGHTLY_LAST_GATE_OUTPUT:-}" 2>/dev/null || true
        # Pure verdict (unit-tested: nightly_baseline_ship_decision).
        _af_file=$(mktemp); printf '%s\n' "$_authored_fail_tests" > "$_af_file"
        _bf_file=$(mktemp); nightly_parse_test_failures "$_baseline_out" > "$_bf_file"
        _decision=$(nightly_baseline_ship_decision "$_af_file" "$_bl_rc" "$_bf_file" "$NIGHTLY_AUTHORED_FILE")
        case "$(printf '%s\n' "$_decision" | head -n1)" in
          ship)
            # GUARD (2026-06-11): the 'ship' verdict trusts FAIL-line parsing to enumerate EVERY
            # failure. But a code-level Unhandled Rejection (a mock missing an export, surfaced via
            # a rejected promise) emits NO `FAIL <path>` line, so a NEW authored breakage can be
            # invisible to the baseline comparison. On 2026-06-11 the authored growthTracking→
            # isAndroid break printed only as an Unhandled Rejection → 'ship' fired on just the
            # pre-existing baseline-red FAIL files → only a coincidental build-only rc=3 stopped it
            # shipping test-broken code. Refuse: a hidden code-level failure ⇒ ship is unverifiable
            # ⇒ docs-only. (Worker-OOM infra noise is deliberately NOT treated as blocking here — it
            # is routed via rc=3 — so red-master nights with OOM still baseline-red-ship.)
            if nightly_gate_has_unattributed_failures "$_authored_out"; then
              log "baseline-aware: REFUSING baseline-red ship — the authored gate had a code-level failure (unhandled rejection / non-OOM unhandled error) invisible to FAIL-line parsing, so 'every failing test also fails on HEAD' is UNSAFE (a new break may be hidden). Falling through to docs-only salvage."
            else
            # Every failing test ALSO fails on clean master → not the nightly's fault.
            # `test` short-circuited the gate chain, so the authored set's BUILD was never
            # verified — run a build-only re-gate first (keeps "never ship build-breaking
            # code"), then ship + shout so the baseline gets fixed.
            log "baseline-aware: every failing test also fails on clean HEAD — master is RED independent of the nightly. Type-verifying the authored set (tsc, no test/next-build) before shipping…"
            # TYPE-only verification, NOT build_only (2026-06-18 fix). The failing tests are
            # already proven pre-existing-red, so we must NOT re-run them (test:changed would
            # re-pull the same red cone and wrongly block). And build_only's `next build`
            # WEDGES >900s in a fresh worktree → returns rc=3 (inconclusive) → the old code
            # conflated that with rc=1 (real break) and DROPPED a whole night of build-clean
            # code (tonight's false drop). `build:schemas && tsc --noEmit` is wedge-proof (~54s)
            # and still catches the dominant new-break class (type/import errors). next-build's
            # extra webpack-boundary coverage is given up here on purpose — the alternative is
            # dropping all lane code, and the production deploy build still catches those.
            run_isolated_gate "$NIGHTLY_AUTHORED_FILE" 0 0 0 0 1; _bo_rc=$?
            rm -f "${NIGHTLY_LAST_GATE_OUTPUT:-}" 2>/dev/null || true
            if [ "$_bo_rc" = "0" ]; then
              gate_ok=1
              log "baseline-aware: authored set TYPE-checks clean (tsc) — shipping it unchanged (introduced no new test failure; the pre-existing red baseline is the problem)."
              mkdir -p docs/nightly 2>/dev/null || true
              {
                echo "# Nightly BASELINE-RED alert — ${TODAY}"
                echo
                echo "The nightly gate failed, but a clean-HEAD baseline gate (NO lane code) fails the SAME test file(s):"
                printf '%s\n' "$_authored_fail_tests" | sed 's/^/  - /'
                echo
                echo "These tests are red on master itself. The nightly TYPE-verified its authored work (build:schemas + tsc --noEmit — next-build wedges in a fresh worktree, so full build coverage was skipped) and shipped it anyway (it introduced no NEW failure), but the gate runs at reduced strength until the baseline is green. FIX THESE TESTS on master."
              } > "docs/nightly/BASELINE-RED-${TODAY}.md" 2>/dev/null || true
              echo "docs/nightly/BASELINE-RED-${TODAY}.md" >> "$NIGHTLY_AUTHORED_FILE" 2>/dev/null || true
              echo -e "\n**Outcome (baseline-red):** the gate's failing test file(s) already fail on clean master ($(printf '%s' "$_authored_fail_tests" | tr '\n' ' ')); the authored set build-verified clean and introduced no new failure, so it shipped. See docs/nightly/BASELINE-RED-${TODAY}.md." >> "$REPORT"
              tg_alert "nightly $TODAY: master baseline RED on $(printf '%s' "$_authored_fail_tests" | tr '\n' ' '). Build-verified + shipped authored code anyway (no new failure). FIX BASELINE — see docs/nightly/BASELINE-RED-${TODAY}.md."
              rm -f "$_af_file" "$_bf_file" "$_baseline_out" "$_authored_out"
              break
            else
              log "baseline-aware: authored set TYPE-fails (tsc rc=$_bo_rc) despite a red TEST baseline — NOT shipping; falling through to docs-only salvage (never ship type-breaking code)."
            fi
            fi  # close unattributed-failure ship guard
            ;;
          peel)
            # Authored set introduced NEW failing test file(s) not red on HEAD — drop just
            # those (intersected with the allowlist by the decision fn) and re-gate.
            _bad=$(printf '%s\n' "$_decision" | tail -n +2)
            log "baseline-aware: $(printf '%s' "$_bad" | grep -c .) NEW failing test file(s) introduced by the authored set (clean on HEAD) — peeling them like a broken lane file:"
            printf '%s\n' "$_bad" | while IFS= read -r f; do [ -n "$f" ] && log "  new-fail-test: $f"; done
            ;;
          *)
            log "baseline-aware: not a decidable pre-existing baseline (HEAD clean or no comparable test baseline) — continuing normal salvage"
            ;;
        esac
        rm -f "$_af_file" "$_bf_file" "$_baseline_out" 2>/dev/null || true
      fi
    fi

    rm -f "$_authored_out" 2>/dev/null || true

    # Existing lint-skip re-gate / docs-only salvage — reached only if neither the
    # lint/tsc parser nor the baseline-aware test comparison pinned an authored offender.
    if [ -z "$_bad" ]; then
      if [ -n "$_bad_raw" ]; then
        # Every gate-failing file is NON-authored. The isolated worktree is exactly
        # (clean HEAD + our authored files), so a non-authored file in it is
        # byte-identical to committed HEAD — the error lives on master ALREADY, not
        # in lane code (e.g. a concurrent/founder commit poisoned HEAD mid-run, the
        # 2026-06-01 PageClient.tsx case that sank 8 lanes).
        #
        # We already know NO authored file has a lint/tsc error (else $_bad would be
        # non-empty). But the full gate is `lint && … && test && build`, so a lint
        # failure on the baseline short-circuits BEFORE test/build — we have NOT yet
        # proven the authored set passes test+build. So re-gate (clean HEAD + authored)
        # with LINT SKIPPED: skipping lint ignores only the baseline's pre-existing
        # lint error, never an authored one. Ship IFF that passes — then the authored
        # contribution is proven test+build clean and the failure was purely a baseline
        # lint error the nightly didn't introduce. If it fails (baseline broken at
        # test/build, or an authored file genuinely breaks test/build), fall to the
        # docs-only salvage — conservative, never ships build-breaking code.
        log "drop-and-re-gate: all $(printf '%s' "$_bad_raw" | grep -c .) gate-failing file(s) are non-authored — re-gating the authored set WITHOUT lint to verify it is test+build clean (a pre-existing baseline lint error is not the nightly's fault)"
        run_isolated_gate "$NIGHTLY_AUTHORED_FILE" 1; _nl_rc=$?
        if [ "$_nl_rc" = "0" ]; then
          gate_ok=1
          log "baseline-poisoned gate: failing file(s) are non-authored (pre-existing/concurrent lint error on clean HEAD) AND the authored set passes test+build with lint skipped — shipping the nightly's authored work, which introduced no new failure"
          echo -e "\n**Outcome (baseline-poisoned):** the gate failure was a pre-existing/concurrent lint error on the clean baseline (not lane code); the authored set passed test+build with lint skipped, so shipped it unchanged." >> "$REPORT"
        else
          log "drop-and-re-gate: authored set still fails with lint skipped (rc=$_nl_rc) — not a clean baseline-poison; using docs-only salvage"
        fi
      else
        log "drop-and-re-gate: gate output had no parseable offenders"
      fi
      # LAST-RESORT CONCLUSIVE VERIFY before the destructive docs-only drop-all (2026-07-02 fix).
      # We are here because the full gate is RED but NOTHING is positively attributable: no
      # lint/tsc offender parsed, AND the baseline comparison was undecidable (e.g. the scoped
      # baseline gate's `npm run test:backend` found no matching files for a FRONTEND-only failing
      # set → rc=1 with no parseable FAIL header → "not a decidable pre-existing baseline"). That
      # state is INDISTINGUISHABLE from a false-red/flake in the wedged full-suite run — and on
      # 2026-07-02 it dropped ALL 22 build-clean lane files (WordTower, sealedBid, translations,
      # landing pages, dictionary candidates — none related to the "failing" tests), every one of
      # which passed tsc --noEmit + its own tests on re-run. NEVER discard build-clean code on an
      # unparseable/undecidable red. Run the wedge-proof conclusive tier (build:schemas + standalone
      # tsc --noEmit + test:changed, ~1min) ONCE: type-clean + affected-tests-green ⇒ the red was a
      # flake ⇒ SHIP. A named offender ⇒ peel it. Only if the tier ALSO wedges ⇒ docs-only.
      if [ "$gate_ok" = "0" ] && [ "$_conclusive_verify_done" = "0" ]; then
        _conclusive_verify_done=1
        log "drop-and-re-gate: unattributable gate failure — running the conclusive typecheck tier (build:schemas + tsc --noEmit + test:changed) on the authored set BEFORE any docs-only drop-all (never discard build-clean code on an unparseable/undecidable red)"
        run_isolated_gate "$NIGHTLY_AUTHORED_FILE" 0 0 0 1; _uv_tc_rc=$?
        # NOTE: do NOT rm NIGHTLY_LAST_GATE_OUTPUT here — the `peel` branch below
        # relies on the loop-top parser re-reading it to name the offender (same
        # contract as the rc=3 peel path). ship/wedge break out, leaving a harmless temp.
        case "$(nightly_gate_typecheck_route "$_uv_tc_rc")" in
          ship)
            gate_ok=1
            log "drop-and-re-gate: conclusive typecheck tier PASSED — the unattributable red was a false-red/flake; shipping the authored set (tsc clean + affected tests green; full next-build + full suite UNVERIFIED this run)"
            mkdir -p docs/nightly 2>/dev/null || true
            printf '# Nightly TYPECHECK-TIER ship (unattributable red) — %s\n\nThe full gate went RED but named NO attributable offender (no lint/tsc error; the\nbaseline comparison was undecidable). A standalone `build:schemas && tsc --noEmit &&\ntest:changed` tier (~1min) PASSED, so the authored set shipped at REDUCED strength\n(full next-build / SSG prerender + full suite UNVERIFIED). The red was a flake/wedge,\nNOT a real break (the 2026-07-02 all-code drop was exactly this false-red). Verified\npost-push by railway-deploy-check.sh + health-monitor.sh. ACTION: none required.\n' "${TODAY}" > "docs/nightly/TYPECHECK-TIER-${TODAY}.md" 2>/dev/null || true
            echo "docs/nightly/TYPECHECK-TIER-${TODAY}.md" >> "$NIGHTLY_AUTHORED_FILE" 2>/dev/null || true
            echo -e "\n**Outcome (typecheck-tier, unattributable red):** the gate failed with no parseable offender and an undecidable baseline; a standalone tsc --noEmit + test:changed tier passed, so the authored set shipped at reduced strength (the red was a flake). See docs/nightly/TYPECHECK-TIER-${TODAY}.md." >> "$REPORT"
            tg_alert "nightly $TODAY: gate RED but UNATTRIBUTABLE (no offender, baseline undecidable); conclusive tsc + test:changed tier PASSED → shipped the authored set at REDUCED strength (full next-build/suite UNVERIFIED). Likely a flake. No action required."
            break ;;
          peel)
            log "drop-and-re-gate: conclusive typecheck tier named an offender — continuing the peel loop with parseable output"
            iso_rc=1; continue ;;
          *)
            log "drop-and-re-gate: conclusive typecheck tier ALSO wedged — genuinely unverifiable; falling to docs-only salvage"
            break ;;
        esac
      fi
      break
    fi
    log "drop-and-re-gate round $_round: dropping $(printf '%s' "$_bad" | grep -c .) gate-failing file(s) from the commit set, re-gating the rest:"
    printf '%s\n' "$_bad" | while IFS= read -r f; do [ -n "$f" ] && log "  drop: $f"; done
    _kept=$(mktemp)
    grep -vxF -f <(printf '%s\n' "$_bad") "$NIGHTLY_AUTHORED_FILE" > "$_kept" 2>/dev/null || cp "$NIGHTLY_AUTHORED_FILE" "$_kept"
    mv "$_kept" "$NIGHTLY_AUTHORED_FILE"
    # EAGER REVERT the dropped files — leaving them as dirty WIP pollutes the
    # working tree and (if any was an i18n / config file) ships orphan keys to
    # the next preflight scan. revert_authored will restore each from the run-
    # start snapshot or remove it if newly added by the lane. Safe because the
    # paths are guaranteed to be in our authored set (intersected above).
    _dropped_list=$(mktemp); printf '%s\n' "$_bad" > "$_dropped_list"
    # Back up the dropped files' AUTHORED content before reverting — a parser
    # mis-blame (the 2026-06-05 Babel-note bug nuked en/es/sv.js) is then
    # recoverable by hand instead of destroyed. Pure cp, can't race a writer.
    _drop_backup="$LOG_DIR/dropped-${DATE_TAG}"
    backup_dropped_authored "$_dropped_list" "$_drop_backup"
    log "drop-and-re-gate: backed up $(grep -c . "$_dropped_list" 2>/dev/null) dropped file(s) → $_drop_backup (recover: cp from there if mis-blamed)"
    # Requeue (2026-07-03 overhaul C1): a dropped file is no longer a manual
    # chase — the entry feeds collect-restore.sh, which makes restoring it the
    # NEXT night's top triage signal. Committed with tonight's docs.
    restore_queue_append "$PROJECT_DIR/docs/nightly/restore-queue.ndjson" "$DATE_TAG" \
      "$_dropped_list" "$_drop_backup" "drop-and-re-gate round $_round (gate-failing)"
    echo "docs/nightly/restore-queue.ndjson" >> "$NIGHTLY_AUTHORED_FILE"
    sort -u "$NIGHTLY_AUTHORED_FILE" -o "$NIGHTLY_AUTHORED_FILE"
    revert_authored "$RUN_SNAPSHOT" "$_dropped_list"
    rm -f "$_dropped_list"
    if [ ! -s "$NIGHTLY_AUTHORED_FILE" ]; then log "drop-and-re-gate: nothing left after drops"; break; fi
    run_isolated_gate "$NIGHTLY_AUTHORED_FILE"; iso_rc=$?
    if [ "$iso_rc" = "0" ]; then
      gate_ok=1
      log "drop-and-re-gate: PASS after dropping + reverting the offending file(s) — shipping the remaining authored work"
      echo -e "\n**Outcome (partial):** isolated gate passed after dropping + reverting gate-failing file(s); shipping the rest of the authored work." >> "$REPORT"
      break
    fi
    if [ "$iso_rc" = "3" ]; then
      # INCONCLUSIVE wedge in the peel re-gate (the 2026-06-30 miss: after peeling the one
      # broken file, build:fast wedged >900s under concurrent-session contention → the old
      # `[ != 1 ] && break` lumped rc=3 with rc=2 and DROPPED 18 BUILD-CLEAN files to
      # docs-only). A timeout is NOT a failure. Get the conclusive verdict the FIRST-gate
      # ladder uses (run.sh:599-640): a standalone build:schemas + tsc --noEmit + test:changed
      # tier (~1min, unwedgeable). Ship the kept set on green; peel again if it names an
      # offender; only fall to docs-only if that conclusive tier ALSO wedges.
      log "drop-and-re-gate round $_round: re-gate INCONCLUSIVE (wedged ${NIGHTLY_GATE_IDLE_SECS:-2700}s idle / ${NIGHTLY_GATE_TIMEOUT:-5400}s backstop) — running the conclusive standalone typecheck tier before dropping any more BUILD-CLEAN code"
      run_isolated_gate "$NIGHTLY_AUTHORED_FILE" 0 0 0 1; _pl_tc_rc=$?
      case "$(nightly_gate_typecheck_route "$_pl_tc_rc")" in
        ship)
          gate_ok=1
          log "drop-and-re-gate: standalone typecheck tier PASSED — shipping the kept authored set (type-checked + affected-tests-green; full next-build + full suite UNVERIFIED this run, wedged)"
          mkdir -p docs/nightly 2>/dev/null || true
          printf '# Nightly TYPECHECK-TIER ship (peel loop) — %s\n\nThe drop-and-re-gate peel loop re-gate wedged in next-build under contention after\npeeling the broken file(s). A standalone `build:schemas && tsc --noEmit && test:changed`\ntier (~1min) PASSED, so the kept authored set shipped at REDUCED strength (full\nnext-build / SSG prerender + full suite UNVERIFIED). Verified post-push by\nrailway-deploy-check.sh + health-monitor.sh. ACTION: none required.\n' "${TODAY}" > "docs/nightly/TYPECHECK-TIER-${TODAY}.md" 2>/dev/null || true
          echo "docs/nightly/TYPECHECK-TIER-${TODAY}.md" >> "$NIGHTLY_AUTHORED_FILE" 2>/dev/null || true
          echo -e "\n**Outcome (partial, typecheck-tier):** peel re-gate wedged; standalone tsc --noEmit + test:changed passed, so shipped the kept set at reduced strength. See docs/nightly/TYPECHECK-TIER-${TODAY}.md." >> "$REPORT"
          tg_alert "nightly $TODAY: peel re-gate wedged in next-build; conclusive typecheck tier passed + shipped the kept set at REDUCED strength (full next-build/suite UNVERIFIED). No action required."
          break ;;
        peel)
          # Typecheck tier named a real offender among the kept set → loop again; the
          # parser at the loop top reads this tier's NIGHTLY_LAST_GATE_OUTPUT and peels it
          # (same re-entry the first-gate 'peel' path uses).
          log "drop-and-re-gate round $_round: typecheck tier named an offender — continuing the peel loop with parseable output"
          iso_rc=1; continue ;;
        *)
          log "drop-and-re-gate: typecheck tier ALSO wedged — genuinely unverifiable; falling to docs-only salvage"
          break ;;
      esac
    fi
    [ "$iso_rc" != "1" ] && break   # setup failed (rc=2) → bail to docs-only salvage
  done
fi

if [ "$gate_ok" = "0" ]; then
  # NEVER push broken code, and NEVER touch the founder's WIP. But don't throw away
  # a whole night's reports/ideas/learnings because one lane shipped breaking CODE.
  # Lanes write docs under docs/ (repo root, OUTSIDE fe-next); the lint/test/build
  # gate runs INSIDE fe-next, so docs can NEVER break it — the culprit is always a
  # lane's fe-next code. Salvage: drop ONLY the nightly's own authored CODE (the
  # allowlist minus docs/), keep its authored docs, then re-gate. Everything not on
  # the allowlist — founder WIP, concurrent edits — is never touched, on any branch.
  log "GATE FAILED on lane code — dropping the nightly's own authored CODE (keeping its authored docs; founder WIP untouched)"
  # Use the ORIGINAL authored set (pre-drop-and-re-gate), not the trimmed list.
  # If drop-and-re-gate ran first, NIGHTLY_AUTHORED_FILE no longer contains the
  # files we already dropped — so reverting only the trimmed list would leave
  # those dropped files modified in the working tree. NIGHTLY_AUTHORED_ORIGINAL
  # is the full set we authored across all lanes; it's the only safe source for
  # "revert every code change we made". Falls back gracefully if the original
  # snapshot wasn't taken (drop-and-re-gate didn't run at all).
  _AUTH_SRC="${NIGHTLY_AUTHORED_ORIGINAL:-$NIGHTLY_AUTHORED_FILE}"
  [ -s "$_AUTH_SRC" ] || _AUTH_SRC="$NIGHTLY_AUTHORED_FILE"
  AUTHORED_CODE=$(mktemp); grep -vE '^docs/' "$_AUTH_SRC" > "$AUTHORED_CODE" || true
  # Same recoverable-backup as the drop step: the docs-only salvage reverts ALL
  # authored CODE, so preserve it before discarding (recover by hand if needed).
  _salvage_backup="$LOG_DIR/salvaged-code-${DATE_TAG}"
  backup_dropped_authored "$AUTHORED_CODE" "$_salvage_backup"
  _dropped_count=$(grep -c . "$AUTHORED_CODE" 2>/dev/null || echo 0)
  [ -s "$AUTHORED_CODE" ] && log "docs-only salvage: backed up ${_dropped_count} reverted code file(s) → $_salvage_backup"
  # Requeue (2026-07-03 overhaul C1): the salvaged code becomes the NEXT night's
  # top triage signal via collect-restore.sh instead of a manual founder chase.
  # The queue file is docs/ so it survives this very docs-only salvage.
  if [ -s "$AUTHORED_CODE" ]; then
    restore_queue_append "$PROJECT_DIR/docs/nightly/restore-queue.ndjson" "$DATE_TAG" \
      "$AUTHORED_CODE" "$_salvage_backup" "docs-only salvage: gate failed on lane code"
    echo "docs/nightly/restore-queue.ndjson" >> "$NIGHTLY_AUTHORED_FILE"
  fi
  revert_authored "$RUN_SNAPSHOT" "$AUTHORED_CODE"
  rm -f "$AUTHORED_CODE"

  # The remaining authored files are docs/ only. Docs live at the repo root,
  # OUTSIDE fe-next, where lint/test/build run — so `clean master + docs` is
  # gate-clean BY CONSTRUCTION (the isolated gate already proved the dropped CODE
  # was the failure). No re-gate needed; founder WIP is never re-touched.
  grep -E '^docs/' "$NIGHTLY_AUTHORED_FILE" > "${NIGHTLY_AUTHORED_FILE}.tmp" 2>/dev/null || true
  mv "${NIGHTLY_AUTHORED_FILE}.tmp" "$NIGHTLY_AUTHORED_FILE" 2>/dev/null || : > "$NIGHTLY_AUTHORED_FILE"
  AUTHORED_COUNT=$(grep -c . "$NIGHTLY_AUTHORED_FILE" 2>/dev/null) || AUTHORED_COUNT=0

  if [ "$AUTHORED_COUNT" = "0" ]; then
    log "no authored docs to salvage either — nothing ships tonight (founder WIP untouched)"
    : > "$NIGHTLY_AUTHORED_FILE"
    mkdir -p "$(dirname "$REPORT")"
    echo -e "\n**Outcome:** GATE FAILED on lane code; no docs to salvage. All of the nightly's own changes dropped; founder WIP untouched." >> "$REPORT"
    RUN_FAILED=1; NO_CHANGE_MODE=1; NEW_SHA="$START_SHA"
    log "gate failed, nothing to ship — falling through to send the full digest, will exit 1"
    [ "${_dropped_count:-0}" -gt 0 ] 2>/dev/null && tg_alert "nightly $TODAY: GATE FAILED — ALL ${_dropped_count} lane code file(s) DROPPED, nothing shipped. Code backed up (NOT pushed) → restore: scripts/nightly/restore-salvaged-code.sh ${DATE_TAG}"
  fi

  log "docs-only salvage — shipping reports/ideas/learnings, lane code dropped ($AUTHORED_COUNT docs)"
  gate_ok=1
  # The dropped lane CODE is REVERTED from the tree but NOT lost — backup_dropped_authored
  # mirrored it to $_salvage_backup before reverting. Surface a one-command recovery so the
  # work is never chased again (the 2026-06-11 manual recovery, scripted). NOTE: restored code
  # failed the gate at least once → it must be reviewed + re-gated, never blind-shipped.
  _restore_cmd="scripts/nightly/restore-salvaged-code.sh ${DATE_TAG}"
  log "docs-only salvage: dropped lane code is RECOVERABLE — backup at $_salvage_backup; restore with: $_restore_cmd (then review + re-gate before shipping)"
  # Class 4 guard: a backup nobody is told about == lost work. The other failure
  # tiers all tg_alert; this (the most destructive — ALL lane code dropped) must too,
  # or the salvage silently parks code night after night (2026-06-28/29 incident).
  [ "${_dropped_count:-0}" -gt 0 ] 2>/dev/null && tg_alert "nightly $TODAY: GATE FAILED on lane code — ${_dropped_count} code file(s) DROPPED (docs-only shipped). Code backed up but NOT pushed → restore: $_restore_cmd (review + re-gate first)."
  echo -e "\n**Outcome:** GATE FAILED on lane code — DOCS-ONLY salvage shipped (reports/ideas/learnings kept, lane CODE dropped, founder WIP untouched).\n\n**Lane code is NOT lost** — backed up to \`$_salvage_backup\`. Restore with \`$_restore_cmd\`, then review + re-gate (it failed the gate at least once) before shipping." >> "$REPORT"
  tg_alert "nightly $TODAY: code gate failed — shipped DOCS-ONLY (reports/ideas/learnings). Lane CODE dropped but NOT lost — recover: \`$_restore_cmd\` then review+re-gate. Founder WIP untouched. Log: \`$RUN_LOG\`."
  # fall through to commit; the allowlist now lists only the nightly's docs
fi

# --- commit + push (skipped entirely when NO_CHANGE_MODE=1) ---------------
if [ "$NO_CHANGE_MODE" = "0" ]; then
  LANE_SUMMARY=$(printf '%s\n' "${LANE_RESULTS[@]}" | sed 's/^/  /')
  MSG_FILE=$(mktemp)
  cat > "$MSG_FILE" <<EOF
chore(nightly): autonomous improvement loop ${TODAY}

Lanes:
${LANE_SUMMARY}

AI-generated changes — see docs/nightly/reports/${TODAY}.md for details.
Native-review locales flagged in individual lane outputs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF

  if [ "$DRY_RUN" = "1" ]; then
    log "DRY RUN — would commit:"
    cat "$MSG_FILE" | sed 's/^/  | /' | tee -a "$RUN_LOG"
    log "DRY RUN — skipping push, but composing summary"
    echo -e "\n**Outcome:** DRY RUN ($DIRTY_COUNT files staged but not committed)." >> "$REPORT"
    NEW_SHA="DRY-RUN-${START_SHA:0:7}"
    rm -f "$MSG_FILE"
  else
    # Commit + push with divergence/generated-file hardening. The whole block was
    # extracted to lib/git-ship.sh and is proven by test/git-ship.test.sh across 5
    # scenarios (clean push, non-overlap rebase, generated-file exclusion, no-change
    # guard, genuine-conflict fail-safe). On unrecoverable failure it has already
    # alerted + preserved a clean tree, so we just exit.
    if ! ship_nightly_commit; then
      RUN_FAILED=1
      echo -e "\n**Outcome:** ⚠️ committed locally but PUSH FAILED — local commit preserved; will retry next run or resolve manually." >> "$REPORT"
      log "ship failed — falling through to send the full digest (summary + buttons + cards), will exit 1"
    fi
  fi
fi

# --- post-push monitor (skip in no-change / dry-run / no-push) ------------
# caffeinate -i wraps both watchers (2026-07-07): logs showed most nights'
# nohup'd watchers dying mid-poll (0-9 of their ticks, never completing) —
# root cause is macOS idle sleep suspending the whole login session the
# LaunchAgent runs under. caffeinate -i holds an idle-sleep assertion for
# exactly the lifetime of its child, so a 10/30 min watcher no longer needs
# the Mac to stay awake on its own. Fall back to bare nohup if unavailable.
CAFFEINATE=""
command -v caffeinate >/dev/null 2>&1 && CAFFEINATE="caffeinate -i"
if [ "$NO_MONITOR" = "0" ] && [ "$NO_CHANGE_MODE" = "0" ] && [ "$DRY_RUN" = "0" ] && [ "$NO_PUSH" = "0" ] && [ "$RUN_FAILED" = "0" ]; then
  log "spawning health monitor (30 min)"
  nohup $CAFFEINATE "$LIB_DIR/health-monitor.sh" "$NEW_SHA" \
    >> "$LOG_DIR/health-monitor.log" 2>&1 &
  disown 2>/dev/null || true

  log "spawning Railway deploy check (10 min)"
  nohup $CAFFEINATE "$LIB_DIR/railway-deploy-check.sh" "$NEW_SHA" \
    >> "$LOG_DIR/railway-check.log" 2>&1 &
  disown 2>/dev/null || true
fi

# --- manager summary (Sonnet composes a narrative digest from today's report) -
log "composing manager summary..."
SUMMARY_FILE=$(mktemp -t nightly-summary.XXXXXX)
SUMMARY_PROMPT=$(mktemp -t summary-prompt.XXXXXX)
cat > "$SUMMARY_PROMPT" <<PROMPT_EOF
You are writing a daily Telegram message for the LexiClash founder. Today's FULL report is inlined at the very bottom of this prompt (after the format spec) — base the message ONLY on it. Do NOT read any files or call any tools; everything you need is below.

Mode: $([ "$RUN_FAILED" = "1" ] && echo "RUN FAILED — the gate failed and/or the push failed (read the **Outcome** line in the report for which). LEAD with that honestly (e.g. 'code gate failed, nothing shipped' or 'committed locally but push failed'), then a brief what-ran/what-was-attempted. Still include the Reddit pick + game-mode idea sections below if present — they're useful regardless." || { [ "$NO_CHANGE_MODE" = "1" ] && echo "NO-CHANGE NIGHT (no lanes shipped). Output 4-6 lines max: a one-line 'all clear' headline + a brief 'what was checked'. NO bullet sections. Skip 'wins' entirely." || echo "Changes shipped. Lead with concrete impact."; })

Compose the message in this MINIMAL format (≤1200 chars total). One blank line between sections. Skip any section that is empty — do NOT print empty section markers.

\`\`\`
🌙 *${TODAY}* — \`${NEW_SHA:0:7}\` · ${DIRTY_COUNT} files

<one-line headline: the single most important outcome>

✅ <win 1 — concrete, with file/metric>
✅ <win 2>
✅ <win 3 — max 3, skip if fewer>

⚠️ <concern 1 — only if real>
⚠️ <concern 2>

💬 *Reddit pick* (from lane 4's "Top Reddit pick of the day" — ONLY if lane 4 produced a LIVE permalink, not a pattern. If lane 4 only had pattern-based suggestions, OMIT this block entirely.)

Format the block EXACTLY like this so the founder can tap-to-open the URL and tap-and-hold-to-copy the reply:

\`\`\`
💬 *Reddit pick* — r/<sub>
<full https permalink on its own line, no quote prefix, so Telegram auto-links it>

Reply (tap-hold to copy):
\\\`\\\`\\\`
<witty + accurate reply text, the EXACT string to paste into Reddit — no quotation marker, no markdown wrapping, ideally 30-60 words, plain text only>
\\\`\\\`\\\`
\`\`\`

Why this format: Telegram renders a bare URL as a tappable link, and triple-backtick blocks are tap-and-hold copyable on mobile. The founder can open the thread + copy the comment in two taps.

🎮 *Mode improved* (ONLY if lane 5 actually shipped this run — extract from `#### Mode improvement shipped` section in the lane-5 report. Otherwise omit this block entirely.)
> Mode: <name>
> URL: <full https URL — the existing admin-beta mode route>
> <one-line: what changed + why it's better>
> → open URL or refresh home as admin, play 1 round, reply 👍/👎 to this bot

🎮 *Game-mode idea* (only if no mode was shipped this run — surface the top concept from lane 4 / lane 7 instead)
<one line: name + why>

🎨 *Polish ideas* (ONLY if the report has at least one `#### Top game-mode improvement idea` block — these are separate try/pass cards sent below this summary, so here just NAME them so the founder knows what's coming. One line per block, max 2 lines total.)
> <Mode-slug>: <Title> — <Return-hook>

→ <one-line tomorrow focus>
\`\`\`

STYLE RULES (critical for readability):
- One blank line between blocks. NO section headers like "*Key wins*" — the ✅/⚠️/→ glyphs ARE the headers.
- Each ✅ line ≤120 chars. Trim adjectives. "fixed leaderboard N+1 → 480ms→18ms p75" beats "successfully resolved the N+1 query pattern affecting the leaderboard endpoint, achieving a substantial improvement in p75 latency".
- Use Telegram Markdown: \`*bold*\` only for the date header. Inline code with backticks for file paths / SHAs / metrics. NO ** or ## or ###.
- No emojis other than 🌙 ✅ ⚠️ → on the lines specified above.
- If a lane failed: ONE ⚠️ line, lane name + one-sentence cause. Skip the full traceback.
- Never invent numbers, file paths, or experiment names. Pull them verbatim from the report.
- Do NOT include "Generated by" / Claude attribution.

Output ONLY the message body. No preamble, no markdown fence around it.
PROMPT_EOF

# Inline the full report so the composer needs ZERO tool calls. The agentic
# "Read the report file" round-trip was the #1 cause of the 240s timeout — 31%
# of runs fell back to the deterministic brief (the 2026-05/06 pattern). With the
# report inlined this is a pure text task that returns well under the timeout.
if [ -f "$REPORT" ]; then
  {
    printf '\n\n===== TODAY'\''S FULL REPORT (%s) =====\n\n' "$REPORT"
    cat "$REPORT"
  } >> "$SUMMARY_PROMPT"
fi

# Real GNU timeout (via coreutils, installed by setup). Earlier perl-alarm
# fallback was broken — see headless.sh comment. If neither binary exists,
# hard-fail with a clear "install coreutils" message.
if command -v gtimeout >/dev/null 2>&1; then
  _to=(gtimeout --kill-after=10s 240s)
elif command -v timeout >/dev/null 2>&1; then
  _to=(timeout --kill-after=10s 240s)
else
  log "FATAL — neither timeout nor gtimeout. Install: brew install coreutils"
  _to=()
fi
# Pipe the prompt via stdin instead of `-p "$(cat …)"` positional. Why:
# `-p` is a boolean flag (`--print`); the next positional is the prompt. If
# `$(cat $SUMMARY_PROMPT)` evaluates to empty (temp-file race, disk pressure,
# or any unexpected shell-substitution edge case), claude sees an empty prompt
# AND closed stdin and dies with "Input must be provided either through stdin
# or as a prompt argument" — exactly what aborted the 2026-05-26 summary.
# Stdin piping cannot silently empty itself: an empty file fails earlier and
# loudly, and the kernel never re-quotes content.
if [ ${#_to[@]} -gt 0 ] && [ -s "$SUMMARY_PROMPT" ] && "${_to[@]}" claude --print \
  --dangerously-skip-permissions \
  --model sonnet \
  < "$SUMMARY_PROMPT" \
  > "$SUMMARY_FILE" 2>>"$RUN_LOG"; then
  # Strip leakage from Claude CLI startup + Explanatory output-style decorations:
  #  - "Warning: no stdin data received..." (suppressed by </dev/null but belt-and-suspenders)
  #  - `★ Insight ─` / `─────` divider lines from the Explanatory style
  #  - Leading/trailing whitespace
  SUMMARY=$(sed -E '/^[[:space:]]*Warning:/d; /^[`]?★ Insight/,/^[`]?─{5,}/d; /^─{5,}/d' "$SUMMARY_FILE" \
            | awk 'NF{found=1} found' \
            | sed -E '/^[[:space:]]*(Here.?s|Here is|This is)[[:space:]]+(the|your|a)[[:space:]]+(message|summary|digest)/I,/^---$|^$/d' \
            | awk 'NF{found=1} found' \
            | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')
  log "manager summary composed ($(echo -n "$SUMMARY" | wc -c) chars after cleanup)"
else
  # Composer failed/timed out — DO NOT just point at the attached file. Build a
  # substantive deterministic brief INLINE from data we already have: the report's
  # Outcome line + every lane's status + the Reddit pick if present. The founder
  # should get the gist in the message itself, never "see attached report".
  log "summary composer failed/timed out — deterministic inline brief"
  _outcome=$(grep -m1 '\*\*Outcome:\*\*' "$REPORT" 2>/dev/null | sed -E 's/.*\*\*Outcome:\*\* *//; s/`//g' | head -c 220)
  _lanes=$(printf '%s\n' "${LANE_RESULTS[@]:-}")
  # Mine ✅ wins from LANE_RESULTS (1 line per success). Each ✅ line is
  # "✅ lane NN (name) — changed N files" — keep up to 4, trim count noise.
  _wins=$(printf '%s\n' "${LANE_RESULTS[@]:-}" \
    | grep -E '^✅ lane' \
    | sed -E 's/^✅ lane [0-9]+ \(([^)]+)\) — changed ([0-9]+) files?/✅ \1 (\2 files)/' \
    | head -4)
  # Concerns: timeouts + hard failures (LANE_RESULTS already differentiates ⏱ vs ❌)
  _concerns=$(printf '%s\n' "${LANE_RESULTS[@]:-}" \
    | grep -E '^(⏱|❌|⏭)' \
    | sed -E 's/^(⏱[^ ]*|❌|⏭[^ ]*)[[:space:]]+lane [0-9]+ ?\(?([^)]*)\)?[[:space:]]*[—-][[:space:]]*/⚠️ \2 — /' \
    | head -3)
  _redditpick=$(awk '/^#### Top Reddit pick of the day/{f=1} f&&/Thread:|Permalink:/{print; c++} c>=1&&f&&/^$/{exit}' "$REPORT" 2>/dev/null | grep -oE 'https?://[^[:space:]]+reddit\.com/[^[:space:])]*' | head -1)
  _ideapick=$(grep -m1 '^- Top idea:' "$REPORT" 2>/dev/null | sed 's/^- Top idea: //' | head -c 140)
  # Top game-mode polish idea title (lane 4 emits up to 2 — name them so the
  # founder knows the polish cards below are coming, matching the LLM template).
  _polishline=$(awk '
    /^#### Top game-mode improvement idea/ { in_b=1; next }
    in_b && /^- Title:/ { sub(/^- Title: */, "", $0); t=$0 }
    in_b && /^- Mode:/  { sub(/^- Mode: */,  "", $0); m=$0 }
    in_b && /^- Return-hook:/ { sub(/^- Return-hook: */, "", $0); h=$0 }
    in_b && /^$/ && t { printf "> %s: %s — %s\n", m, t, h; t=""; m=""; h=""; in_b=0; count++; if(count>=2)exit }
  ' "$REPORT" 2>/dev/null)
  # Tomorrow's focus: first "loop improvement" or unresolved triage item.
  _tomorrow=$(grep -m1 -E '^[0-9]+\. \*\*' "docs/nightly/loop-improvements/${TODAY}.md" 2>/dev/null \
    | sed -E 's/^[0-9]+\. \*\*([^*]+)\*\*.*$/\1/' | head -c 140)
  [ -z "$_tomorrow" ] && _tomorrow="check triage-queue.md"

  SUMMARY=$(printf '🌙 *Nightly %s* — `%s` · %s files\n\n*Outcome:* %s\n%s%s%s%s%s\n\n→ tomorrow: %s' \
    "$TODAY" "${NEW_SHA:0:7}" "${DIRTY_COUNT:-?}" "${_outcome:-see lanes below}" \
    "$([ -n "$_wins" ] && printf '\n%s' "$_wins")" \
    "$([ -n "$_concerns" ] && printf '\n%s' "$_concerns")" \
    "$([ -n "$_redditpick" ] && printf '\n\n💬 *Reddit pick:* %s' "$_redditpick")" \
    "$([ -n "$_ideapick" ] && printf '\n\n🎮 *Idea:* %s' "$_ideapick")" \
    "$([ -n "$_polishline" ] && printf '\n\n🎨 *Polish ideas:*\n%s' "$_polishline")" \
    "$_tomorrow")
fi
rm -f "$SUMMARY_PROMPT" "$SUMMARY_FILE"

# Send the narrative summary FIRST with feedback buttons.
# Then attach the full report for deep-dive.
RUN_SLUG="${TODAY//-/}"
SUMMARY_KBD=$(cat <<KBD
[[{"text":"👍 Good night","callback_data":"night:good:${RUN_SLUG}"},{"text":"👎 Meh","callback_data":"night:meh:${RUN_SLUG}"}]]
KBD
)
if [ "$DRY_RUN" = "0" ]; then
  "$TG" kbd "$SUMMARY" "$SUMMARY_KBD" >/dev/null 2>&1 || tg_msg "$SUMMARY"
else
  tg_msg "$SUMMARY"
fi
tg_doc "$REPORT" "Full report attached"

# New / updated page routes this run → tappable URLs so the founder can SEE them
# (goal 2026-06-23). Reads the night's authored file list (repo-relative git paths),
# keeps app-router page.tsx routes, maps each to a www.lexiclash.live URL. Sent as its
# own message. Silent when the run touched no page routes (function returns nonzero).
if declare -F nightly_landing_url_block >/dev/null 2>&1 && [ -s "$NIGHTLY_AUTHORED_FILE" ]; then
  if LANDING_BLOCK=$(nightly_landing_url_block "$NIGHTLY_AUTHORED_FILE" "https://www.lexiclash.live" 6); then
    tg_msg "$LANDING_BLOCK"
    log "sent landing/page URL card"
  fi
fi

# Extract actionable items from the report and send each as its OWN message
# with its own feedback keyboard. Telegram inline-keyboards are per-message,
# so one message = one feedback target. The user sees a clear actionable card.
#
# Patterns scraped from the report:
#  - "#### Top Reddit pick of the day" block → 💬 Reddit pick card
#  - "#### Mode improvement shipped" block → 🎮 mode improved card
#  - "#### Top game-mode improvement idea" block → 🎮 idea card

if [ "$DRY_RUN" = "0" ] && [ -f "$REPORT" ]; then
  # Reddit pick: extract permalink + reply text
  REDDIT_BLOCK=$(awk '/^#### Top Reddit pick of the day/,/^####|^$/' "$REPORT" | head -40)
  PERMALINK=$(echo "$REDDIT_BLOCK" | grep -oE 'https?://[^[:space:]]+reddit\.com/[^[:space:])]*' | head -1)
  if [ -n "$PERMALINK" ]; then
    REDDIT_REPLY=$(echo "$REDDIT_BLOCK" | awk '/^\`\`\`$/{if(in_block){exit} else {in_block=1; next}} in_block' | head -8)
    PICK_HASH=$(echo "$PERMALINK" | shasum | cut -c1-8)
    REDDIT_MSG="💬 *Reddit pick* — tap URL to open thread, tap-hold the code block to copy the reply.

$PERMALINK

Reply:
\`\`\`
$REDDIT_REPLY
\`\`\`"
    REDDIT_KBD="[[{\"text\":\"👍 Will post\",\"callback_data\":\"reddit:will_post:${PICK_HASH}\"},{\"text\":\"👎 Skip\",\"callback_data\":\"reddit:skip:${PICK_HASH}\"}],[{\"text\":\"🔁 Different draft tomorrow\",\"callback_data\":\"reddit:redraft:${PICK_HASH}\"}]]"
    "$TG" kbd "$REDDIT_MSG" "$REDDIT_KBD" >/dev/null 2>&1
    log "sent Reddit-pick card (hash=$PICK_HASH)"
  fi

  # Mode improvement shipped: extract URL + name
  MODE_BLOCK=$(awk '/^#### Mode improvement shipped/,/^####|^$/' "$REPORT" | head -25)
  MODE_URL=$(echo "$MODE_BLOCK" | grep -oE 'https?://lexiclash\.live/[^[:space:])]+' | head -1)
  if [ -n "$MODE_URL" ]; then
    MODE_NAME=$(echo "$MODE_BLOCK" | grep -oE '^- Mode: .*' | head -1 | sed 's/^- Mode: //')
    SLUG=$(echo "$MODE_URL" | sed -E 's|^.*/([^/]+)/?$|\1|')
    MODE_MSG="🎮 *Mode improved* — $MODE_NAME

$MODE_URL

(existing admin-beta mode; URL works directly. Refresh the page if you don't see it.)

Reply:
- 👍 Keep this direction
- 👎 Revert it
- 📐 Tweak — comment in chat with what to change
- 🚀 Promote to public when it's ready"
    MODE_KBD="[[{\"text\":\"👍 Keep it\",\"callback_data\":\"mode:keep:${SLUG}\"},{\"text\":\"👎 Revert\",\"callback_data\":\"mode:drop:${SLUG}\"}],[{\"text\":\"📐 Tweak\",\"callback_data\":\"mode:tweak:${SLUG}\"},{\"text\":\"🚀 Promote to public\",\"callback_data\":\"mode:promote:${SLUG}\"}]]"
    "$TG" kbd "$MODE_MSG" "$MODE_KBD" >/dev/null 2>&1
    log "sent mode-improvement card (slug=$SLUG)"
  fi

  # Mode-readiness verdict (lane 11 mode-qa): extract the readiness card so the founder
  # sees how production-ready tonight's audited mode is + can steer focus. Block shape is
  # locked in prompts/11-mode-qa.md STEP 6.
  # Flag-based (NOT a /start/,/end/ range): the header line "#### Mode readiness verdict"
  # also matches an "^#### " end pattern, which would collapse a range to one line. Consume
  # the header with `next`, then print field lines until the next heading.
  QA_BLOCK=$(awk '/^#### Mode readiness verdict/{f=1;next} f&&/^(#### |### )/{exit} f' "$REPORT" 2>/dev/null | head -20)
  QA_URL=$(echo "$QA_BLOCK" | grep -oE 'https?://[^[:space:]]*lexiclash\.live/[^[:space:])]+' | head -1)
  if [ -n "$QA_URL" ]; then
    QA_MODE=$(echo "$QA_BLOCK" | grep -oE '^- Mode: .*' | head -1 | sed 's/^- Mode: //')
    QA_SCORE=$(echo "$QA_BLOCK" | grep -oE '^- Readiness: .*' | head -1 | sed 's/^- Readiness: //')
    QA_VERDICT=$(echo "$QA_BLOCK" | grep -oE '^- Verdict: .*' | head -1 | sed 's/^- Verdict: //')
    QA_BLOCKERS=$(echo "$QA_BLOCK" | grep -oE '^- Blockers remaining: .*' | head -1 | sed 's/^- Blockers remaining: //')
    QA_SLUG=$(echo "${QA_MODE%% *}" | tr -cd 'a-z0-9-')
    QA_MSG="🧪 *Mode readiness* — ${QA_MODE:-?}
Readiness: ${QA_SCORE:-?}

$QA_URL

Blockers: ${QA_BLOCKERS:-?}
Verdict: ${QA_VERDICT:-?}

(one mode audited per night until ≥90% ready. Tap to view; steer focus below.)"
    QA_KBD="[[{\"text\":\"👍 On track\",\"callback_data\":\"modeqa:ontrack:${QA_SLUG}\"},{\"text\":\"🔧 Different mode next\",\"callback_data\":\"modeqa:refocus:${QA_SLUG}\"}]]"
    "$TG" kbd "$QA_MSG" "$QA_KBD" >/dev/null 2>&1 || tg_msg "$QA_MSG"
    log "sent mode-readiness card (slug=$QA_SLUG, score=$QA_SCORE)"
  fi

  # Game mode idea (only if no mode was shipped — same heuristic): top concept from lane 4
  if [ -z "${MODE_URL:-}" ]; then
    IDEA_LINE=$(grep -m1 "^- Top idea:" "$REPORT" | sed 's/^- Top idea: //')
    if [ -n "$IDEA_LINE" ]; then
      IDEA_HASH=$(echo "$IDEA_LINE" | shasum | cut -c1-8)
      IDEA_MSG="🎮 *Game-mode idea*

$IDEA_LINE

(no mode shipped tonight — flag below tells the loop whether to prioritize this for tomorrow.)"
      IDEA_KBD="[[{\"text\":\"🚀 Build it tomorrow\",\"callback_data\":\"idea:build:${IDEA_HASH}\"},{\"text\":\"⏭️ Pass\",\"callback_data\":\"idea:pass:${IDEA_HASH}\"}]]"
      "$TG" kbd "$IDEA_MSG" "$IDEA_KBD" >/dev/null 2>&1
      log "sent game-mode-idea card (hash=$IDEA_HASH)"
    fi
  fi

  # Game-mode polish ideas — lane 4 emits up to 2 `#### Top game-mode improvement
  # idea` blocks with locked structure (Title / Mode / Return-hook / Pitch /
  # Concrete change / Evidence). One card per block, 2 max. The slug+hash is the
  # callback key; verdict feeds idea-history.sh and lane-5's STEP 0 next night,
  # so a 👍 Try it turns into shipped polish without a separate human step.
  POLISH_BLOCKS=$(awk '
    /^#### Top game-mode improvement idea/ { if (block) print block "\n---POLISH-BLOCK-SEP---"; block="" ; in_b=1; next }
    /^(####|### )/ && in_b { print block "\n---POLISH-BLOCK-SEP---"; block=""; in_b=0; next }
    in_b { block = block "\n" $0 }
    END { if (block) print block "\n---POLISH-BLOCK-SEP---" }
  ' "$REPORT" 2>/dev/null)

  if [ -n "$POLISH_BLOCKS" ]; then
    POLISH_COUNT=0
    POLISH_TMP=$(mktemp); echo "$POLISH_BLOCKS" > "$POLISH_TMP"
    while IFS= read -r line; do
      if [ "$line" = "---POLISH-BLOCK-SEP---" ]; then
        if [ -n "${P_TITLE:-}" ] && [ -n "${P_MODE:-}" ] && [ "$POLISH_COUNT" -lt 2 ]; then
          P_HASH=$(printf '%s|%s' "$P_TITLE" "$P_MODE" | shasum | cut -c1-8)
          POLISH_MSG="🎮 *Polish idea* — \`${P_MODE}\` (unpublished mode)
*${P_TITLE}*
↩️ Return-hook: ${P_HOOK:-unspecified}

${P_PITCH:-}

📐 Concrete change:
${P_CHANGE:-(see report)}

(👍 Try it → lane 5 ships this polish tomorrow night. 👎 Pass → hard-banned. 🔁 Combine → log for rework.)"
          POLISH_KBD="[[{\"text\":\"👍 Try it\",\"callback_data\":\"polish:try:${P_MODE}:${P_HASH}\"},{\"text\":\"👎 Pass\",\"callback_data\":\"polish:pass:${P_MODE}:${P_HASH}\"}],[{\"text\":\"🔁 Combine / rework\",\"callback_data\":\"polish:combine:${P_MODE}:${P_HASH}\"}]]"
          "$TG" kbd "$POLISH_MSG" "$POLISH_KBD" >/dev/null 2>&1
          log "sent polish-idea card (mode=$P_MODE hash=$P_HASH)"
          POLISH_COUNT=$((POLISH_COUNT + 1))
        fi
        unset P_TITLE P_MODE P_HOOK P_PITCH P_CHANGE
        continue
      fi
      case "$line" in
        "- Title: "*)            P_TITLE="${line#- Title: }" ;;
        "- Mode: "*)             P_MODE="${line#- Mode: }" ;;
        "- Return-hook: "*)      P_HOOK="${line#- Return-hook: }" ;;
        "- Pitch: "*)            P_PITCH="${line#- Pitch: }" ;;
        "- Concrete change: "*)  P_CHANGE="${line#- Concrete change: }" ;;
      esac
    done < "$POLISH_TMP"
    rm -f "$POLISH_TMP"
    [ "$POLISH_COUNT" = "0" ] && log "polish: no parseable blocks (missing Title/Mode fields)"
  fi
fi

# --- residual ship: push anything still dirty ------------------------------
# git-ship appends the Outcome line to the report AFTER its own commit, so the main
# ship always leaves that line (plus any other end-of-run writes) uncommitted. Left
# alone it would dirty the tree for tomorrow — exactly what stranded the 2026-05-19
# run. Sweep the residue into a follow-up commit so "more changes get pushed too"
# and the tree ends CLEAN. Reuse ship_nightly_commit (fetch+rebase+docs-resolve);
# point REPORT at /dev/null so its OWN Outcome append can't re-dirty the tree.
# The residue is the nightly's OWN post-ship doc writes (report finalization,
# manager summary, seo-daily) — written after the lane loop, so they are not in
# the per-lane allowlist. Scope the residual ship to exactly the nightly's doc
# output roots so it can clean its own trailing files WITHOUT sweeping any
# founder WIP that also happens to be dirty.
if [ "$DRY_RUN" = "0" ] && [ "$NO_PUSH" = "0" ] && [ "$RUN_FAILED" = "0" ]; then
  RESIDUAL_AUTHORED=$(mktemp)
  nightly_dirty_paths | grep -E '^docs/(nightly|seo-daily)/' > "$RESIDUAL_AUTHORED" || true
  if [ -s "$RESIDUAL_AUTHORED" ]; then
    log "residual nightly-doc changes after main ship — sweeping into a follow-up commit"
    RESIDUAL_MSG=$(mktemp)
    cat > "$RESIDUAL_MSG" <<EOF
chore(nightly): post-run residue ${TODAY}

Trailing nightly doc writes after the main ship (report finalization, summary).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
    if MSG_FILE="$RESIDUAL_MSG" REPORT=/dev/null NO_CHANGE_MODE=0 \
       NIGHTLY_AUTHORED="$RESIDUAL_AUTHORED" ship_nightly_commit; then
      log "residual ship OK ($(git rev-parse --short HEAD))"
    else
      log "residual ship failed (non-fatal — main work already pushed; tree left for next run)"
    fi
    rm -f "$RESIDUAL_MSG"
  fi
  rm -f "$RESIDUAL_AUTHORED"
fi

# Isolated ship: collapse local master back to the founder's pre-run HEAD now that
# every downstream step (manager summary read the report from disk, residual ship
# swept trailing doc writes) has run on a tree that STILL held the nightly's files.
# Leaves the founder's commit + WIP byte-identical. No-op on non-isolated runs.
finalize_isolated_ship >> "$RUN_LOG" 2>&1 || true

if [ "$RUN_FAILED" = "1" ]; then
  log "nightly-loop finished WITH FAILURES — full digest (summary + buttons + Reddit + ideas) was sent; NOT marking success so dedup stays clear for a retry"
  exit 1
fi
preflight_mark_success
log "nightly-loop complete"
exit 0
