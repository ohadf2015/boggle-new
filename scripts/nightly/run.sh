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
DRY_RUN=0; NO_PUSH=0; NO_MONITOR=0; ONLY=""; SKIP=""
for arg in "$@"; do
  case "$arg" in
    --dry-run)    DRY_RUN=1; NO_PUSH=1; NO_MONITOR=1 ;;
    --no-push)    NO_PUSH=1 ;;
    --no-monitor) NO_MONITOR=1 ;;
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

cleanup() {
  # shellcheck disable=SC1091
  . "$LIB_DIR/preflight.sh"
  preflight_release_lock
}
trap cleanup EXIT

# snapshot_pre_lane → echoes a directory path containing a full mirror of the
# working tree (excluding heavy dirs). Uses rsync so the revert can handle:
#   - tracked modifications (replayed)
#   - untracked-only state (replayed)
#   - DELETIONS (replayed — git stash + tar lose this)
#   - executable bits + symlinks (preserved by rsync -a)
# Tested in 4 scenarios + 1000-file speed (~220ms).
snapshot_pre_lane() {
  local snap
  snap=$(mktemp -d -t lexi-snap.XXXXXX)
  rsync -a --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.turbo' \
    --exclude='.claude/worktrees' \
    --exclude='dist' --exclude='build' --exclude='coverage' \
    "$PROJECT_DIR/" "$snap/" 2>/dev/null || true
  echo "$snap"
}

# revert_to_pre_lane <snapshot_dir>
# Mirror the snapshot back onto the working tree with --delete (removes files
# the lane added). Preserves prior lanes' work because they were in the snapshot.
revert_to_pre_lane() {
  local snap="$1"
  if [ -n "$snap" ] && [ -d "$snap" ]; then
    rsync -a --delete \
      --exclude='.git' \
      --exclude='node_modules' \
      --exclude='.next' \
      --exclude='.turbo' \
      --exclude='.claude/worktrees' \
      --exclude='dist' --exclude='build' --exclude='coverage' \
      "$snap/" "$PROJECT_DIR/" 2>/dev/null || true
    rm -rf "$snap"
  fi
}

# --- preflight -------------------------------------------------------------
# shellcheck disable=SC1091
. "$LIB_DIR/preflight.sh"
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

# --- run lanes -------------------------------------------------------------
LANES=(01-triage 02-perf 03-engagement 04-competitor 05-landing 06-seo 07-self-learn)
LANE_RESULTS=()

should_run() {
  local n="$1"
  if [ -n "$ONLY" ]; then [ "$ONLY" = "$n" ]; return; fi
  if [ -n "$SKIP" ]; then [[ ! ",$SKIP," =~ ,$n, ]]; return; fi
  return 0
}

for i in 1 2 3 4 5 6 7; do
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
    log "lane $i — exit $rc (continuing); reverting THIS lane only"
    revert_to_pre_lane "$PRE_LANE"
    LANE_RESULTS+=("❌ lane $i ($lane) — exit $rc")
    echo "- ❌ **$lane** — failed (exit $rc), reverted" >> "$REPORT"
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

if [ "$NO_CHANGE_MODE" = "0" ] && [ "$DIRTY_COUNT" -gt 30 ]; then
  log "ABORT: total diff $DIRTY_COUNT > 30 (sanity cap); reverting all"
  git checkout -- . 2>/dev/null || true
  git clean -fd 2>/dev/null || true
  echo -e "\n**Outcome:** ABORTED — diff $DIRTY_COUNT > 30 sanity cap." >> "$REPORT"
  tg_alert "nightly $TODAY ABORTED — diff $DIRTY_COUNT files > 30 sanity cap. All changes reverted."
  exit 1
fi

# --- build/lint/test gate (authoritative) ---------------------------------
gate_ok="${gate_ok:-0}"
[ "$NO_CHANGE_MODE" = "1" ] && gate_ok=1
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
  (
    cd fe-next
    npm run build:fast 2>&1 | tail -30
  ) >> "$RUN_LOG" 2>&1 || { log "build failed (attempt $attempt)"; continue; }
  gate_ok=1
  break
done

