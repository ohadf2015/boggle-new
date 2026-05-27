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
    # Even when ff-only SUCCEEDED (origin hadn't moved at run-start), abort if
    # local HEAD carries any unpushed NON-docs commits — building the nightly on
    # top of unpushed hand-work is a recipe for push-time source conflicts when
    # origin advances during the 2-3h run. This was the 2026-05-27 root cause:
    # founder's local `702dc0fa0` (mascot rework) was unpushed at 02:00; origin
    # ff-only-clean; nightly built docs commit on top; during run, PRs #486/#487
    # merged the same `MascotCelebrationVideo.tsx`; git-ship's rebase hit a real
    # source conflict at push time → correct abort, but the night was wasted.
    # Catch it here BEFORE running 8 lanes.
    local unpushed_non_docs
    unpushed_non_docs=$(git diff --name-only origin/master..HEAD 2>/dev/null | grep -vE '^docs/' || true)
    if [ -n "$unpushed_non_docs" ]; then
      echo "preflight: ABORT — HEAD carries unpushed non-docs commits (push or revert first):"
      echo "$unpushed_non_docs" | sed 's/^/  /'
      git log origin/master..HEAD --oneline | sed 's/^/  /'
      return 1
    fi
  else
    echo "preflight: dirty tree — skipping ff-pull (git-ship rebases onto origin at push time)"
    # Same guard for the dirty-tree path: unpushed non-docs commits on HEAD are a
    # latent conflict no matter how clean the working tree is. The dirty-tree
    # branch above bypassed the ff-pull block entirely, so check here too.
    local unpushed_non_docs_dirty
    unpushed_non_docs_dirty=$(git diff --name-only origin/master..HEAD 2>/dev/null | grep -vE '^docs/' || true)
    if [ -n "$unpushed_non_docs_dirty" ]; then
      echo "preflight: ABORT — HEAD carries unpushed non-docs commits (push or revert first):"
      echo "$unpushed_non_docs_dirty" | sed 's/^/  /'
      git log origin/master..HEAD --oneline | sed 's/^/  /'
      return 1
    fi
  fi

  # --- MCP servers alive ----------------------------------------------
  # ALL MCP servers are SOFT — a single analytics MCP being unreachable must NOT
  # abort the whole night. posthog/sentry are HTTP services that blip; on
  # 2026-05-24 posthog ✗-failed at 02:00:13 and the old hard-abort killed all 8
  # lanes — even though lanes 4/5/6/7/8 don't touch posthog at all. So: RETRY the
  # connection check (transient blips recover in seconds), then WARN-and-proceed
  # on whatever is still down. Lanes that need a down MCP degrade or skip on their
  # own (they're agents — they see the failure and adapt); lanes that don't still
  # ship. "Graceful degradation over hard fail" for autonomous jobs.
  # NIGHTLY_MCP_RETRIES / NIGHTLY_MCP_RETRY_SLEEP overridable for tests.
  local mcp_status="" tries="${NIGHTLY_MCP_RETRIES:-3}" sleep_s="${NIGHTLY_MCP_RETRY_SLEEP:-15}" i
  for (( i=1; i<=tries; i++ )); do
    mcp_status=$(claude mcp list 2>&1 || true)
    # Stop early once BOTH analytics MCPs report connected.
    if echo "$mcp_status" | grep -q "^posthog:.*✓ Connected" \
       && echo "$mcp_status" | grep -q "^sentry:.*✓ Connected"; then
      break
    fi
    [ "$i" -lt "$tries" ] && { echo "preflight: MCP check attempt $i — not all connected, retrying in ${sleep_s}s"; sleep "$sleep_s"; }
  done
  for srv in posthog sentry supabase; do
    if echo "$mcp_status" | grep -q "^${srv}:.*✓ Connected"; then
      continue
    fi
    echo "preflight: WARN — MCP '$srv' not connected after ${tries} attempt(s); lanes needing it will degrade/skip (run continues)."
    echo "$mcp_status" | grep "^${srv}:" || echo "  ($srv not in list)"
  done

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
