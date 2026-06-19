#!/bin/bash
# git-ship.sh — commit + push the nightly's working-tree changes, with the
# divergence / generated-file hardening. Sourced by run.sh.
#
# THE GUARANTEE (proven by scripts/nightly/test/git-ship.test.sh):
#   ship_nightly_commit either succeeds (return 0, pushed or no-change) or fails
#   VISIBLY AND RECOVERABLY (return 1, Telegram alert). On unrecoverable failure
#   it SAVES the commit to refs/nightly-pending/$TODAY and RESETS master back to
#   origin/master — so the INVARIANT "local master == origin/master after every
#   run" always holds and the next run's preflight can NEVER be blocked by a
#   stranded commit (the 2026-05-27 brick). Founder WIP is preserved across the
#   reset. It NEVER silently dies and NEVER leaves a poisoned tree. A genuine
#   same-file conflict with concurrent origin work stops for a human (the work is
#   saved + a recovery command is texted) — that is correct, not a failure.
#
# Required env (run.sh sets these; the test sets them explicitly per scenario):
#   MSG_FILE   path to commit-message file (removed on commit / no-change)
#   START_SHA  baseline sha — used as NEW_SHA on the no-change path
#   NO_PUSH    "1" to commit but skip push
#   RUN_LOG    log file (verbose git output redirected here)
#   REPORT     run report markdown (Outcome line appended)
#   TODAY      date tag for alert text
# Required functions: log(), tg_alert()
# Sets globals (caller reads): NEW_SHA, NO_CHANGE_MODE
# Returns: 0 success or no-change; 1 unrecoverable (caller should exit 1).

# Tracked-but-GENERATED files a lane may incidentally regenerate. Committing
# them adds noise AND guarantees a rebase conflict whenever a concurrent commit
# regenerates the same file (this stranded the 2026-05-20 push). They are never
# an intended lane change, so we drop them from every autonomous commit.
# Keep this list to files that are (a) tracked, (b) machine-generated, (c) never
# a deliberate nightly change. NOT perf-baseline.json (intentional lane-2 output)
# and NOT package-lock.json (a lane dep change is legitimate, if rare).
NIGHTLY_GENERATED_EXCLUDE=(
  "fe-next/scripts/translation-report.json"
  # next build rewrites tsconfig.json (reformats it + injects the build's
  # distDir type paths, e.g. .next-nightly/types). The gate build mutates it
  # every run; it is never a deliberate nightly change, so never commit it.
  "fe-next/tsconfig.json"
)

# Push local master to origin, retrying THROUGH a lost push window. The 2026-06-07
# race lost BOTH of the old code's two push attempts to a fast concurrent pusher
# (founder /commit-push landing the i18n commit mid-run), stranding the whole night
# to refs/nightly-pending. This loops: push; on reject re-fetch + rebase --autostash
# onto the NEW origin/master + push again, up to NIGHTLY_PUSH_RETRIES (default 5)
# with a short NIGHTLY_PUSH_RETRY_SLEEP (default 3s) between. Re-fetching every
# iteration means it wins as soon as it gets one clean window. Returns:
#   0  pushed
#   2  rebase hit a REAL conflict (rebase left in progress; caller's docs-resolve /
#      salvage handles it — same contract as the old inline rebase)
#   1  retries exhausted on pure rejects with no conflict (caller salvages)
_push_master_retrying() {
  local retries="${NIGHTLY_PUSH_RETRIES:-5}" slp="${NIGHTLY_PUSH_RETRY_SLEEP:-3}" t=0
  if git push --no-verify origin master >> "$RUN_LOG" 2>&1; then return 0; fi
  log "push rejected — fetch+rebase+retry loop (max $retries)"
  while [ "$t" -lt "$retries" ]; do
    t=$((t+1))
    git fetch origin master --quiet || { [ "$slp" -gt 0 ] && sleep "$slp"; continue; }
    # --autostash: the nightly runs on the founder's dirty WIP; plain rebase refuses
    # with "you have unstaged changes". autostash stashes tracked WIP, restores after.
    if ! git rebase --autostash origin/master >> "$RUN_LOG" 2>&1; then
      return 2   # genuine conflict — leave the rebase in progress for the caller
    fi
    if git push --no-verify origin master >> "$RUN_LOG" 2>&1; then
      log "pushed after rebase (attempt $t)"
      return 0
    fi
    log "push attempt $t lost the window — retrying"
    [ "$slp" -gt 0 ] && sleep "$slp"
  done
  return 1
}