if [ "$gate_ok" = "0" ]; then
  log "GATE FAILED — reverting all lane changes"
  git checkout -- . 2>/dev/null || true
  git clean -fd 2>/dev/null || true
  echo -e "\n**Outcome:** GATE FAILED — lint/test/build failed twice. Reverted." >> "$REPORT"
  tg_alert "nightly $TODAY: build/lint/test gate failed twice. Diff reverted. See \`$RUN_LOG\`."
  exit 1
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
    git add -A
    git commit -F "$MSG_FILE" >> "$RUN_LOG" 2>&1 || {
      log "commit failed (likely pre-commit hook). See log."
      tg_alert "nightly $TODAY: commit failed — pre-commit hook? See \`$RUN_LOG\`."
      exit 1
    }
    NEW_SHA=$(git rev-parse HEAD)
    log "committed $NEW_SHA"
    rm -f "$MSG_FILE"

    if [ "$NO_PUSH" = "1" ]; then
      log "--no-push — skipping push (will still compose + send summary)"
      echo -e "\n**Outcome:** committed \`$NEW_SHA\` locally (not pushed)." >> "$REPORT"
    else
      log "pushing master..."
      if git push origin master >> "$RUN_LOG" 2>&1; then
        log "pushed $NEW_SHA"
        echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\`" >> "$REPORT"
      else
        log "push failed"
        tg_alert "nightly $TODAY: push failed for \`$NEW_SHA\`. Local commit kept. See \`$RUN_LOG\`."
        exit 1
      fi
    fi
  fi
fi

# --- post-push monitor (skip in no-change / dry-run / no-push) ------------
if [ "$NO_MONITOR" = "0" ] && [ "$NO_CHANGE_MODE" = "0" ] && [ "$DRY_RUN" = "0" ] && [ "$NO_PUSH" = "0" ]; then
  log "spawning health monitor (30 min)"
  nohup "$LIB_DIR/health-monitor.sh" "$NEW_SHA" \
    >> "$LOG_DIR/health-monitor.log" 2>&1 &
  disown 2>/dev/null || true
fi

# --- manager summary (Sonnet composes a narrative digest from today's report) -
log "composing manager summary..."
SUMMARY_FILE=$(mktemp -t nightly-summary.XXXXXX)
SUMMARY_PROMPT=$(mktemp -t summary-prompt.XXXXXX)
cat > "$SUMMARY_PROMPT" <<PROMPT_EOF
You are writing a daily manager-summary Telegram message for the LexiClash founder. Read \`docs/nightly/reports/${TODAY}.md\` (today's nightly report) and any per-lane outputs referenced inside it.

Mode: $([ "$NO_CHANGE_MODE" = "1" ] && echo "NO-CHANGE NIGHT (no lanes shipped fixes — baselines stable, no errors). Keep the summary BRIEF and honest about it. Highlight what was checked + that everything looks healthy. Skip 'Key wins' if there genuinely were none." || echo "Changes shipped. Lead with concrete impact.")

Compose a concise narrative summary (≤1200 characters total, Telegram Markdown). Structure:

\`\`\`
🌙 *Nightly ${TODAY}* — shipped \`${NEW_SHA:0:7}\` (${DIRTY_COUNT} files)

*TL;DR*
<1-2 sentences: did we ship good stuff or hit issues>

*Key wins*
• <fix/improvement 1 with concrete impact, e.g., "patched N+1 query saving ~140ms p75 on /api/leaderboard">
• <win 2>
• <win 3 — skip if only 2 real wins>

*Concerns*
• <thing flagged for human review, OR write "none" if clean>

*Tomorrow*
• <one concrete focus area based on data — what should lane 1-6 lean into>
\`\`\`

Rules:
- Be specific. "Fixed Sentry error X with impact Y" beats "fixed errors".
- Use Telegram Markdown (\`*bold*\` not \`**bold**\`, \`\\\`code\\\`\` for inline code).
- Lead with concrete impact. Avoid filler.
- If a lane failed: name the lane + the error in one line under Concerns.
- Read PostHog data IF embedded in the report (lane 02 perf + lane 03 engagement leave KPIs there).
- Use the typed-experiment names, route names, error messages from the report — don't invent.
- Do NOT include "Generated by Claude" footer. Do NOT exceed 1200 chars.

Write ONLY the message body. No preamble, no explanation.
PROMPT_EOF

if timeout 240s claude -p "$(cat "$SUMMARY_PROMPT")" \
  --allowedTools '*' \
  --dangerously-skip-permissions \
  --model sonnet \
  > "$SUMMARY_FILE" 2>>"$RUN_LOG"; then
  SUMMARY=$(cat "$SUMMARY_FILE")
  log "manager summary composed ($(wc -c < "$SUMMARY_FILE") chars)"
else
  log "summary composer failed/timed out — falling back to tactical headline"
  SUMMARY="🌙 *nightly ${TODAY}* — shipped \`${NEW_SHA:0:7}\` · ${DIRTY_COUNT} files
$(printf '%s\n' "${LANE_RESULTS[@]}" | head -6)"
fi
rm -f "$SUMMARY_PROMPT" "$SUMMARY_FILE"

# Send the narrative summary FIRST, then attach the full report for deep-dive.
tg_msg "$SUMMARY"
tg_doc "$REPORT" "Full report attached"

preflight_mark_success
log "nightly-loop complete"
exit 0
