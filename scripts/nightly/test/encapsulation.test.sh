#!/bin/bash
# Test for the ENCAPSULATION guarantee: the nightly only ever stages / reverts
# files its OWN lanes authored. It never touches the founder's WIP or a
# concurrent session's edits — including files that were CLEAN when the run
# started but get edited by a human *during* the run.
#
# This closes the "KNOWN RESIDUAL" documented in lib/wip-revert.sh: the old
# denylist (revert "everything dirty except the run-start protect list") could
# not tell the nightly's own output from concurrent human work, so a mid-run
# edit got reverted / swept. The allowlist (revert_authored + authored-only
# staging) fixes that because attribution is EXPLICIT, not inferred.
#
# Run: bash scripts/nightly/test/encapsulation.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/wip-revert.sh"
# shellcheck disable=SC1091
source "$HERE/../lib/git-ship.sh"

PASS=0; FAIL=0
assert() { # name ; condition-string
  if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi
}

setup() {
  PROJECT_DIR=$(mktemp -d -t encaps.XXXXXX)
  export PROJECT_DIR
  ( cd "$PROJECT_DIR"
    git -c init.defaultBranch=master init -q
    git config user.email t@t; git config user.name tester
    mkdir -p src docs
    printf 'committed v1\n' > src/lane.ts
    printf 'committed v1\n' > src/founder.ts
    printf 'doc base\n'     > docs/keep.md
    git add -A; git commit -qm init )
}
teardown() { rm -rf "$PROJECT_DIR"; }

echo "── encapsulation: authored-only revert ──"

# 1) revert_authored restores ONLY the paths it is told the lane authored.
setup
SNAP=$(snapshot_pre_lane)
printf 'lane edit\n'    > "$PROJECT_DIR/src/lane.ts"
LIST=$(mktemp); echo "src/lane.ts" > "$LIST"
revert_authored "$SNAP" "$LIST"
assert "authored file is reverted to snapshot" \
  "[ \"\$(cat \"\$PROJECT_DIR/src/lane.ts\")\" = 'committed v1' ]"
rm -f "$LIST"; teardown

# 2) THE REGRESSION: a file edited DURING the run that the lane did NOT author
#    (so it's absent from the authored list) is NEVER reverted — even though it
#    was clean when the snapshot was taken. This is the exact case the old
#    denylist wiped.
setup
SNAP=$(snapshot_pre_lane)
printf 'lane edit\n'        > "$PROJECT_DIR/src/lane.ts"      # lane authored
printf 'CONCURRENT human\n' > "$PROJECT_DIR/src/founder.ts"   # human edits mid-run
LIST=$(mktemp); echo "src/lane.ts" > "$LIST"                  # only lane.ts authored
revert_authored "$SNAP" "$LIST"
assert "concurrent mid-run edit (not authored) is PRESERVED" \
  "[ \"\$(cat \"\$PROJECT_DIR/src/founder.ts\")\" = 'CONCURRENT human' ]"
assert "authored file still reverted alongside it" \
  "[ \"\$(cat \"\$PROJECT_DIR/src/lane.ts\")\" = 'committed v1' ]"
rm -f "$LIST"; teardown

# 3) revert_authored drops a NEW authored file (created by the lane), but never
#    a new file it did not author.
setup
SNAP=$(snapshot_pre_lane)
printf 'lane new\n'     > "$PROJECT_DIR/src/lane-new.ts"      # authored new file
printf 'human new\n'    > "$PROJECT_DIR/src/human-new.ts"     # concurrent new file
LIST=$(mktemp); echo "src/lane-new.ts" > "$LIST"
revert_authored "$SNAP" "$LIST"
assert "authored new file is removed" \
  "[ ! -e \"\$PROJECT_DIR/src/lane-new.ts\" ]"
assert "non-authored new file is preserved" \
  "[ -f \"\$PROJECT_DIR/src/human-new.ts\" ]"
rm -f "$LIST"; teardown

