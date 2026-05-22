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

# --- flags -----------------------------------------------------------------
DRY_RUN=0; NO_PUSH=0; NO_MONITOR=0; NO_GATE=0; ONLY=""; SKIP=""
# Keep a timed-out lane's partial work (within the file cap) instead of reverting
# it. Default OFF — the integration gate validates everything, and docs-only
# salvage backstops a broken partial, but enabling this is the owner's call.
KEEP_TIMEOUT_PARTIALS="${NIGHTLY_KEEP_TIMEOUT_PARTIALS:-0}"
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
export NIGHTLY_DISABLED

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
  # On the success path the WIP snapshot is never reverted, so its tempdir leaks
  # unless we sweep it here. (Revert paths null it out after consuming it.)
  [ -n "${RUN_SNAPSHOT:-}" ] && rm -rf "$RUN_SNAPSHOT" 2>/dev/null
}
trap cleanup EXIT

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
  tg_alert "preflight failed at $(date '+%H:%M'). See \`$RUN_LOG\`."
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

# --- WIP snapshot + dirty baseline ----------------------------------------
# The loop runs ON TOP OF the founder's uncommitted WIP and ships it. Snapshot the
# FULL working tree NOW (after the report header is written, before any lane runs)
# so every abort / gate-failure path can restore it byte-for-byte — we sweep WIP
# into the commit on success, but on failure we must NEVER destroy it or push it
# broken. Also record the pre-lane dirty count so the sanity cap below measures
# LANE-introduced churn, not the founder's pre-existing WIP.
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
  BEFORE_DIRTY=$(git status --porcelain | wc -l | tr -d ' ')

  if NIGHTLY_DRY_RUN="$DRY_RUN" "$lane_script" 2>&1 | tee -a "$RUN_LOG"; then
    AFTER_DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
    changed=$(( AFTER_DIRTY - BEFORE_DIRTY ))
    if [ "$changed" -gt 8 ]; then
      log "lane $i — EXCEEDED 8-file cap ($changed); reverting THIS lane only"
      revert_to_pre_lane "$PRE_LANE"
      LANE_RESULTS+=("⚠️  lane $i ($lane) — cap exceeded, reverted")
      echo "- ⚠️  **$lane** — exceeded 8-file cap, reverted" >> "$REPORT"
    else
      LANE_RESULTS+=("✅ lane $i ($lane) — changed $changed files")
      echo "- ✅ **$lane** — $changed files touched" >> "$REPORT"
    fi
  else
    rc=$?
    AFTER_DIRTY=$(git status --porcelain | wc -l | tr -d ' ')
    changed=$(( AFTER_DIRTY - BEFORE_DIRTY ))
    if [ "$rc" = "124" ] && [ "$KEEP_TIMEOUT_PARTIALS" = "1" ] && [ "$changed" -ge 1 ] && [ "$changed" -le 8 ]; then
      # Lane hit its time ceiling but left partial work within the file cap.
      # KEEP it (flag-gated): the integration gate validates before anything
      # ships, and docs-only salvage backstops a broken partial — so the time
      # the lane already spent is recovered instead of discarded.
      log "lane $i — TIMEOUT (124), kept $changed partial file(s) [KEEP_TIMEOUT_PARTIALS=1]"
      LANE_RESULTS+=("⏱️  lane $i ($lane) — timeout, kept $changed partial file(s)")
      echo "- ⏱️  **$lane** — timed out, kept $changed partial file(s) (gate-validated)" >> "$REPORT"
    else
      log "lane $i — exit $rc (continuing); reverting THIS lane only"
      revert_to_pre_lane "$PRE_LANE"
      LANE_RESULTS+=("❌ lane $i ($lane) — exit $rc")
      echo "- ❌ **$lane** — failed (exit $rc), reverted" >> "$REPORT"
    fi
  fi
done

# --- integration: gate + commit + push ------------------------------------
log "──────── integration ────────"

DIRTY_COUNT=$(git status --porcelain | wc -l | tr -d ' ')
log "total dirty files: $DIRTY_COUNT"

if [ "$DIRTY_COUNT" = "0" ]; then
  log "no changes from any lane — composing summary anyway"
  echo -e "\n**Outcome:** no shippable changes (baselines stable, no errors to fix)." >> "$REPORT"
  # User wants a daily summary EVERY day, even if quiet. Compose a brief one.
  NEW_SHA="$START_SHA"  # nothing pushed; baseline sha is "this morning"
  NO_CHANGE_MODE=1
