#!/bin/bash
# Test for restore-salvaged-code.sh — proves dropped lane code is recovered by a per-file
# 3-way merge against the run's `baseline sha=`, NEVER a blind copy that reverts master
# work (the 2026-09-19 pre-#1034 WordWheelChallenge.tsx clobber, 3 nights running), and
# that LANDED backup dirs are skipped.
#
# Run: bash scripts/nightly/test/restore-salvaged-code.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/../restore-salvaged-code.sh"

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

LOGD=$(mktemp -d -t salvlog.XXXXXX)
REPO=$(mktemp -d -t salvrepo.XXXXXX)
run() { LEXI_NIGHTLY_LOG_DIR="$LOGD" LEXI_REPO_DIR="$REPO" bash "$SCRIPT" "$@" > "$LOGD/out.txt" 2>&1; }

# --- repo at BASE: a.ts (5 lines), w.tsx, gone.ts ---------------------------------
( cd "$REPO"
  git -c init.defaultBranch=master init -q
  git config user.email t@t; git config user.name tester
  mkdir -p fe-next/utils fe-next/components
  printf 'l1\nl2\nl3\nl4\nl5\n' > fe-next/utils/a.ts
  printf 'OLD_WHEEL\n' > fe-next/components/w.tsx
  printf 'gone\n' > fe-next/utils/gone.ts
  git add -A; git commit -qm base )
BASE=$(git -C "$REPO" rev-parse HEAD)

# The lane (at BASE) edited a.ts line 1, w.tsx, gone.ts, and created new.ts.
mkdir -p "$LOGD/salvaged-code-T1/fe-next/utils" "$LOGD/salvaged-code-T1/fe-next/components"
printf 'LANE1\nl2\nl3\nl4\nl5\n' > "$LOGD/salvaged-code-T1/fe-next/utils/a.ts"
printf 'LANE_WHEEL\n'            > "$LOGD/salvaged-code-T1/fe-next/components/w.tsx"
printf 'gone-lane\n'             > "$LOGD/salvaged-code-T1/fe-next/utils/gone.ts"
printf 'NEW\n'                   > "$LOGD/salvaged-code-T1/fe-next/utils/new.ts"
printf '[01:04:56] baseline sha=%s\n' "$BASE" > "$LOGD/run-T1.log"

# Master moved on after the run: a.ts line 5 edited (non-overlapping), w.tsx rewritten
# (the #1034 case — overlapping), gone.ts deleted.
( cd "$REPO"
  printf 'l1\nl2\nl3\nl4\nMASTER5\n' > fe-next/utils/a.ts
  printf 'MASTER_1034_WHEEL\n' > fe-next/components/w.tsx
  git rm -q fe-next/utils/gone.ts
  git commit -qam master-moved )

echo "── restore-salvaged-code: 3-way merge, not blind copy ──"
run T1; rc=$?
assert "exits 3 when some files are skipped" "[ $rc -eq 3 ]"
assert "non-overlapping edit MERGES (lane line 1 + master line 5 both kept)" \
  "[ \"\$(sed -n 1p \"$REPO/fe-next/utils/a.ts\")\" = LANE1 ] && [ \"\$(sed -n 5p \"$REPO/fe-next/utils/a.ts\")\" = MASTER5 ]"
assert "CONFLICTING file is NOT clobbered (master #1034 version survives)" \
  "[ \"\$(cat \"$REPO/fe-next/components/w.tsx\")\" = MASTER_1034_WHEEL ]"
assert "conflict is reported" "grep -q 'fe-next/components/w.tsx — CONFLICT' \"$LOGD/out.txt\""
assert "no conflict markers written into the tree" "! grep -q '<<<<<<<' \"$REPO/fe-next/components/w.tsx\""
assert "file deleted on master is NOT resurrected" "[ ! -e \"$REPO/fe-next/utils/gone.ts\" ]"
assert "deleted-on-master is reported" "grep -q 'gone.ts — DELETED' \"$LOGD/out.txt\""
assert "lane-created file is restored" "[ \"\$(cat \"$REPO/fe-next/utils/new.ts\")\" = NEW ]"

echo "── restore-salvaged-code: LANDED marker ──"
git -C "$REPO" checkout -q -- . ; rm -f "$REPO/fe-next/utils/new.ts"
touch "$LOGD/salvaged-code-T1/LANDED"
run T1; rc=$?
assert "LANDED dir exits 0" "[ $rc -eq 0 ]"
assert "LANDED dir restores nothing" "[ -z \"\$(git -C \"$REPO\" status --porcelain)\" ]"
assert "LANDED dir says so" "grep -q 'LANDED marker' \"$LOGD/out.txt\""

sleep 1
mkdir -p "$LOGD/salvaged-code-T2/fe-next/utils"
printf 'T2NEW\n' > "$LOGD/salvaged-code-T2/fe-next/utils/t2.ts"
printf 'baseline sha=%s\n' "$BASE" > "$LOGD/run-T2.log"
touch "$LOGD/salvaged-code-T2/LANDED"
run latest; rc=$?
assert "latest SKIPS a newer LANDED dir and resolves to the newest un-LANDED one (none → exit 1)" "[ $rc -eq 1 ]"
rm -f "$LOGD/salvaged-code-T1/LANDED"
run latest
assert "latest resolves to T1 once T2 is LANDED" "grep -q 'salvaged-code-T1' \"$LOGD/out.txt\""
assert "latest never restores the LANDED T2 file" "[ ! -e \"$REPO/fe-next/utils/t2.ts\" ]"
git -C "$REPO" checkout -q -- . ; rm -f "$REPO/fe-next/utils/new.ts"

echo "── restore-salvaged-code: refuses without a baseline sha ──"
mkdir -p "$LOGD/salvaged-code-T3/fe-next/utils"; printf 'X\n' > "$LOGD/salvaged-code-T3/fe-next/utils/a.ts"
run T3; rc=$?
assert "missing run log → exit 2 (never a blind copy)" "[ $rc -eq 2 ]"
assert "missing run log → tree untouched" "[ -z \"\$(git -C \"$REPO\" status --porcelain)\" ]"

echo "── restore-salvaged-code: unknown tag ──"
run NOPE; rc=$?
assert "unknown tag exits 1" "[ $rc -eq 1 ]"

rm -rf "$LOGD" "$REPO"
echo
if [ "$FAIL" -eq 0 ]; then echo "restore-salvaged-code: $PASS passed, 0 failed"; exit 0
else echo "restore-salvaged-code: $PASS passed, $FAIL FAILED"; exit 1; fi
