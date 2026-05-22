#!/bin/bash
# git-ship.sh — commit + push the nightly's working-tree changes, with the
# divergence / generated-file hardening. Sourced by run.sh.
#
# THE GUARANTEE (proven by scripts/nightly/test/git-ship.test.sh):
#   ship_nightly_commit either succeeds (return 0, pushed or no-change) or fails
#   VISIBLY AND RECOVERABLY (return 1, Telegram alert, local commit preserved,
#   working tree CLEAN so the next run's preflight passes). It NEVER silently
#   dies and NEVER leaves a poisoned tree. A genuine same-file conflict with
#   concurrent origin work stops for a human — that is correct, not a failure.
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

ship_nightly_commit() {
  git add -A

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

  log "pushing master..."
  if git push origin master >> "$RUN_LOG" 2>&1; then
    log "pushed $NEW_SHA"
    echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\`" >> "$REPORT"
    return 0
  fi

  # Push rejected — almost always origin advanced during the long run. Our commit
  # is already gate-vetted, so rebase onto origin and retry once. With generated
  # files excluded above, the common case rebases clean.
  log "push rejected — fetch+rebase onto origin/master, retry once"
  if git fetch origin master --quiet \
     && git rebase origin/master >> "$RUN_LOG" 2>&1 \
     && git push origin master >> "$RUN_LOG" 2>&1; then
    NEW_SHA=$(git rev-parse HEAD)
    log "pushed after rebase $NEW_SHA"
    echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\` (rebased onto origin first)" >> "$REPORT"
    return 0
  fi

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
        [ -n "$cf" ] && git checkout --theirs -- "$cf" 2>/dev/null
      done <<< "$conflicted"
      git add -A
      if git rebase --continue >> "$RUN_LOG" 2>&1 \
         && git push origin master >> "$RUN_LOG" 2>&1; then
        NEW_SHA=$(git rev-parse HEAD)
        log "pushed after docs-only auto-resolve $NEW_SHA"
        echo -e "\n**Outcome:** ✅ shipped \`$NEW_SHA\` (auto-resolved docs/ conflict, rebased onto origin)" >> "$REPORT"
        return 0
      fi
      log "docs-only auto-resolve unexpectedly failed — falling through to abort"
    fi
  fi

  # Genuine conflict (origin and a lane edited the same source file). Abort the
  # rebase to restore a clean tree + the intact local commit, then fail visibly.
  # Backtick-wrap the path: tg uses parse_mode=Markdown and most repo paths have
  # `_` (__tests__, snake_case) which would 400 the send and DROP the alert.
  local conflict
  conflict=$(git diff --name-only --diff-filter=U 2>/dev/null | head -3 | tr '\n' ' ')
  git rebase --abort 2>/dev/null || true
  log "push failed after rebase retry (conflict: ${conflict:-unknown})"
  tg_alert "nightly $TODAY: push failed — rebase conflicted on \`${conflict:-unknown}\`. Local commit \`$NEW_SHA\` kept. See \`$RUN_LOG\`."
  return 1
}
