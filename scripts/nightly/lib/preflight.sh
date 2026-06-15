#!/bin/bash
# preflight.sh — gate the run. Sourced by run.sh.
#
# Exposes: preflight_check ()  → exit-1 on any fail, after Telegram alert if possible.
# Side-effects: acquires lock, ff-pulls master, writes last-run heartbeat.

set -uo pipefail

LOCK_FILE="${LOCK_FILE:-$HOME/.cache/lexi-nightly/lock}"
LAST_RUN_FILE="${LAST_RUN_FILE:-$HOME/.cache/lexi-nightly/last-run}"
PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"

# --- stranded pending-ref recovery -------------------------------------
# git-ship saves a docs-only nightly commit to refs/nightly-pending/$DATE and
# resets master to origin/master when a push fails (the 2026-05-29 cause: the
# pre-push hook's `tsc --noEmit` tripped on an UNRELATED pre-existing error — a
# stale .next validator referencing a founder-WIP page that never existed). The
# strand mechanism worked, but the ref then sat forever — "resolve manually"
# never happened. Recover automatically on every run: for each DOCS-ONLY pending
# ref, cherry-pick it onto the LATEST origin/master in a throwaway worktree
# (isolated from the founder's dirty tree, robust even when origin advanced
# since the strand), and push. Non-docs strands are left for manual review — we
# never auto-reship code we can't re-gate. --no-verify is safe here: the commit
# was already gate-vetted when first created, and it is docs-only.
recover_stranded_pending_refs() {
  local refs pref psha base non_docs wtbase wt
  refs=$(git for-each-ref refs/nightly-pending/ --format='%(refname)' 2>/dev/null)
  [ -z "$refs" ] && return 0
  git fetch origin master --quiet 2>/dev/null \
    || { echo "preflight: pending-ref recovery skipped (fetch failed)"; return 0; }
  while IFS= read -r pref; do
    [ -z "$pref" ] && continue
    psha=$(git rev-parse "$pref" 2>/dev/null) || continue
    # Already on origin (a prior run or a human pushed it)? Just drop the ref.
    if git merge-base --is-ancestor "$psha" origin/master 2>/dev/null; then
      echo "preflight: pending ref $pref already on origin/master — dropping"
      git update-ref -d "$pref" 2>/dev/null || true
      continue
    fi
    base=$(git merge-base "$psha" origin/master 2>/dev/null) || continue
    non_docs=$(git diff --name-only "$base" "$psha" 2>/dev/null | grep -vE '^docs/' || true)
    if [ -n "$non_docs" ]; then
      echo "preflight: WARN — stranded $pref touches non-docs paths; leaving for manual recovery:"
      echo "$non_docs" | sed 's/^/    /'
      continue
    fi
    # `git worktree add` needs a non-existent leaf path, so nest under mktemp's dir.
    wtbase=$(mktemp -d -t nightly-recover.XXXXXX); wt="$wtbase/wt"
    if git worktree add --detach --quiet "$wt" origin/master 2>/dev/null \
       && git -C "$wt" cherry-pick --allow-empty "$psha" >/dev/null 2>&1 \
       && git -C "$wt" push --no-verify origin HEAD:master >/dev/null 2>&1; then
      echo "preflight: ✓ recovered stranded docs ref $pref → pushed to origin/master"
      git update-ref -d "$pref" 2>/dev/null || true
    else
      echo "preflight: WARN — could not auto-recover $pref (cherry-pick/push failed); will retry next run"
      git -C "$wt" cherry-pick --abort 2>/dev/null || true
    fi
    git worktree remove --force "$wt" 2>/dev/null || true
    rm -rf "$wtbase" 2>/dev/null || true
  done <<< "$refs"
  return 0
}

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

  # Auto-recover any docs-only commit a prior run failed to push (so it never
  # strands indefinitely). Runs BEFORE the ff-pull below so the clean-tree
  # ff-pull then fast-forwards local master onto the just-pushed commit,
  # preserving the local==origin invariant. Worktree-isolated → safe on a dirty
  # tree too. Never aborts the run.
  recover_stranded_pending_refs

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
    # When local HEAD carries unpushed NON-docs commits (the founder's own hand-work
    # they haven't pushed yet), we used to ABORT — "push or revert first". That made
    # the founder's local WIP block the entire nightly (the 2026-06-04 miss: a 6-line
    # leaderboard refactor sat unpushed and killed the run at preflight in 20s). The
    # original rationale was push-time source conflict (the 2026-05-27 mascot case),
    # but git-ship now handles that safely via ISOLATED ship: it cherry-picks only
    # the nightly's OWN commit onto a fresh origin/master in a throwaway worktree and
    # resets local back to the founder's HEAD. So instead of aborting, signal the
    # isolated path — the run proceeds, ships only its own files, and the founder's
    # commit + working tree are left byte-identical (never published).
    local unpushed_non_docs
    unpushed_non_docs=$(git diff --name-only origin/master..HEAD 2>/dev/null | grep -vE '^docs/' || true)
    if [ -n "$unpushed_non_docs" ]; then
      echo "preflight: HEAD carries unpushed non-docs commits — enabling isolated ship (founder work left local):"
      echo "$unpushed_non_docs" | sed 's/^/  /'
      git log origin/master..HEAD --oneline | sed 's/^/  /'
      NIGHTLY_ISOLATED_SHIP=1; export NIGHTLY_ISOLATED_SHIP
      # Capture the founder's HEAD now (no lane commits yet — lanes only dirty the
      # tree). git-ship's finalize_isolated_ship collapses local back here at end-of-run.
      NIGHTLY_FOUNDER_BASE=$(git rev-parse HEAD); export NIGHTLY_FOUNDER_BASE
    fi
  else
    echo "preflight: dirty tree — skipping ff-pull (git-ship rebases onto origin at push time)"
    # Same handling for the dirty-tree path: unpushed non-docs commits on HEAD no
    # longer abort — they enable isolated ship (see clean-tree branch above). The
    # dirty-tree branch bypassed the ff-pull block entirely, so detect it here too.
    local unpushed_non_docs_dirty
    unpushed_non_docs_dirty=$(git diff --name-only origin/master..HEAD 2>/dev/null | grep -vE '^docs/' || true)
    if [ -n "$unpushed_non_docs_dirty" ]; then
      echo "preflight: HEAD carries unpushed non-docs commits — enabling isolated ship (founder work left local):"
      echo "$unpushed_non_docs_dirty" | sed 's/^/  /'
      git log origin/master..HEAD --oneline | sed 's/^/  /'
      NIGHTLY_ISOLATED_SHIP=1; export NIGHTLY_ISOLATED_SHIP
      NIGHTLY_FOUNDER_BASE=$(git rev-parse HEAD); export NIGHTLY_FOUNDER_BASE
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
  # Glyph-agnostic match: the claude CLI flips its success glyph between releases
  # (U+2713 ✓ → U+2714 ✔ on 2026-06-15), which silently made a pinned-glyph grep
  # match nothing → every MCP falsely "not connected". Key off the stable ASCII
  # word " Connected" (capital C); failure lines read "✘ Failed to connect"
  # (lowercase), so this matches successes only, regardless of which check glyph
  # the CLI emits. mcp_connected <server-name> <list-output>.
  mcp_connected() { printf '%s' "$2" | grep -q "^${1}:.* Connected"; }
  for (( i=1; i<=tries; i++ )); do
    mcp_status=$(claude mcp list 2>&1 || true)
    # Stop early once ALL required MCPs report connected. supabase boots via a
    # cold `npx` spawn that lags the HTTP servers, so it MUST be in this gate —
    # otherwise the loop breaks on posthog+sentry while supabase is still starting
    # and the per-server check below wrongly WARNs it (observed 2026-06-15).
    if mcp_connected posthog "$mcp_status" \
       && mcp_connected sentry "$mcp_status" \
       && mcp_connected supabase "$mcp_status"; then
      break
    fi
    [ "$i" -lt "$tries" ] && { echo "preflight: MCP check attempt $i — not all connected, retrying in ${sleep_s}s"; sleep "$sleep_s"; }
  done
  for srv in posthog sentry supabase; do
    if mcp_connected "$srv" "$mcp_status"; then
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
