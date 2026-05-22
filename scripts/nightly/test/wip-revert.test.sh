#!/bin/bash
# Test for snapshot_pre_lane() + revert_to_pre_lane() — the WIP-protection
# primitive. Drives REAL git repos in tempdirs. Proves THE GUARANTEE:
#
#   A lane revert undoes ONLY the lane's own changes. It NEVER reverts a file the
#   founder had already touched when the snapshot was taken (pre-existing WIP),
#   and it NEVER deletes an untracked file. A concurrent human editor can lose
#   nothing they had in flight at snapshot time.
#
# Run: bash scripts/nightly/test/wip-revert.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/wip-revert.sh"

PASS=0; FAIL=0

assert() { # name ; condition-string
  if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi
}

setup() { # fresh repo with one committed tracked file
  PROJECT_DIR=$(mktemp -d -t wiprevert.XXXXXX)
  export PROJECT_DIR
  ( cd "$PROJECT_DIR"
    git -c init.defaultBranch=master init -q
    git config user.email t@t; git config user.name tester
    mkdir -p src docs
    printf 'committed v1\n' > src/tracked.ts
    printf 'doc base\n'     > docs/keep.md
    git add -A; git commit -qm init )
}

teardown() { rm -rf "$PROJECT_DIR"; }

echo "── wip-revert: lane changes reverted, founder WIP protected ──"

# 1) Lane modifies a tracked file that was CLEAN at snapshot → revert restores it.
setup
SNAP=$(snapshot_pre_lane)
printf 'lane edited this\n' > "$PROJECT_DIR/src/tracked.ts"
revert_to_pre_lane "$SNAP"
assert "lane edit to clean tracked file is reverted" \
  "[ \"\$(cat \"\$PROJECT_DIR/src/tracked.ts\")\" = 'committed v1' ]"
teardown

# 2) Founder had a tracked file DIRTY at snapshot → revert must NOT touch it.
setup
printf 'FOUNDER wip\n' > "$PROJECT_DIR/src/tracked.ts"   # dirty BEFORE snapshot
SNAP=$(snapshot_pre_lane)
revert_to_pre_lane "$SNAP"
assert "founder pre-existing dirty tracked file is preserved" \
  "[ \"\$(cat \"\$PROJECT_DIR/src/tracked.ts\")\" = 'FOUNDER wip' ]"
teardown

# 3) Lane creates an UNTRACKED file → revert must NOT delete it (non-destructive).
setup
SNAP=$(snapshot_pre_lane)
printf 'lane new file\n' > "$PROJECT_DIR/src/lane-new.ts"
revert_to_pre_lane "$SNAP"
assert "untracked file created during lane is NOT deleted" \
  "[ -f \"\$PROJECT_DIR/src/lane-new.ts\" ]"
teardown

# 4) Founder had an UNTRACKED file at snapshot → revert must NOT delete it.
setup
printf 'founder draft\n' > "$PROJECT_DIR/src/founder-draft.ts"  # untracked pre-snapshot
SNAP=$(snapshot_pre_lane)
revert_to_pre_lane "$SNAP"
assert "founder pre-existing untracked file is preserved" \
  "[ -f \"\$PROJECT_DIR/src/founder-draft.ts\" ]"
teardown

# 5) Lane DELETES a tracked file (clean at snapshot) → revert restores it.
setup
SNAP=$(snapshot_pre_lane)
rm "$PROJECT_DIR/docs/keep.md"
revert_to_pre_lane "$SNAP"
assert "lane-deleted tracked file is restored" \
  "[ -f \"\$PROJECT_DIR/docs/keep.md\" ]"
teardown

# 6) Mixed: founder dirties file A before snapshot, lane edits clean file B.
#    Revert restores B (lane's) but leaves A (founder's) exactly as founder left it.
setup
printf 'FOUNDER edit of A\n' > "$PROJECT_DIR/src/tracked.ts"   # A: founder WIP
SNAP=$(snapshot_pre_lane)
printf 'lane edit of B\n'    > "$PROJECT_DIR/docs/keep.md"     # B: lane edit
revert_to_pre_lane "$SNAP"
assert "mixed: founder file A untouched" \
  "[ \"\$(cat \"\$PROJECT_DIR/src/tracked.ts\")\" = 'FOUNDER edit of A' ]"
assert "mixed: lane file B reverted" \
  "[ \"\$(cat \"\$PROJECT_DIR/docs/keep.md\")\" = 'doc base' ]"
teardown

# 7) Snapshot tempdir is consumed (removed) by revert.
setup
SNAP=$(snapshot_pre_lane)
revert_to_pre_lane "$SNAP"
assert "snapshot dir is cleaned up after revert" "[ ! -d \"\$SNAP\" ]"
teardown

echo
echo "wip-revert: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
