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

  # --- missed-run heartbeat suppression --------------------------------
  # If we ran in the last 18h, skip (avoid double-fire from launchd + heartbeat).
  if [ -f "$LAST_RUN_FILE" ]; then
    local age=$(( $(date +%s) - $(stat -f %m "$LAST_RUN_FILE" 2>/dev/null || echo 0) ))
    if [ "$age" -lt 64800 ]; then
      echo "preflight: ran $age s ago (<18h) — skipping duplicate run"
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

  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "preflight: ABORT — working tree dirty"
    git status --short
    return 1
  fi

  local branch=$(git rev-parse --abbrev-ref HEAD)
  if [ "$branch" != "master" ]; then
    echo "preflight: ABORT — not on master (on $branch)"
    return 1
  fi

  echo "preflight: fetching + ff-pulling master..."
  git fetch origin master --quiet || { echo "preflight: fetch failed"; return 1; }
  git pull --ff-only origin master --quiet || {
    echo "preflight: ABORT — ff-only pull failed (divergence)"
    return 1
  }

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
