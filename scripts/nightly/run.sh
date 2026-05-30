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
# Reddit OAuth (lane 04). Absent → reddit-fetch.sh degrades to legacy UA curl (now 403).
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
export MCP_TIMEOUT="${MCP_TIMEOUT:-20000}"

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
# founder free-text directives (texted to the bot) → active block for this run.
# shellcheck disable=SC1091
. "$LIB_DIR/user-directives.sh"
log "========================================"
log "nightly-loop start ${DATE_TAG} dry=$DRY_RUN no-push=$NO_PUSH only=$ONLY skip=$SKIP"
log "========================================"

# NOTE: do NOT pipe preflight through tee — that puts the function in a subshell
# where $$ resolves to the subshell PID (not run.sh's), poisoning lock-staleness
# checks. Redirect instead.
if ! preflight_check >> "$RUN_LOG" 2>&1; then
  log "preflight failed — aborting"
  tail -20 "$RUN_LOG" 2>/dev/null
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

# --- run lanes -------------------------------------------------------------
LANES=(01-triage 02-perf 03-engagement 04-competitor 05-landing 06-seo 07-self-learn 08-adsense)
LANE_RESULTS=()

should_run() {
  local n="$1"
  if [ -n "$ONLY" ]; then [ "$ONLY" = "$n" ]; return; fi
  if [ -n "$SKIP" ]; then [[ ! ",$SKIP," =~ ,$n, ]]; return; fi
  return 0
}

for i in 1 2 3 4 5 6 7 8; do
  lane="${LANES[$((i-1))]}"
  if ! should_run "$i"; then
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
      LANE_RESULTS+=("⏱️  lane $i ($lane) — timeout, kept $changed partial file(s)")
      echo "- ⏱️  **$lane** — timed out, kept $changed partial file(s) (gate-validated)" >> "$REPORT"
    else
      log "lane $i — exit $rc (continuing); reverting THIS lane's own files only"
      revert_authored "$PRE_LANE" "$LANE_AUTHORED"
      LANE_RESULTS+=("❌ lane $i ($lane) — exit $rc")
      echo "- ❌ **$lane** — failed (exit $rc), reverted" >> "$REPORT"
    fi
    rm -f "$LANE_AFTER" "$LANE_AUTHORED"
  fi
  rm -rf "$PRE_LANE"; rm -f "$LANE_BEFORE"
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
        ( cd fe-next; rm -rf .next-nightly 2>/dev/null
          NEXT_BUILD_DIR=.next-nightly npm run build:fast 2>&1 | tail -30 ) >> "$RUN_LOG" 2>&1 \
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
  for _round in 1 2; do
    _bad_raw=$(nightly_parse_gate_failures "${NIGHTLY_LAST_GATE_OUTPUT:-}")
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
    [ -n "$_bad" ] || { log "drop-and-re-gate: no authored offending files to drop — using docs-only salvage"; break; }
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
    [ "$iso_rc" != "1" ] && break   # setup failed → bail to docs-only salvage
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
  fi

  log "docs-only salvage — shipping reports/ideas/learnings, lane code dropped ($AUTHORED_COUNT docs)"
  gate_ok=1
  echo -e "\n**Outcome:** GATE FAILED on lane code — DOCS-ONLY salvage shipped (reports/ideas/learnings kept, lane CODE dropped, founder WIP untouched)." >> "$REPORT"
  tg_alert "nightly $TODAY: code gate failed — shipped DOCS-ONLY (reports/ideas/learnings). Lane code dropped, founder WIP untouched. See \`$RUN_LOG\`."
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
if [ "$NO_MONITOR" = "0" ] && [ "$NO_CHANGE_MODE" = "0" ] && [ "$DRY_RUN" = "0" ] && [ "$NO_PUSH" = "0" ] && [ "$RUN_FAILED" = "0" ]; then
  log "spawning health monitor (30 min)"
  nohup "$LIB_DIR/health-monitor.sh" "$NEW_SHA" \
    >> "$LOG_DIR/health-monitor.log" 2>&1 &
  disown 2>/dev/null || true

  log "spawning Railway deploy check (10 min)"
  nohup "$LIB_DIR/railway-deploy-check.sh" "$NEW_SHA" \
    >> "$LOG_DIR/railway-check.log" 2>&1 &
  disown 2>/dev/null || true
fi

# --- manager summary (Sonnet composes a narrative digest from today's report) -
log "composing manager summary..."
SUMMARY_FILE=$(mktemp -t nightly-summary.XXXXXX)
SUMMARY_PROMPT=$(mktemp -t summary-prompt.XXXXXX)
cat > "$SUMMARY_PROMPT" <<PROMPT_EOF
You are writing a daily Telegram message for the LexiClash founder. Read \`docs/nightly/reports/${TODAY}.md\` end-to-end.

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

🎮 *Game-mode shipped* (ONLY if lane 5 actually shipped this run — extract from `#### Experimental game mode shipped` section in the lane-5 report. Otherwise omit this block entirely.)
> Mode: <name>
> URL: <full https URL — the natural mode route, admin-only tile on home>
> <one-line concept>
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
  --allowedTools '*' \
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

# Extract actionable items from the report and send each as its OWN message
# with its own feedback keyboard. Telegram inline-keyboards are per-message,
# so one message = one feedback target. The user sees a clear actionable card.
#
# Patterns scraped from the report:
#  - "#### Top Reddit pick of the day" block → 💬 Reddit pick card
#  - "#### Experimental game mode shipped" block → 🎮 mode shipped card
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

  # Game mode shipped: extract URL + name
  MODE_BLOCK=$(awk '/^#### Experimental game mode shipped/,/^####|^$/' "$REPORT" | head -25)
  MODE_URL=$(echo "$MODE_BLOCK" | grep -oE 'https?://lexiclash\.live/[^[:space:])]+' | head -1)
  if [ -n "$MODE_URL" ]; then
    MODE_NAME=$(echo "$MODE_BLOCK" | grep -oE '^- Mode: .*' | head -1 | sed 's/^- Mode: //')
    SLUG=$(echo "$MODE_URL" | sed -E 's|^.*/([^/]+)/?$|\1|')
    MODE_MSG="🎮 *New mode shipped* — $MODE_NAME

$MODE_URL

(admin-only tile on home; URL also works directly. Refresh the page if you don't see it.)

Reply:
- 👍 Keep building this direction
- 👎 Drop it
- 📐 Tweak — comment in chat with what to change"
    MODE_KBD="[[{\"text\":\"👍 Keep it\",\"callback_data\":\"mode:keep:${SLUG}\"},{\"text\":\"👎 Drop it\",\"callback_data\":\"mode:drop:${SLUG}\"}],[{\"text\":\"📐 Tweak\",\"callback_data\":\"mode:tweak:${SLUG}\"},{\"text\":\"🚀 Promote to public\",\"callback_data\":\"mode:promote:${SLUG}\"}]]"
    "$TG" kbd "$MODE_MSG" "$MODE_KBD" >/dev/null 2>&1
    log "sent game-mode card (slug=$SLUG)"
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

if [ "$RUN_FAILED" = "1" ]; then
  log "nightly-loop finished WITH FAILURES — full digest (summary + buttons + Reddit + ideas) was sent; NOT marking success so dedup stays clear for a retry"
  exit 1
fi
preflight_mark_success
log "nightly-loop complete"
exit 0
