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
  # Preserve the run-time report + ideas dirs (their files document the run
  # itself and are useful even when lane work is reverted).
  git clean -fd -e 'docs/nightly/reports' -e 'docs/nightly/ideas' 2>/dev/null || true
  mkdir -p "$(dirname "$REPORT")" "$PROJECT_DIR/docs/nightly/ideas"
  echo -e "\n**Outcome:** ABORTED — diff $DIRTY_COUNT > 30 sanity cap." >> "$REPORT"
  tg_alert "nightly $TODAY ABORTED — diff $DIRTY_COUNT files > 30 sanity cap. All changes reverted."
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
  # Clean Turbopack cache before build:fast — stale .next from prior runs (or
  # from interactive dev sessions) poisons the build with phantom SSR errors
  # (e.g., "AvatarUidContext / AvatarEyeColorContext SSR" trace). Confirmed
  # empirically: rm -rf .next .turbo recovered build from a failed→passing
  # state without any code change.
  (
    cd fe-next
    rm -rf .next .turbo 2>/dev/null
    npm run build:fast 2>&1 | tail -30
  ) >> "$RUN_LOG" 2>&1 || { log "build failed (attempt $attempt)"; continue; }
  gate_ok=1
  break
done

if [ "$gate_ok" = "0" ]; then
  log "GATE FAILED — reverting all lane changes"
  git checkout -- . 2>/dev/null || true
  # Preserve the run-time report + ideas dirs (their files document the run
  # itself and are useful even when lane work is reverted).
  git clean -fd -e 'docs/nightly/reports' -e 'docs/nightly/ideas' 2>/dev/null || true
  mkdir -p "$(dirname "$REPORT")" "$PROJECT_DIR/docs/nightly/ideas"
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
        # Push rejected — almost always origin advanced during the ~60-min run.
        # Our commit is already gate-vetted, so rebase onto origin + retry once.
        log "push rejected — fetch+rebase onto origin/master, retry once"
        if git fetch origin master --quiet \
           && git rebase origin/master >> "$RUN_LOG" 2>&1 \
           && git push origin master >> "$RUN_LOG" 2>&1; then
          NEW_SHA=$(git rev-parse HEAD)
          log "pushed after rebase $NEW_SHA"
          echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\` (rebased onto origin first)" >> "$REPORT"
        else
          git rebase --abort 2>/dev/null || true
          log "push failed after rebase retry"
          tg_alert "nightly $TODAY: push failed (even after rebase) for \`$NEW_SHA\`. Local commit kept. See \`$RUN_LOG\`."
          exit 1
        fi
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

preflight_mark_success
log "nightly-loop complete"
exit 0
