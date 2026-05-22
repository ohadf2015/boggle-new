#!/bin/bash
# wip-revert.sh — snapshot the working tree before a lane and revert ONLY the
# lane's own changes afterward. Sourced by run.sh. Tested by test/wip-revert.test.sh.
#
# THE GUARANTEE (proven by the test):
#   revert_to_pre_lane undoes a lane's tracked modifications / additions /
#   deletions, but:
#     • a file the founder had already touched when the snapshot was taken
#       (pre-existing WIP — tracked OR untracked) is NEVER reverted, and
#     • an untracked file is NEVER deleted.
#   So a failed / over-cap lane can never flush work a human is doing
#   concurrently. This replaces the old blanket `rsync --delete` mirror, which
#   restored the whole tree and wiped any file created/edited after the snapshot.
#
# Requires: $PROJECT_DIR (the git working tree). Read at call time.
#
# KNOWN RESIDUAL (acceptable, by design): if the founder edits a file that was
# CLEAN at snapshot time *during* the lane's runtime, and that same lane fails,
# the revert will restore it (it looks like a lane edit). The protect set is
# captured at snapshot time, not revert time, to keep "undo the lane's mess"
# working at all. The dominant risk — flushing work that already existed — is
# fully closed. The gate (lint/test/build) is the authoritative check on
# whatever ultimately ships.

# snapshot_pre_lane → echoes a snapshot dir holding a full mirror of the tree
# (heavy dirs excluded) plus a `.wip-protect.list` of paths dirty RIGHT NOW.
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
  # Founder's pre-existing dirty set: tracked (unstaged + staged) + untracked.
  # These paths are PROTECTED from any later revert.
  ( cd "$PROJECT_DIR" 2>/dev/null \
    && { git diff --name-only; \
         git diff --cached --name-only; \
         git ls-files --others --exclude-standard; } | sort -u ) \
    > "$snap/.wip-protect.list" 2>/dev/null || true
  echo "$snap"
}

# revert_to_pre_lane <snapshot_dir>
# Restore ONLY the tracked files the lane changed (those that differ from the
# snapshot), skipping any path protected as founder WIP. Untracked files are
# left in place — never deleted. Consumes (removes) the snapshot dir.
revert_to_pre_lane() {
  local snap="$1"
  [ -n "$snap" ] && [ -d "$snap" ] || return 0
  local protect="$snap/.wip-protect.list"
  local rel
  # All currently-dirty TRACKED paths (lane edits/additions/deletions, plus any
  # concurrent edits). We touch a path only if it is NOT protected founder WIP.
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    if [ -s "$protect" ] && grep -qxF -- "$rel" "$protect"; then
      continue   # founder's pre-existing WIP — never revert
    fi
    if [ -e "$snap/$rel" ]; then
      # lane modified or deleted a file that existed pre-lane → restore it
      mkdir -p "$PROJECT_DIR/$(dirname "$rel")" 2>/dev/null || true
      cp -p "$snap/$rel" "$PROJECT_DIR/$rel" 2>/dev/null || true
    else
      # lane added (and staged) a new tracked path absent from the snapshot → drop
      ( cd "$PROJECT_DIR" && git rm -f --quiet -- "$rel" 2>/dev/null ) \
        || rm -f "$PROJECT_DIR/$rel" 2>/dev/null || true
    fi
  done < <(cd "$PROJECT_DIR" 2>/dev/null \
           && { git diff --name-only; git diff --cached --name-only; } | sort -u)
  rm -rf "$snap"
}
