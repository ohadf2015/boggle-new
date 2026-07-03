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
# git-ship saves a nightly commit to refs/nightly-pending/$DATE and resets master
# to origin/master when a push fails (the 2026-05-29 cause: the pre-push hook's
# `tsc --noEmit` tripped on an UNRELATED pre-existing error). The strand mechanism
# worked, but the ref then sat FOREVER — the old "resolve manually" path never
# happened (the 06-07 + 06-13 refs strand-flagged 4 nights running, 2026-06-16).
# The loop must be HEALTHY with ZERO human action. So every run disposes EVERY
# stranded ref by DATA, never leaving one to re-flag:
#   1. is-ancestor on origin            → drop (already landed under this SHA).
#   2. per-day artifacts already on origin (byte-identical) → drop. A strand whose
#      unique outputs landed under a DIFFERENT sha (a manual recovery commit) is
#      NOT an ancestor, and its cumulative logs (learnings/triage/perf-baseline)
#      have since been ADVANCED by later runs — cherry-picking would CONFLICT and
#      REVERT them. Supersession-by-content drops it cleanly (the 06-13 case).
#   3. docs-only, not superseded        → cherry-pick onto LATEST origin/master in
#      a throwaway worktree (robust even when origin advanced) and push.
#   4. touches non-docs (code)          → ARCHIVE to recover/nightly-code-$DATE so
#      the SHA is never lost, then drop the ref. We never auto-reship stale code
#      onto a moved master (unsafe — a human edited around it), but we never strand
#      it forever either. The branch is an informational handle, not a to-do.
# --no-verify is safe in the docs cherry-pick: the commit was gate-vetted when
# first created, and it is docs-only.
recover_stranded_pending_refs() {
  local refs pref psha base non_docs wtbase wt date_tag arts superseded a
  refs=$(git for-each-ref refs/nightly-pending/ --format='%(refname)' 2>/dev/null)
  [ -z "$refs" ] && return 0
  git fetch origin master --quiet 2>/dev/null \
    || { echo "preflight: pending-ref recovery skipped (fetch failed)"; return 0; }
  while IFS= read -r pref; do
    [ -z "$pref" ] && continue
    psha=$(git rev-parse "$pref" 2>/dev/null) || continue
    date_tag="${pref##*/}"   # refs/nightly-pending/2026-06-13 → 2026-06-13
    # Already on origin (a prior run or a human pushed it)? Just drop the ref.
    if git merge-base --is-ancestor "$psha" origin/master 2>/dev/null; then
      echo "preflight: pending ref $pref already on origin/master — dropping"
      git update-ref -d "$pref" 2>/dev/null || true
      continue
    fi
    base=$(git merge-base "$psha" origin/master 2>/dev/null) || continue
    # Content-supersession: a strand's UNIQUE per-day artifacts are new-file-per-day
    # (reports/artifacts/ideas/seo-daily/loop-improvements) — NOT the cumulative logs
    # (learnings.md, triage-queue.md, perf-baseline.json, dictionary-improvement-report.md)
    # that every run rewrites. If every per-day artifact in the strand is already
    # byte-identical on origin, this day's output landed (under a manual-recovery sha);
    # the only "unrecovered" diff is stale cumulative logs that newer runs advanced past
    # — so cherry-pick would CONFLICT and REVERT them. Drop instead. (06-13, 2026-06-16.)
    arts=$(git diff --name-only "$base" "$psha" 2>/dev/null \
      | grep -E '^docs/(nightly/(reports|artifacts|ideas|loop-improvements)|seo-daily)/' || true)
    if [ -n "$arts" ]; then
      superseded=1
      while IFS= read -r a; do
        [ -z "$a" ] && continue
        if [ "$(git rev-parse "$psha:$a" 2>/dev/null)" != "$(git rev-parse "origin/master:$a" 2>/dev/null)" ]; then
          superseded=0; break
        fi
      done <<< "$arts"
      if [ "$superseded" = 1 ]; then
        echo "preflight: pending ref $pref — all per-day artifacts already on origin/master (content-superseded) — dropping"
        git update-ref -d "$pref" 2>/dev/null || true
        continue
      fi
    fi
    non_docs=$(git diff --name-only "$base" "$psha" 2>/dev/null | grep -vE '^docs/' || true)
    if [ -n "$non_docs" ]; then
      # Autonomous code-strand disposition (was: "leaving for manual recovery", which
      # re-flagged the same ref every night). Preserve the SHA on a recover/ branch so
      # it is never lost, then drop the ref so the loop is never blocked or re-flagged.
      # We do NOT auto-reship: the code is stale relative to a moved master and a human
      # may have edited around it; re-shipping unverified is unsafe. The branch is an
      # informational handle (revive with `git cherry-pick`), NOT an action item.
      git branch -f "recover/nightly-code-$date_tag" "$psha" 2>/dev/null || true
      echo "preflight: stranded $pref touches non-docs paths — archived to recover/nightly-code-$date_tag and dropped (no action required):"
      echo "$non_docs" | sed 's/^/    /'
      git update-ref -d "$pref" 2>/dev/null || true
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

  local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  if [ "$branch" != "master" ]; then
    # SELF-HEAL: a prior MANUAL session (e.g. land-via-worktree, an aborted cherry-
    # pick) can leave this shared working tree checked out on a non-master branch.
    # Before 2026-06-22 we hard-aborted here in <10s and sent NO alert — so every
    # nightly silently no-op'd until a human noticed days later. Auto-recover onto
    # master, but ONLY when it is LOSSLESS: the tree is clean AND the current HEAD's
    # commits are all already on origin/master (nothing to abandon). This merely
    # changes which branch is checked out; it ships NOTHING new — it is NOT the
    # 2026-06-21 "push-if-ff" hardening advisor killed (that auto-shipped unverified
    # code). When recovery is unsafe we still abort, but now we ALERT instead of dying
    # silently.
    echo "preflight: not on master (on ${branch:-detached}) — attempting safe auto-recover"
    git fetch origin master --quiet 2>/dev/null || true
    if [ "$tree_clean" = "1" ] && git merge-base --is-ancestor HEAD origin/master 2>/dev/null; then
      # Preserve any diverged local-master SHA before -B clobbers it (matches the
      # recover/ convention used for stranded pending refs above). Cheap, reversible.
      if git rev-parse --verify --quiet master >/dev/null \
         && ! git merge-base --is-ancestor master origin/master 2>/dev/null; then
        git branch -f "recover/preflight-master-$(git rev-parse --short master)" master 2>/dev/null || true
      fi
      if git checkout -B master origin/master >/dev/null 2>&1; then
        echo "preflight: ✓ auto-recovered onto master (was ${branch:-detached}, now == origin/master)"
        tg_alert "nightly: auto-recovered from stray branch '${branch:-detached}' onto master (lossless — HEAD already on origin/master). A prior manual session left the repo off master; nightly self-healed and is proceeding."
        branch=master
      else
        echo "preflight: ABORT — auto-recover checkout failed (on ${branch:-detached})"
        tg_alert "⚠️ nightly ABORTED — repo on stray branch '${branch:-detached}', auto-recover checkout failed. Manual fix: cd repo && git checkout master."
        return 1
      fi
    else
      echo "preflight: ABORT — not on master (on ${branch:-detached}) and auto-recover unsafe (dirty tree or unpushed work)"
      # Retryable: a concurrent session usually pushes/switches back within hours.
      # run.sh sees this marker and schedules ONE timed re-run (2026-07-03 C4 —
      # this exact abort cost 3 of the last 15 nights their entire run).
      touch "$HOME/.cache/lexi-nightly/retry-requested" 2>/dev/null || true
      tg_alert "⚠️ nightly ABORTED — repo on stray branch '${branch:-detached}' with uncommitted or unpushed work; refusing to switch (would lose work). Will self-retry once in a few hours."
      return 1
    fi
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
    # Bounded retry: a mac waking at the 01:00 trigger may not have DNS/network up
    # yet — a single-shot fetch then hits "Could not resolve host: github.com" and
    # aborted the WHOLE run (the 2026-06-19 miss). Retry with backoff so a not-yet-
    # ready network self-heals; only abort after all attempts (a genuine outage).
    _pf_ft=0; _pf_max="${NIGHTLY_FETCH_RETRIES:-5}"; _pf_slp="${NIGHTLY_FETCH_RETRY_SLEEP:-15}"
    until git fetch origin master --quiet; do
      _pf_ft=$((_pf_ft+1))
      if [ "$_pf_ft" -ge "$_pf_max" ]; then
        echo "preflight: fetch failed after $_pf_max attempts"; return 1
      fi
      echo "preflight: fetch attempt $_pf_ft failed (network not ready?) — retrying in ${_pf_slp}s"
      sleep "$_pf_slp"
    done
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