# 3b) THE 2026-05-23 REGRESSION: a file that a concurrent session CREATED +
#     COMMITTED during the run gets misattributed into the authored list. revert
#     must NOT delete it (it's committed work) and must leave NOTHING staged (a
#     staged deletion leaked into the nightly commit and deleted live files).
setup
SNAP=$(snapshot_pre_lane)                                   # taken before the file exists
printf 'concurrent feature\n' > "$PROJECT_DIR/src/concurrent.ts"
( cd "$PROJECT_DIR" && git add src/concurrent.ts && git commit -qm "concurrent session commit" )
LIST=$(mktemp); echo "src/concurrent.ts" > "$LIST"          # misattributed to the nightly
revert_authored "$SNAP" "$LIST"
assert "committed-mid-run file is NOT deleted" \
  "[ -f \"\$PROJECT_DIR/src/concurrent.ts\" ]"
assert "committed-mid-run file keeps its content" \
  "grep -q 'concurrent feature' \"\$PROJECT_DIR/src/concurrent.ts\""
assert "revert leaves NOTHING staged (no leaked deletion)" \
  "[ -z \"\$(cd \"\$PROJECT_DIR\" && git diff --cached --name-only)\" ]"
rm -f "$LIST"; teardown

# 3c) An authored file the nightly EDITED on top of a committed version is
#     restored to HEAD (drops the nightly edit) without deleting anything.
setup
SNAP=$(snapshot_pre_lane)
printf 'nightly broke this {(\n' > "$PROJECT_DIR/src/lane.ts"   # nightly edit on a committed file
LIST=$(mktemp); echo "src/lane.ts" > "$LIST"
revert_authored "$SNAP" "$LIST"
assert "nightly edit on committed file restored to HEAD" \
  "[ \"\$(cat \"\$PROJECT_DIR/src/lane.ts\")\" = 'committed v1' ]"
assert "restore-to-HEAD leaves nothing staged" \
  "[ -z \"\$(cd \"\$PROJECT_DIR\" && git diff --cached --name-only)\" ]"
rm -f "$LIST"; teardown

# 4) Empty / missing authored list → revert touches NOTHING.
setup
SNAP=$(snapshot_pre_lane)
printf 'lane edit\n' > "$PROJECT_DIR/src/lane.ts"
EMPTY=$(mktemp); : > "$EMPTY"
revert_authored "$SNAP" "$EMPTY"
assert "empty authored list reverts nothing" \
  "[ \"\$(cat \"\$PROJECT_DIR/src/lane.ts\")\" = 'lane edit' ]"
rm -f "$EMPTY"; teardown

echo "── encapsulation: nightly_dirty_paths attribution ──"

# 5) nightly_dirty_paths lists tracked-modified + staged + untracked, sorted.
setup
printf 'mod\n'  > "$PROJECT_DIR/src/lane.ts"          # tracked modified
printf 'new\n'  > "$PROJECT_DIR/src/untracked.ts"     # untracked
GOT=$( cd "$PROJECT_DIR" && nightly_dirty_paths | tr '\n' ',' )
assert "dirty paths include tracked-modified" "[[ \"$GOT\" == *'src/lane.ts'* ]]"
assert "dirty paths include untracked"        "[[ \"$GOT\" == *'src/untracked.ts'* ]]"
teardown

# 6) ATTRIBUTION: lane authored = (dirty after) - (dirty before). A file the
#    founder dirtied BEFORE the lane is not attributed to the lane.
setup
printf 'FOUNDER\n' > "$PROJECT_DIR/src/founder.ts"    # dirty BEFORE lane
BEFORE=$(mktemp); ( cd "$PROJECT_DIR" && nightly_dirty_paths ) > "$BEFORE"
printf 'lane\n'    > "$PROJECT_DIR/src/lane.ts"       # lane edits during its window
AFTER=$(mktemp);  ( cd "$PROJECT_DIR" && nightly_dirty_paths ) > "$AFTER"
AUTHORED=$(comm -13 "$BEFORE" "$AFTER")
assert "lane authored set contains the lane's file"   "[[ \"$AUTHORED\" == *'src/lane.ts'* ]]"
assert "lane authored set excludes founder pre-edit"  "[[ \"$AUTHORED\" != *'src/founder.ts'* ]]"
rm -f "$BEFORE" "$AFTER"; teardown

echo
echo "encapsulation: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
