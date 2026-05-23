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

# nightly_dirty_paths → one line per currently-dirty path (tracked unstaged +
# staged + untracked, sorted/unique). Diffing this set before vs after a lane
# attributes EXACTLY which paths the lane authored, so every later stage/revert
# can be scoped to the nightly's own work — never the founder's WIP or a
# concurrent session's edits.
nightly_dirty_paths() {
  ( cd "$PROJECT_DIR" 2>/dev/null \
    && { git diff --name-only; \
         git diff --cached --name-only; \
         git ls-files --others --exclude-standard; } | sort -u )
}

# revert_authored <snapshot_dir> <authored_list_file>
# The ALLOWLIST counterpart to revert_to_pre_lane. Revert ONLY the paths listed
# in <authored_list_file> — the nightly's own lane-authored changes — restoring
# each from the snapshot, or dropping it if the lane newly added it. Any path NOT
# on the list (founder WIP, a human's concurrent edit, anything the nightly did
# not author) is NEVER touched, even if it is dirty and even if it was clean when
# the snapshot was taken. This closes the concurrent-edit window entirely:
# attribution is EXPLICIT, not inferred from "dirty minus a stale protect list".
# Does NOT consume the snapshot dir (caller may revert several lists against it,
# then clean up) — unlike revert_to_pre_lane.
revert_authored() {
  local snap="$1" list="$2" rel
  [ -n "$snap" ] && [ -d "$snap" ] || return 0
  [ -n "$list" ] && [ -s "$list" ] || return 0
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    if git -C "$PROJECT_DIR" cat-file -e "HEAD:$rel" 2>/dev/null; then
      # Path is committed in HEAD. Restore the working copy to HEAD — this drops
      # the nightly's uncommitted edit but is NEVER older than HEAD, so it can't
      # stomp a concurrent session's COMMITTED work, and (crucially) it does NOT
      # `git rm` — so no staged deletion can leak into the nightly's commit. This
      # is the fix for the 2026-05-23 run that committed deletions of concurrent
      # word-tower files it had misattributed as lane-authored.
      git -C "$PROJECT_DIR" checkout -q HEAD -- "$rel" 2>/dev/null || true
    elif [ -e "$snap/$rel" ]; then
      # Untracked at run start (in the snapshot, not in HEAD) → restore snapshot copy.
      mkdir -p "$PROJECT_DIR/$(dirname "$rel")" 2>/dev/null || true
      cp -p "$snap/$rel" "$PROJECT_DIR/$rel" 2>/dev/null || true
    else
      # Appeared during the run and is NOT committed → a genuinely new untracked
      # file. Remove it from the WORKING TREE only (never `git rm`, never staged).
      # If a concurrent session created+committed it mid-run it would be tracked
      # in HEAD and handled above — so this only ever drops the nightly's own
      # uncommitted new file.
      rm -f "$PROJECT_DIR/$rel" 2>/dev/null || true
    fi
  done < "$list"
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