else
  NO_CHANGE_MODE=0
fi

LANE_CHURN=$(( DIRTY_COUNT - BASELINE_DIRTY ))
if [ "$NO_CHANGE_MODE" = "0" ] && [ "$LANE_CHURN" -gt 30 ]; then
  log "ABORT: lane churn $LANE_CHURN (>$DIRTY_COUNT total - $BASELINE_DIRTY WIP) > 30 sanity cap; restoring pre-run tree"
  # Restore the EXACT pre-lane tree (founder WIP intact, lane changes dropped). The
  # snapshot was taken after the report header, so the header survives; re-append a
  # clear failure Outcome below.
  revert_to_pre_lane "$RUN_SNAPSHOT"; RUN_SNAPSHOT=""
  mkdir -p "$(dirname "$REPORT")"
  echo -e "\n**Outcome:** ABORTED — lane churn $LANE_CHURN files > 30 sanity cap. Pre-run WIP restored, lane changes dropped." >> "$REPORT"
  send_failure_digest "Lane churn $LANE_CHURN files exceeded the 30-file sanity cap — too many changes, aborted for safety. Founder WIP restored."
  exit 1
fi

# --- build/lint/test gate (authoritative) ---------------------------------
gate_ok="${gate_ok:-0}"
[ "$NO_CHANGE_MODE" = "1" ] && gate_ok=1
if [ "$NO_GATE" = "1" ]; then
  log "--no-gate — skipping lint/test/build (only safe for docs-only lanes)"
  gate_ok=1
fi
for attempt in 1 2; do
  [ "$gate_ok" = "1" ] && break
  log "gate attempt $attempt: fe-next lint + test + build:fast"
  (
    cd fe-next
    npm run lint 2>&1 | tail -20
  ) >> "$RUN_LOG" 2>&1 || { log "lint failed (attempt $attempt)"; continue; }
  (
    cd fe-next
    npm run test 2>&1 | tail -30
  ) >> "$RUN_LOG" 2>&1 || { log "test failed (attempt $attempt)"; continue; }
  # Build into an ISOLATED dir (.next-nightly via NEXT_BUILD_DIR, honoured by
  # next.config.mjs). A running `npm run dev` server continuously writes .next;
  # sharing it raced the build into phantom "AvatarUidContext/AvatarEyeColorContext
  # SSR" errors and failed the gate on 2026-05-20. Isolating the dir means the
  # nightly build can NEVER collide with an active dev session — mid-day or 02:30.
  # We rm only our own dir (never the dev server's .next). Start clean each attempt.
  (
    cd fe-next
    rm -rf .next-nightly 2>/dev/null
    NEXT_BUILD_DIR=.next-nightly npm run build:fast 2>&1 | tail -30
  ) >> "$RUN_LOG" 2>&1 || { log "build failed (attempt $attempt)"; continue; }
  gate_ok=1
  break
done