ship_nightly_commit() {
  # Stage ONLY the paths the nightly's own lanes authored (the allowlist run.sh
  # built as per-lane (dirty after) − (dirty before)). NEVER `git add -A`: a
  # blanket stage sweeps the founder's concurrent WIP — including files dirtied
  # mid-run, which no run-start protect list can catch — into the autonomous
  # commit. Allowlist staging makes that structurally impossible.
  if [ -n "${NIGHTLY_AUTHORED:-}" ] && [ -s "$NIGHTLY_AUTHORED" ]; then
    # Clear the index FIRST so the commit contains EXACTLY the authored paths and
    # nothing a prior step left staged. revert_authored / a lane / a concurrent
    # git op can leave staged changes (e.g. a staged deletion) that would
    # otherwise ride into this commit — that is how the 2026-05-23 run committed
    # deletions of concurrent word-tower files. `git reset` only unstages; it
    # never touches the working tree.
    git reset -q 2>/dev/null || true
    local p
    while IFS= read -r p; do
      [ -z "$p" ] && continue
      git add -- "$p" 2>/dev/null || true   # stages modifications, additions, and deletions
    done < "$NIGHTLY_AUTHORED"
  else
    # No allowlist provided (e.g. an isolated unit test, or --only with no output).
    # Fall back to the legacy blanket stage; the protect-list unstage below still
    # guards run-start founder WIP. Production always exports NIGHTLY_AUTHORED.
    log "ship: NIGHTLY_AUTHORED unset/empty — falling back to git add -A (legacy)"
    git add -A
  fi

  # Drop volatile generated artifacts: unstage + restore working copy so the
  # NEXT run's preflight doesn't see a dirty tree. (All entries are tracked, so
  # `git checkout --` restores cleanly; an untracked entry would need git clean.)
  local f
  for f in "${NIGHTLY_GENERATED_EXCLUDE[@]}"; do
    if git diff --cached --name-only | grep -qx "$f"; then
      git reset -q HEAD -- "$f"
      git checkout -q -- "$f" 2>/dev/null || true
      log "excluded volatile $f from commit"
    fi
  done

  # Founder WIP exclusion: never commit files the founder had dirty when the run
  # STARTED — the autonomous loop must not sweep a human's concurrent work into its
  # commit (this is how a manual `git add` or `git add -A` quietly captures WIP).
  # run.sh records those paths at run start and passes the list via
  # NIGHTLY_WIP_PROTECT. UNSTAGE only (no `git checkout`): the founder's changes
  # stay on disk as uncommitted WIP, we just keep them out of the nightly commit.
  #
  # KNOWN RESIDUAL (same window as lib/wip-revert.sh): the protect list is the
  # founder's dirty set at run START. A file that was CLEAN at run start but the
  # founder dirties DURING the run (and leaves uncommitted) is not on the list and
  # WILL be swept into the commit. Closing that needs run-time attribution we don't
  # have. Pre-existing WIP — the dominant case — is fully protected.
  if [ -n "${NIGHTLY_WIP_PROTECT:-}" ] && [ -s "$NIGHTLY_WIP_PROTECT" ]; then
    local w
    while IFS= read -r w; do
      [ -z "$w" ] && continue
      if git diff --cached --name-only | grep -qxF -- "$w"; then
        git reset -q HEAD -- "$w"
        log "excluded founder WIP $w from commit"
      fi
    done < "$NIGHTLY_WIP_PROTECT"
  fi

  # Nothing of substance left → treat as a no-change night (no commit, no push).
  if git diff --cached --quiet; then
    log "nothing to commit after excluding generated artifacts — treating as no-change"
    echo -e "\n**Outcome:** no shippable changes (lanes touched only volatile generated files)." >> "$REPORT"
    NEW_SHA="$START_SHA"
    NO_CHANGE_MODE=1
    rm -f "$MSG_FILE"
    return 0
  fi

  git commit -F "$MSG_FILE" >> "$RUN_LOG" 2>&1 || {
    log "commit failed (likely pre-commit hook). See log."
    tg_alert "nightly $TODAY: commit failed — pre-commit hook? See \`$RUN_LOG\`."
    return 1
  }
  NEW_SHA=$(git rev-parse HEAD)
  log "committed $NEW_SHA"
  rm -f "$MSG_FILE"

  if [ "${NO_PUSH:-0}" = "1" ]; then
    log "--no-push — skipping push (will still compose + send summary)"
    echo -e "\n**Outcome:** committed \`$NEW_SHA\` locally (not pushed)." >> "$REPORT"
    return 0
  fi

  # Isolated ship: the founder ran the nightly on top of their own unpushed local
  # commit(s). A plain `git push origin master` would publish those commits too —
  # the opposite of "run on my tree but don't touch/publish my work". Instead ship
  # ONLY this commit's diff onto a fresh origin/master via a throwaway worktree,
  # then drop it from local so the founder's HEAD + WIP stay byte-identical.
  # preflight sets NIGHTLY_ISOLATED_SHIP=1 when it detects an unpushed non-docs
  # commit (replacing the old hard abort).
  if [ "${NIGHTLY_ISOLATED_SHIP:-0}" = "1" ]; then
    _ship_isolated "$NEW_SHA"
    return $?
  fi

  log "pushing master..."
  # --no-verify (inside _push_master_retrying): the run reaches ship ONLY after the
  # isolated gate already ran lint+tsc+build+test on (clean HEAD + authored files) —
  # the pre-push hook (.husky/pre-push) would re-run lint+`vitest --changed`
  # redundantly: slow, racy with a concurrent writer's index, flaky via vitest's
  # fsModuleCache (killed a manual push at exit 144, 2026-06-05). The gate is
  # authoritative for automated pushes. (Interactive pushes still run it.)
  #
  # The push goes through a bounded fetch+rebase+retry LOOP, not a single retry: the
  # 2026-06-07 run lost the push window to a fast concurrent pusher TWICE and the old
  # two-attempt code gave up, stranding the whole night to refs/nightly-pending.
  local _pr; _push_master_retrying; _pr=$?
  if [ "$_pr" = 0 ]; then
    NEW_SHA=$(git rev-parse HEAD)
    log "pushed $NEW_SHA"
    echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\`" >> "$REPORT"
    return 0
  fi
  # _pr=2 → rebase stopped on a conflict (handled by the docs-resolve / salvage
  # blocks below, which read the in-progress rebase's unmerged paths).
  # _pr=1 → retries exhausted on pure rejects (no conflict) → falls straight to salvage.

  # The rebase (or its push) failed. If it stopped on a conflict confined ENTIRELY
  # to docs/ — the loop's own machine-authored output (reports/ideas/loop-improvements,
  # never human-contended source) — auto-resolve in favour of the nightly's fresh
  # version and continue. This is the SAME `^docs/` trust boundary preflight uses for
  # its docs-only auto-rebase, and it stops a trivial docs collision (e.g. a prior
  # stranded report push) from wedging the whole loop. ANY non-docs conflict (real
  # hand-written code) falls through to abort+alert — that correctly stops for a human.
  local conflicted non_docs_conflict cf
  conflicted=$(git diff --name-only --diff-filter=U 2>/dev/null)
  if [ -n "$conflicted" ]; then
    non_docs_conflict=$(printf '%s\n' "$conflicted" | grep -vE '^docs/' || true)
    if [ -z "$non_docs_conflict" ]; then
      log "rebase conflict confined to docs/ — auto-resolving with nightly version"
      # During a rebase, --theirs is the commit being REPLAYED (our nightly commit),
      # not origin. So --theirs keeps the nightly's fresh docs. (Rebase inverts the
      # intuitive ours/theirs — origin is "ours"/HEAD here.)
      while IFS= read -r cf; do
        [ -n "$cf" ] && git checkout --theirs -- "$cf" 2>/dev/null && git add -- "$cf" 2>/dev/null
      done <<< "$conflicted"
      if git rebase --continue >> "$RUN_LOG" 2>&1; then
        # Re-use the retry loop for the resolved commit's push too — a concurrent
        # pusher can still win this window. _pr=2 (another conflict) or 1 (exhausted)
        # both fall through to the salvage block below.
        _push_master_retrying; _pr=$?
        if [ "$_pr" = 0 ]; then
          NEW_SHA=$(git rev-parse HEAD)
          log "pushed after docs-only auto-resolve $NEW_SHA"
          echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\` (auto-resolved docs/ conflict, rebased onto origin)" >> "$REPORT"
          return 0
        fi
      fi
      log "docs-only auto-resolve unexpectedly failed — falling through to abort"
    fi
  fi

  # Genuine conflict (origin and a lane edited the same source file), or the
  # rebased push otherwise failed. Leaving the commit on local master STRANDS it:
  # the next run's preflight aborts on any unpushed non-docs commit, so a single
  # conflict would BRICK every subsequent night until a human intervened (the
  # 2026-05-27 brick — 05-28 only ran because the founder cleared it by hand).
  #
  # Instead we hold the INVARIANT "local master == origin/master after every run":
  #   1. save the commit to refs/nightly-pending/$TODAY so it is never lost,
  #   2. reset master back to origin/master so preflight can never be blocked,
  #   3. preserve any founder WIP across the reset (stash → reset → pop).
  # We do NOT auto-resurrect the ref later: a non-docs conflict means a human
  # edited the same source, and silently auto-merging concurrent human work is
  # unsafe. The ref + the texted cherry-pick command make recovery a 30s human op.
  # Backtick-wrap paths: tg uses parse_mode=Markdown and repo paths often carry
  # `_` (__tests__, snake_case) which would 400 the send and DROP the alert.
  local conflict
  conflict=$(git diff --name-only --diff-filter=U 2>/dev/null | head -3 | tr '\n' ' ')
  git rebase --abort 2>/dev/null || true
  local pending_ref="refs/nightly-pending/$TODAY" pending_sha
  pending_sha=$(git rev-parse HEAD)
  git update-ref "$pending_ref" "$pending_sha" 2>>"$RUN_LOG" || true
  # Reset master to origin/master without discarding founder WIP. A bare
  # `git reset --hard` would nuke uncommitted WIP, so stash it first (-u includes
  # untracked). On a pop conflict the stash ENTRY is kept (recoverable via
  # `git stash list`), so founder work is never lost.
  local _stashed=0
  if [ -n "$(git status --porcelain)" ]; then
    git stash push -u -q -m "nightly-wip-rescue-$TODAY" >>"$RUN_LOG" 2>&1 && _stashed=1
  fi
  git reset --hard origin/master >>"$RUN_LOG" 2>&1 || true
  if [ "$_stashed" = 1 ]; then
    git stash pop >>"$RUN_LOG" 2>&1 || log "stash pop conflicted — founder WIP kept in 'git stash list'"
  fi
  log "push blocked (conflict: ${conflict:-unknown}) — saved $pending_sha to $pending_ref, reset master to origin/master"
  tg_alert "nightly $TODAY: push blocked by conflict on \`${conflict:-unknown}\`. Work SAVED to \`$pending_ref\` (recover: \`git cherry-pick $pending_sha\`). master reset to origin so tomorrow runs clean. See \`$RUN_LOG\`."
  return 1
}

# Reset local master back to $1 (the founder's pre-nightly HEAD) WITHOUT losing the
# founder's uncommitted WIP. `git reset --hard` would nuke WIP, so stash (-u =
# include untracked) → reset → pop. A pop conflict keeps the stash entry (recover
# via `git stash list`), so founder work is never lost. Used by _ship_isolated to
# leave the founder's commit + working tree byte-identical after an isolated push.
_restore_local_to() {
  local base="$1" _stashed=0
  if [ -n "$(git status --porcelain)" ]; then
    git stash push -u -q -m "nightly-iso-rescue-$TODAY" >>"$RUN_LOG" 2>&1 && _stashed=1
  fi
  git reset --hard "$base" >>"$RUN_LOG" 2>&1 || true
  if [ "$_stashed" = 1 ]; then
    git stash pop >>"$RUN_LOG" 2>&1 || log "stash pop conflicted — founder WIP kept in 'git stash list'"
  fi
}

# Ship ONLY the nightly's own commit ($1) onto origin/master, never publishing the
# founder's unpushed commit(s) it was built on top of. Cherry-picks the commit's
# diff onto a fresh origin/master inside a throwaway worktree (same isolation
# pattern as preflight's docs-strand recovery) and pushes. On a cherry-pick/push
# conflict (concurrent origin work touched the same file) it strands the commit to
# refs/nightly-pending/$TODAY + alerts — never half-ships, never loses work.
#
# CRITICAL: this does NOT reset local master. Resetting mid-run would delete the
# nightly's just-committed files (the report especially) from the working tree, so
# the manager-summary (run.sh reads docs/nightly/reports/$TODAY.md from DISK) and
# the residual ship would operate on a stubbed report. Local stays advanced
# (founder + nightly commit) through the whole run; run.sh calls
# finalize_isolated_ship ONCE at end-of-run to collapse back to the founder base
# with WIP preserved. Sets NEW_SHA to the pushed origin head on success.
# Returns 0 / 1 like the caller.
_ship_isolated() {
  local nightly_sha="$1"

  log "isolated ship: founder has unpushed commits — shipping nightly diff only via worktree"
  # Bounded retry (same wake-time-network rationale as preflight): the worktree below
  # checks out origin/master, so a fetch that fails on a not-yet-ready network would
  # build the nightly diff on a stale ref. Non-fatal — fall through after retries
  # (the inner push loop re-fetches anyway) rather than abort the ship.
  _is_ft=0; _is_max="${NIGHTLY_FETCH_RETRIES:-5}"; _is_slp="${NIGHTLY_FETCH_RETRY_SLEEP:-15}"
  until git fetch origin master --quiet 2>>"$RUN_LOG"; do
    _is_ft=$((_is_ft+1))
    if [ "$_is_ft" -ge "$_is_max" ]; then log "isolated ship: fetch failed after $_is_max attempts — continuing on last-known origin/master"; break; fi
    log "isolated ship: fetch attempt $_is_ft failed — retrying in ${_is_slp}s"; sleep "$_is_slp"
  done

  local wtbase wt ok=0 conflict=""
  wtbase=$(mktemp -d -t nightly-iso.XXXXXX); wt="$wtbase/wt"
  if git worktree add --detach --quiet "$wt" origin/master 2>>"$RUN_LOG"; then
    # Bounded retry loop (same race fix as _push_master_retrying): each attempt
    # rebuilds the nightly diff on the FRESHEST origin/master (fetch → reset → cherry-
    # pick) then pushes, so a concurrent pusher winning one window doesn't strand the
    # night. A cherry-pick CONFLICT (origin touched a nightly file) is genuine → strand
    # immediately, no retry. A push REJECT is transient → retry on a fresh origin.
    local retries="${NIGHTLY_PUSH_RETRIES:-5}" slp="${NIGHTLY_PUSH_RETRY_SLEEP:-3}" t=0
    while : ; do
      git -C "$wt" fetch origin master --quiet 2>>"$RUN_LOG" || true
      git -C "$wt" reset --hard origin/master >>"$RUN_LOG" 2>&1 || true   # wipes any prior attempt's cherry-pick
      if ! git -C "$wt" cherry-pick "$nightly_sha" >>"$RUN_LOG" 2>&1; then
        conflict=$(git -C "$wt" diff --name-only --diff-filter=U 2>/dev/null | head -3 | tr '\n' ' ')
        git -C "$wt" cherry-pick --abort 2>/dev/null || true
        break   # genuine conflict — do not retry
      fi
      if git -C "$wt" push --no-verify origin HEAD:master >>"$RUN_LOG" 2>&1; then
        ok=1; NEW_SHA=$(git -C "$wt" rev-parse HEAD); break
      fi
      t=$((t+1)); [ "$t" -ge "$retries" ] && break
      log "isolated push attempt $t lost the window — retrying"
      [ "$slp" -gt 0 ] && sleep "$slp"
    done
  fi

  if [ "$ok" = 1 ]; then
    git worktree remove --force "$wt" 2>/dev/null || true
    rm -rf "$wtbase" 2>/dev/null || true
    log "isolated-shipped $NEW_SHA (local left advanced; founder base restored at end-of-run)"
    echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\` (isolated worktree — founder's unpushed work kept local)" >> "$REPORT"
    return 0
  fi

  # Cherry-pick conflict (concurrent origin work touched a nightly file) OR retries
  # exhausted on a relentless push race. Save the nightly commit for recovery, clean
  # up. Local stays advanced; end-of-run finalize collapses it back to the founder
  # base (the run is RUN_FAILED so no residual ship runs, but the summary still reads
  # a full report). $conflict was captured at the cherry-pick break (empty if the loop
  # ran out of push attempts with no file conflict).
  git worktree remove --force "$wt" 2>/dev/null || true
  rm -rf "$wtbase" 2>/dev/null || true
  local pending_ref="refs/nightly-pending/$TODAY"
  git update-ref "$pending_ref" "$nightly_sha" 2>>"$RUN_LOG" || true
  log "isolated ship blocked (conflict: ${conflict:-unknown}) — saved $nightly_sha to $pending_ref; local restored to founder base at end-of-run"
  tg_alert "nightly $TODAY: isolated push blocked by conflict on \`${conflict:-unknown}\`. Work SAVED to \`$pending_ref\` (recover: \`git cherry-pick $nightly_sha\`). Founder's local commit + WIP left untouched. See \`$RUN_LOG\`."
  return 1
}

# End-of-run collapse for an isolated-ship run: reset local master back to the
# founder's pre-run HEAD (captured by preflight as NIGHTLY_FOUNDER_BASE), dropping
# the nightly commit(s) that were already pushed to origin via worktree, with the
# founder's WIP preserved. Called ONCE by run.sh after the manager-summary and the
# residual ship — so every downstream step ran on a tree that still held the
# nightly's files, and only the FINAL local state honors "don't touch my tree".
# No-op unless this was an isolated run with a valid base. Skips --no-push (the
# local commit is intentionally kept for inspection then).
finalize_isolated_ship() {
  [ "${NIGHTLY_ISOLATED_SHIP:-0}" = "1" ] || return 0
  [ "${NO_PUSH:-0}" = "1" ] && { log "isolated finalize: --no-push — keeping local commit, not restoring"; return 0; }
  local base="${NIGHTLY_FOUNDER_BASE:-}"
  [ -n "$base" ] || { log "isolated finalize: NIGHTLY_FOUNDER_BASE unset — leaving local as-is"; return 0; }
  git rev-parse --verify "${base}^{commit}" >/dev/null 2>&1 \
    || { log "isolated finalize: base $base invalid — leaving local as-is"; return 0; }
  [ "$(git rev-parse HEAD)" = "$(git rev-parse "$base")" ] && return 0   # already at base
  log "isolated finalize: restoring local master to founder base $base (commit + WIP byte-identical)"
  _restore_local_to "$base"
}
