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
export PROJECT_DIR

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

# snapshot_pre_lane → echoes a tarball path containing tracked + untracked-non-ignored.
# Why not `git stash create -u`? Returns empty when only untracked changes exist,
# which is the common case for early lanes (lane 3 writes only new files).
snapshot_pre_lane() {
  local snap
  snap=$(mktemp -t lexi-snap.XXXXXX.tar)
  git ls-files -comz --exclude-standard | tar -cf "$snap" --null -T - 2>/dev/null || true
  echo "$snap"
}

# revert_to_pre_lane <tarball_path>
# Reset working tree to HEAD, clean untracked, restore the tarball.
# Preserves changes from prior successful lanes (they were in the tarball).
revert_to_pre_lane() {
  local snap="$1"
  git reset --hard HEAD 2>/dev/null || true
  git clean -fd 2>/dev/null || true
  if [ -n "$snap" ] && [ -f "$snap" ]; then
    tar -xf "$snap" 2>/dev/null || true
    rm -f "$snap"
  fi
}

# --- preflight -------------------------------------------------------------
# shellcheck disable=SC1091
. "$LIB_DIR/preflight.sh"
log "========================================"
log "nightly-loop start ${DATE_TAG} dry=$DRY_RUN no-push=$NO_PUSH only=$ONLY skip=$SKIP"
log "========================================"

if ! preflight_check 2>&1 | tee -a "$RUN_LOG"; then
  log "preflight failed — aborting"
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
LANES=(01-triage 02-engagement 03-competitor 04-landing 05-seo 06-self-learn)
LANE_RESULTS=()

should_run() {
  local n="$1"
  if [ -n "$ONLY" ]; then [ "$ONLY" = "$n" ]; return; fi
  if [ -n "$SKIP" ]; then [[ ! ",$SKIP," =~ ,$n, ]]; return; fi
  return 0
}

for i in 1 2 3 4 5 6; do
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
  log "no changes from any lane — done"
  echo -e "\n**Outcome:** no shippable changes." >> "$REPORT"
  tg_doc "$REPORT" "🌙 nightly $TODAY — *no shippable changes*"
  exit 0
fi

if [ "$DIRTY_COUNT" -gt 30 ]; then
  log "ABORT: total diff $DIRTY_COUNT > 30 (sanity cap); reverting all"
  git checkout -- . 2>/dev/null || true
  git clean -fd 2>/dev/null || true
  echo -e "\n**Outcome:** ABORTED — diff $DIRTY_COUNT > 30 sanity cap." >> "$REPORT"
  tg_alert "nightly $TODAY ABORTED — diff $DIRTY_COUNT files > 30 sanity cap. All changes reverted."
  exit 1
fi

# --- build/lint/test gate (authoritative) ---------------------------------
gate_ok=0
for attempt in 1 2; do
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

# --- commit ---------------------------------------------------------------
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
  log "DRY RUN — skipping push"
  echo -e "\n**Outcome:** DRY RUN ($DIRTY_COUNT files staged but not committed)." >> "$REPORT"
  exit 0
fi

git add -A
git commit -F "$MSG_FILE" >> "$RUN_LOG" 2>&1 || {
  log "commit failed (likely pre-commit hook). See log."
  tg_alert "nightly $TODAY: commit failed — pre-commit hook? See \`$RUN_LOG\`."
  exit 1
}
NEW_SHA=$(git rev-parse HEAD)
log "committed $NEW_SHA"
rm -f "$MSG_FILE"

# --- push -----------------------------------------------------------------
if [ "$NO_PUSH" = "1" ]; then
  log "--no-push — skipping push"
  echo -e "\n**Outcome:** committed \`$NEW_SHA\` locally (not pushed)." >> "$REPORT"
  tg_doc "$REPORT" "🌙 nightly $TODAY — committed \`${NEW_SHA:0:7}\` (no push)"
  exit 0
fi

log "pushing master..."
if git push origin master >> "$RUN_LOG" 2>&1; then
  log "pushed $NEW_SHA"
  echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\`" >> "$REPORT"
else
  log "push failed"
  tg_alert "nightly $TODAY: push failed for \`$NEW_SHA\`. Local commit kept. See \`$RUN_LOG\`."
  exit 1
fi

# --- post-push monitor ----------------------------------------------------
if [ "$NO_MONITOR" = "0" ]; then
  log "spawning health monitor (30 min)"
  nohup "$LIB_DIR/health-monitor.sh" "$NEW_SHA" \
    >> "$LOG_DIR/health-monitor.log" 2>&1 &
  disown 2>/dev/null || true
fi

# --- digest ---------------------------------------------------------------
HEADLINE="🌙 nightly $TODAY shipped \`${NEW_SHA:0:7}\` · $DIRTY_COUNT files
$(printf '%s\n' "${LANE_RESULTS[@]}" | head -6)"
tg_doc "$REPORT" "$HEADLINE"

preflight_mark_success
log "nightly-loop complete"
exit 0
