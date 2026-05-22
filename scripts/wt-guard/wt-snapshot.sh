#!/bin/bash
# wt-snapshot.sh — continuous working-tree safety net.
#
# WHY: this repo is frequently driven by MULTIPLE concurrent
# `claude --dangerously-skip-permissions` agents sharing ONE working tree. They
# independently stage / commit / `git reset --hard` / `git checkout` / `git
# stash`. Git has no pre-reset or pre-checkout hook, so nothing can intercept an
# ad-hoc `git reset --hard HEAD` run by another agent — it silently discards
# whatever UNCOMMITTED edits the others had in flight (this wiped a live session
# on 2026-05-22). Committed work is safe; uncommitted work is not.
#
# This script takes a cheap, hardlinked (Time-Machine-style) snapshot of all
# uncommitted source whenever there's dirty state. launchd fires it every few
# minutes. Recover with scripts/wt-guard/wt-restore.sh.
#
# It is PURELY ADDITIVE: it never touches the working tree or git. The real
# structural fix is to give each concurrent agent its own `git worktree`; this
# is the seatbelt for when that doesn't happen.

set -uo pipefail

REPO="${WT_GUARD_REPO:-/Users/ohadfisher/git/boggle-new}"
DEST="${WT_GUARD_DEST:-$HOME/.cache/lexi-wt-backups}"
KEEP="${WT_GUARD_KEEP:-120}"   # ~6h of history at a 3-min cadence; hardlinked, ~free

cd "$REPO" 2>/dev/null || exit 0

# Only snapshot when there's uncommitted work worth saving (cheap fast-path).
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
[ -z "$(git status --porcelain 2>/dev/null | head -1)" ] && exit 0

ts="$(date +%Y%m%d-%H%M%S)"
prev="$(ls -1dt "$DEST"/2*/ 2>/dev/null | head -1)"
mkdir -p "$DEST/$ts"

# Record the HEAD sha + the dirty file list alongside the snapshot, so a
# restore knows exactly what baseline these edits sat on top of.
git rev-parse HEAD > "$DEST/$ts/.HEAD" 2>/dev/null || true
git status --porcelain > "$DEST/$ts/.dirty" 2>/dev/null || true

# Hardlink unchanged files against the previous snapshot → each snapshot only
# costs the bytes that actually changed.
rsync -a ${prev:+--link-dest="$prev"} \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' --exclude='.next-nightly' \
  --exclude='.turbo' \
  --exclude='.claude/worktrees' \
  --exclude='dist' --exclude='build' --exclude='coverage' \
  "$REPO/" "$DEST/$ts/tree/" 2>/dev/null || true

# Rotate: keep the newest $KEEP snapshots.
ls -1dt "$DEST"/2*/ 2>/dev/null | tail -n +"$((KEEP + 1))" | xargs -r rm -rf 2>/dev/null || true
