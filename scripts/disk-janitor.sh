#!/bin/bash
# disk-janitor.sh — reclaim disk from stale dev workspaces. Standalone + idempotent.
#
# WHY: this repo is driven by many interactive + agent Claude sessions. Two sources
# silently accrete multi-GB cruft that nothing sweeps:
#   1. Alternate Next.js build dirs (fe-next/.next-clean, .next-verify*, etc.) left
#      behind by ad-hoc `NEXT_BUILD_DIR=... npm run build` verify runs that don't
#      clobber the live `.next`. Each is 1-7 GB. (2026-06-20: 7 GB across 3 dirs.)
#   2. git worktrees under .claude/worktrees/ from `isolation: worktree` / EnterWorktree
#      sessions that ended without ExitWorktree. Each is a FULL second checkout
#      (own node_modules) → 1-4 GB. (2026-06-20: 8 worktrees, 13 GB.) These also
#      inflate fseventsd's watched-path set, growing its RAM over a long uptime.
#
# It is deliberately NOT wired into the nightly loop (which races branches and wipes
# uncommitted work) — run it manually or via the launchd plist (weekly). It is
# conservative by construction:
#   - NEVER touches the live `.next` or the nightly-managed `.next-nightly`.
#   - Only removes alt build dirs / worktrees OLDER than DISK_JANITOR_MIN_AGE_DAYS.
#   - NEVER removes a worktree that is dirty, or that a live process has cwd inside.
#   - Worktree removal keeps the branch ref → committed work is always recoverable.
#
# Env overrides (also used by the test harness):
#   DISK_JANITOR_REPO          repo root (default below)
#   DISK_JANITOR_MIN_AGE_DAYS  age floor in days (default 3)
#   DISK_JANITOR_DRY_RUN=1     print WOULD-REMOVE-* lines, change nothing

set -uo pipefail

REPO="${DISK_JANITOR_REPO:-/Users/ohadfisher/git/boggle-new}"
MIN_AGE_DAYS="${DISK_JANITOR_MIN_AGE_DAYS:-3}"
DRY="${DISK_JANITOR_DRY_RUN:-0}"

cd "$REPO" 2>/dev/null || { echo "disk-janitor: repo not found: $REPO"; exit 1; }

log() { echo "disk-janitor: $*"; }

# True if $1 (a dir) was modified more than MIN_AGE_DAYS ago. `find -mtime +N` is the
# portable age test; -prune keeps it from descending into the (huge) dir.
_older_than_min_age() {
  [ -n "$(find "$1" -maxdepth 0 -mtime +"$MIN_AGE_DAYS" -print 2>/dev/null)" ]
}

# True if any running process has its cwd inside $1 (an in-use worktree).
_path_in_use() {
  local p pid cw
  for pid in $(ps -axo pid= 2>/dev/null); do
    cw="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | sed 's/^n//')"
    case "$cw" in "$1"|"$1"/*) return 0;; esac
  done
  return 1
}

# --- 1. stale alternate .next-* build dirs -------------------------------
# Match fe-next/.next-* but EXCLUDE the live `.next` (no suffix) and the
# nightly-managed `.next-nightly` (run.sh/gate-isolated.sh rm -rf it themselves).
janitor_next_dirs() {
  local d base
  for d in "$REPO"/fe-next/.next-*; do
    [ -d "$d" ] || continue
    base="$(basename "$d")"
    case "$base" in .next|.next-nightly) continue;; esac
    _older_than_min_age "$d" || continue
    if [ "$DRY" = "1" ]; then
      echo "WOULD-REMOVE-NEXT $d"
    else
      log "removing stale build dir $d"
      rm -rf "$d"
    fi
  done
}

# --- 2. stale .claude/worktrees/* ----------------------------------------
janitor_worktrees() {
  local wt name dirty
  [ -d "$REPO/.claude/worktrees" ] || return 0
  for wt in "$REPO"/.claude/worktrees/*/; do
    [ -d "$wt" ] || continue
    wt="${wt%/}"
    name="$(basename "$wt")"
    _older_than_min_age "$wt" || { [ "$DRY" = "1" ] && true; continue; }
    # Protect uncommitted work — never remove a dirty worktree.
    dirty="$(git -C "$wt" status --porcelain 2>/dev/null | head -1)"
    if [ -n "$dirty" ]; then
      [ "$DRY" = "1" ] && echo "SKIP-DIRTY $wt" || log "skip (dirty) $wt"
      continue
    fi
    # Protect a worktree an interactive session is actively sitting in.
    if _path_in_use "$wt"; then
      [ "$DRY" = "1" ] && echo "SKIP-IN-USE $wt" || log "skip (in use) $wt"
      continue
    fi
    if [ "$DRY" = "1" ]; then
      echo "WOULD-REMOVE-WORKTREE $wt"
    else
      log "removing stale worktree $wt (branch ref kept — commits recoverable)"
      git -C "$REPO" worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
    fi
  done
  [ "$DRY" = "1" ] || git -C "$REPO" worktree prune 2>/dev/null || true
}

# --- 3. prune fully-merged worktree-* branches ---------------------------
# Branch refs from removed worktrees linger forever. Drop only those whose tip is
# already an ancestor of origin/master (no unmerged commits lost).
janitor_merged_branches() {
  local b
  git -C "$REPO" fetch origin master --quiet 2>/dev/null || true
  for b in $(git -C "$REPO" for-each-ref --format='%(refname:short)' 'refs/heads/worktree-*' 2>/dev/null); do
    if git -C "$REPO" merge-base --is-ancestor "$b" origin/master 2>/dev/null; then
      if [ "$DRY" = "1" ]; then
        echo "WOULD-DELETE-BRANCH $b"
      else
        git -C "$REPO" branch -D "$b" >/dev/null 2>&1 && log "pruned merged branch $b"
      fi
    fi
  done
}

before=""
[ "$DRY" = "1" ] || before="$(du -sm "$REPO" 2>/dev/null | cut -f1)"

janitor_next_dirs
janitor_worktrees
janitor_merged_branches

if [ "$DRY" != "1" ] && [ -n "$before" ]; then
  after="$(du -sm "$REPO" 2>/dev/null | cut -f1)"
  log "done — repo ${before}MB → ${after}MB (freed $((before - after))MB)"
fi
