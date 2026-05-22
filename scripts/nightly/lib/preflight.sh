#!/bin/bash
# preflight.sh — gate the run. Sourced by run.sh.
#
# Exposes: preflight_check ()  → exit-1 on any fail, after Telegram alert if possible.
# Side-effects: acquires lock, ff-pulls master, writes last-run heartbeat.

set -uo pipefail

LOCK_FILE="${LOCK_FILE:-$HOME/.cache/lexi-nightly/lock}"
LAST_RUN_FILE="${LAST_RUN_FILE:-$HOME/.cache/lexi-nightly/last-run}"
PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"

preflight_check() {
  mkdir -p "$(dirname "$LOCK_FILE")"

  # --- killswitch -------------------------------------------------------
  if [ "${NIGHTLY_DISABLED:-0}" = "1" ]; then
    echo "preflight: NIGHTLY_DISABLED=1 — skipping run"
    return 1
  fi

  # --- once-per-day dedup ----------------------------------------------
  # launchd fires at 00:00 LOCAL; with RunAtLoad=false and the Mac asleep the
  # fire is DEFERRED to next wake, so a run's wall-clock time drifts later across
  # days. A fixed rolling window (we used 18h) then wrongly suppresses the NEXT
  # day's run once the prior run drifts into late morning — observed 2026-05-22,
  # last success 05-21 11:15 → 05-22 02:39 wake-fire was only 15.4h later → killed.
  # Dedup on the LOCAL CALENDAR DAY instead: at most one successful run per day.
  # A 4h floor additionally kills a genuine double-fire straddling midnight
  # (23:5x then 00:0x = different day). Two legitimate run.sh invocations are
  # never <4h apart (single 00:00 calendar trigger + manual), so the floor never
  # blocks a real run. NIGHTLY_NOW_EPOCH overrides "now" for deterministic tests.
  local now=${NIGHTLY_NOW_EPOCH:-$(date +%s)}
  if [ -f "$LAST_RUN_FILE" ]; then
    local last=$(stat -f %m "$LAST_RUN_FILE" 2>/dev/null || echo 0)
    local age=$(( now - last ))
    local last_day today_day
    last_day=$(date -r "$last" +%Y-%m-%d 2>/dev/null || echo "")
    today_day=$(date -r "$now" +%Y-%m-%d 2>/dev/null || echo "")
    if [ "$last_day" = "$today_day" ] || [ "$age" -lt 14400 ]; then
      echo "preflight: already ran ${age}s ago on ${last_day} (today=${today_day}) — skipping duplicate run"
      return 1
    fi
  fi

  # --- lock with pid + mtime ------------------------------------------
  # IMPORTANT: caller must pass the orchestrator PID via $NIGHTLY_PID env var
  # (set by run.sh before calling). $$ here would be the subshell PID and
  # poison the staleness check next run.
  local self_pid="${NIGHTLY_PID:-$$}"
  if [ -f "$LOCK_FILE" ]; then
    local pid=$(cat "$LOCK_FILE" 2>/dev/null | head -1)
    local lock_age=$(( $(date +%s) - $(stat -f %m "$LOCK_FILE" 2>/dev/null || echo 0) ))
    if [ -n "$pid" ] && [ "$pid" != "$self_pid" ] && kill -0 "$pid" 2>/dev/null && [ "$lock_age" -lt 7200 ]; then
      echo "preflight: ABORT — another nightly is running (pid=$pid, age=${lock_age}s)"
      return 1
    fi
    echo "preflight: stale lock (pid=$pid, age=${lock_age}s) — clearing"
    rm -f "$LOCK_FILE"
  fi
  echo "$self_pid" > "$LOCK_FILE"

  # --- git tree state --------------------------------------------------
  cd "$PROJECT_DIR" || { echo "preflight: cd $PROJECT_DIR failed"; return 1; }

  # The nightly INTENTIONALLY runs on top of the founder's WIP: it sweeps the
  # dirty tree into the autonomous commit and ships it (run.sh snapshots the WIP
  # first, so a gate failure restores it untouched and never pushes broken code).
  # So a dirty tree must NOT abort. We only RECORD cleanliness — it gates the
  # ff-pull below, which git refuses to run on a dirty tree.
  local tree_clean=1
  if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
    tree_clean=0
    echo "preflight: working tree dirty — will run on top of WIP and ship it"
    git status --short
  fi

  local branch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$branch" != "master" ]; then
    echo "preflight: ABORT — not on master (on $branch)"
    return 1
  fi

  # ff-pull is an OPTIMIZATION, not a correctness requirement: git-ship rebases
  # the nightly commit onto origin/master at push time. Both `git pull --ff-only`
  # and `git rebase` REFUSE on a dirty tree, so skip the whole block when dirty
  # and let the push-time rebase reconcile any divergence.
  if [ "$tree_clean" = "1" ]; then
    echo "preflight: fetching + ff-pulling master..."
    git fetch origin master --quiet || { echo "preflight: fetch failed"; return 1; }
    if ! git pull --ff-only origin master --quiet; then
      # ff failed → local diverged from origin. Self-heal ONLY when every local-only
      # commit is docs/-only (a stranded seo-daily report, or our own failed-push
      # from a prior run). If ANY local-only commit touches non-docs paths, abort
      # for manual review — never auto-rebase code we can't re-gate.
      local non_docs
      non_docs=$(git diff --name-only origin/master..master | grep -vE '^docs/' || true)
      if [ -n "$non_docs" ]; then
        echo "preflight: ABORT — diverged & local-only commits touch non-docs paths (manual review):"
        echo "$non_docs" | sed 's/^/  /'
        return 1
      fi
      echo "preflight: ff-only failed — local-only commits are docs-only, auto-rebasing onto origin/master"
      if git rebase origin/master >/dev/null 2>&1; then
        echo "preflight: auto-rebase OK"
      else
        git rebase --abort 2>/dev/null || true
        echo "preflight: ABORT — auto-rebase onto origin/master conflicted (manual fix needed)"
        return 1
      fi
    fi
  else
    echo "preflight: dirty tree — skipping ff-pull (git-ship rebases onto origin at push time)"
  fi

  # --- MCP servers alive ----------------------------------------------
  # posthog + sentry are HARD requirements (every lane uses them).
  # supabase is SOFT: lanes 1+2 prefer the MCP but can fall back to direct SQL
  # via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars; lanes 3-7 don't use it.
  # Source: web-research best-practice "graceful degradation over hard fail" for
  # autonomous nightly jobs.
  local mcp_status
  mcp_status=$(claude mcp list 2>&1 || true)
  for srv in posthog sentry; do
    if ! echo "$mcp_status" | grep -q "^${srv}:.*✓ Connected"; then
      echo "preflight: ABORT — MCP server '$srv' not connected (hard requirement)"
      echo "$mcp_status" | grep "^${srv}:" || echo "  (not in list)"
      return 1
    fi
  done
  if ! echo "$mcp_status" | grep -q "^supabase:.*✓ Connected"; then
    echo "preflight: WARN — supabase MCP not connected; lanes 1+2 will degrade to direct SQL via env."
    echo "$mcp_status" | grep "^supabase:" || echo "  (not in list)"
  fi

  # --- required env ----------------------------------------------------
  local missing=()
  for var in TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID POSTHOG_PERSONAL_API_KEY POSTHOG_PROJECT_ID; do
    if [ -z "${!var:-}" ]; then
      missing+=("$var")
    fi
  done
  if [ ${#missing[@]} -gt 0 ]; then
    echo "preflight: ABORT — missing env: ${missing[*]}"
    return 1
  fi

  # --- gtimeout availability (hard requirement for lane execution) ----
  if ! command -v gtimeout >/dev/null 2>&1 && ! command -v timeout >/dev/null 2>&1; then
    echo "preflight: ABORT — gtimeout/timeout missing. Install: brew install coreutils"
    return 1
  fi

  # --- credentials for lane 5 (warn, do not abort) --------------------
  [ -f "$HOME/.config/gcloud/application_default_credentials.json" ] \
    || echo "preflight: WARN — gcloud ADC missing; lane 5 (SEO) will skip"
  [ -f "$HOME/.config/bing-wmt/credentials" ] \
    || echo "preflight: WARN — Bing WMT creds missing; lane 5 may degrade"

  # --- pull yesterday's Telegram-button feedback into docs/nightly/feedback/
  # so lane prompts can read it as preamble + adjust strategy. Non-fatal.
  if [ -x "$PROJECT_DIR/scripts/nightly/lib/feedback-poll.sh" ]; then
    "$PROJECT_DIR/scripts/nightly/lib/feedback-poll.sh" 2>&1 | sed 's/^/  /'
  fi

  # NOTE: last-run timestamp written by run.sh ONLY on successful completion,
  # not here — otherwise an aborted preflight would poison the 18h dedupe check.

  echo "preflight: OK — repo @ $(git rev-parse --short HEAD)"
  return 0
}

preflight_mark_success() {
  date +%s > "${LAST_RUN_FILE:-$HOME/.cache/lexi-nightly/last-run}"
}

preflight_release_lock() {
  rm -f "$LOCK_FILE"
}