if [ "$gate_ok" = "0" ]; then
  # NEVER push broken code, and NEVER lose the founder's WIP. But don't throw away
  # a whole night's reports/ideas/learnings because one lane shipped breaking CODE.
  # Lanes write docs under docs/ (repo root, OUTSIDE fe-next); the lint/test/build
  # gate runs INSIDE fe-next, so docs can NEVER break it — the culprit is always a
  # lane's fe-next code. Salvage: stash post-lane docs, restore the pre-run tree
  # (drops lane code), re-apply docs, then RE-GATE founder-WIP+docs to be certain.
  log "GATE FAILED — attempting docs-only salvage before full revert"
  SALVAGE_DOCS=$(mktemp -d -t nightly-docs.XXXXXX)
  rsync -a "$PROJECT_DIR/docs/" "$SALVAGE_DOCS/" 2>/dev/null
  revert_to_pre_lane "$RUN_SNAPSHOT"; RUN_SNAPSHOT=""
  PRISTINE=$(snapshot_pre_lane)            # pre-run tree, kept for the failure path
  rsync -a "$SALVAGE_DOCS/" "$PROJECT_DIR/docs/" 2>/dev/null
  rm -rf "$SALVAGE_DOCS"

  log "docs-only salvage: re-gating founder-WIP + lane docs (no lane code)"
  salvage_ok=0
  if ( cd fe-next \
        && npm run lint >>"$RUN_LOG" 2>&1 \
        && npm run test >>"$RUN_LOG" 2>&1 \
        && { rm -rf .next-nightly 2>/dev/null; NEXT_BUILD_DIR=.next-nightly npm run build:fast >>"$RUN_LOG" 2>&1; } ); then
    salvage_ok=1
  fi

  if [ "$salvage_ok" = "1" ]; then
    log "docs-only salvage PASSED — shipping reports/ideas/learnings, lane code dropped"
    rm -rf "$PRISTINE"
    gate_ok=1
    echo -e "\n**Outcome:** GATE FAILED on lane code — DOCS-ONLY salvage shipped (reports/ideas/learnings kept, lane CODE dropped, founder WIP intact)." >> "$REPORT"
    tg_alert "nightly $TODAY: code gate failed — shipped DOCS-ONLY (reports/ideas/learnings). Lane code dropped, founder WIP intact. See \`$RUN_LOG\`."
    # fall through to commit; docs are now the only lane-introduced changes
  else
    log "docs-only salvage FAILED too (founder WIP not gate-clean) — full revert"
    revert_to_pre_lane "$PRISTINE"
    mkdir -p "$(dirname "$REPORT")"
    echo -e "\n**Outcome:** GATE FAILED — lint/test/build failed; docs-only salvage also failed. Pre-run tree restored (founder WIP intact, all lane changes dropped)." >> "$REPORT"
    send_failure_digest "Gate failed (lint/test/build) on both attempts, and the docs-only salvage also failed. All lane changes dropped, founder WIP intact."
    exit 1
  fi
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
    ship_nightly_commit || { send_failure_digest "Commit/push failed — likely a real merge conflict with origin/master. The local commit was preserved for a human to resolve."; exit 1; }
  fi
fi

# --- post-push monitor (skip in no-change / dry-run / no-push) ------------
if [ "$NO_MONITOR" = "0" ] && [ "$NO_CHANGE_MODE" = "0" ] && [ "$DRY_RUN" = "0" ] && [ "$NO_PUSH" = "0" ]; then
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

Mode: $([ "$NO_CHANGE_MODE" = "1" ] && echo "NO-CHANGE NIGHT (no lanes shipped). Output 4-6 lines max: a one-line 'all clear' headline + a brief 'what was checked'. NO bullet sections. Skip 'wins' entirely." || echo "Changes shipped. Lead with concrete impact.")

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
if [ ${#_to[@]} -gt 0 ] && "${_to[@]}" claude -p "$(cat "$SUMMARY_PROMPT")" \
  --allowedTools '*' \
  --dangerously-skip-permissions \
  --model sonnet \
  < /dev/null \
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
  log "summary composer failed/timed out — minimal fallback"
  SUMMARY=$(printf '🌙 *%s* — \`%s\`\n\nManager summary composer failed. See attached report.\n\n%s' \
    "$TODAY" "${NEW_SHA:0:7}" "$(printf '%s\n' "${LANE_RESULTS[@]}" | head -3)")
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
fi

# --- residual ship: push anything still dirty ------------------------------
# git-ship appends the Outcome line to the report AFTER its own commit, so the main
# ship always leaves that line (plus any other end-of-run writes) uncommitted. Left
# alone it would dirty the tree for tomorrow — exactly what stranded the 2026-05-19
# run. Sweep the residue into a follow-up commit so "more changes get pushed too"
# and the tree ends CLEAN. Reuse ship_nightly_commit (fetch+rebase+docs-resolve);
# point REPORT at /dev/null so its OWN Outcome append can't re-dirty the tree.
if [ "$DRY_RUN" = "0" ] && [ "$NO_PUSH" = "0" ] && [ -n "$(git status --porcelain)" ]; then
  log "residual changes after main ship — sweeping into a follow-up commit"
  RESIDUAL_MSG=$(mktemp)
  cat > "$RESIDUAL_MSG" <<EOF
chore(nightly): post-run residue ${TODAY}

Trailing changes after the main ship (report finalization, etc).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
  if MSG_FILE="$RESIDUAL_MSG" REPORT=/dev/null NO_CHANGE_MODE=0 ship_nightly_commit; then
    log "residual ship OK ($(git rev-parse --short HEAD)); tree now $([ -z "$(git status --porcelain)" ] && echo clean || echo 'still dirty'))"
  else
    log "residual ship failed (non-fatal — main work already pushed; tree left for next run)"
  fi
  rm -f "$RESIDUAL_MSG"
fi

preflight_mark_success
log "nightly-loop complete"
exit 0
