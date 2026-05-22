#!/bin/bash
# Integration test for ship_nightly_commit() — drives REAL git repos in tempdirs
# with file:// remotes (never touches GitHub). Proves the push-recovery guarantee
# across the five scenarios that matter. Run: bash scripts/nightly/test/git-ship.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/git-ship.sh"

PASS=0; FAIL=0
ALERTS=""
log()       { :; }                      # silence verbose logging in tests
tg_alert()  { ALERTS+="$*"$'\n'; }      # capture alerts for assertions

# Shared env contract (per-scenario overrides below)
RUN_LOG=/dev/null
REPORT=/dev/null
TODAY=2026-01-01
NO_PUSH=0
DRY_RUN=0

assert() { # name ; condition-string
  if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi
}

setup() { # creates ORIGIN (bare) + LOCAL clone + SIB clone, all sharing init commit
  ROOT=$(mktemp -d -t shiptest.XXXXXX)
  ORIGIN="$ROOT/origin.git"; LOCAL="$ROOT/local"; SIB="$ROOT/sib"
  # Force master everywhere — the host's init.defaultBranch may be `main`.
  git -c init.defaultBranch=master init -q --bare "$ORIGIN"
  git -c init.defaultBranch=master clone -q "$ORIGIN" "$LOCAL" 2>/dev/null
  ( cd "$LOCAL"
    git config user.email t@t; git config user.name tester
    git symbolic-ref HEAD refs/heads/master    # unborn branch → master
    mkdir -p docs/nightly/reports fe-next/scripts fe-next/app
    echo base                       > base.txt
    echo '{"report":"base"}'        > fe-next/scripts/translation-report.json
    echo '{"compilerOptions":{}}'   > fe-next/tsconfig.json
    printf 'export const x = 1;\n'  > fe-next/app/page.tsx
    git add -A; git commit -qm init; git branch -M master; git push -q origin master )
  git -c init.defaultBranch=master clone -q "$ORIGIN" "$SIB" 2>/dev/null
  ( cd "$SIB"; git config user.email s@s; git config user.name sib; git checkout -q master )
  cd "$LOCAL"
  # reset per-scenario globals
  NEW_SHA=""; NO_CHANGE_MODE=0; ALERTS=""
  MSG_FILE=$(mktemp); echo "chore(nightly): autonomous improvement loop test" > "$MSG_FILE"
  START_SHA=$(git rev-parse HEAD)
}

# advance origin via the sibling clone: args are file=content pairs
advance_origin() {
  ( cd "$SIB"; git pull -q origin master
    for kv in "$@"; do f="${kv%%=*}"; c="${kv#*=}"; mkdir -p "$(dirname "$f")"; printf '%s\n' "$c" > "$f"; done
    git add -A; git commit -qm "concurrent origin advance"; git push -q origin master )
  cd "$LOCAL"
}

origin_head() { git ls-remote "$ORIGIN" -h refs/heads/master | awk '{print $1}'; }
local_clean() { [ -z "$(git status --porcelain)" ]; }

echo "ship_nightly_commit integration test"
echo

echo "Scenario 1 — origin unchanged → push succeeds"
setup
echo "lane work" > docs/nightly/reports/2026-01-01.md
ship_nightly_commit; rc=$?
assert "returns 0"               "[ $rc -eq 0 ]"
assert "origin == local HEAD"    "[ \"\$(origin_head)\" = \"\$(git rev-parse HEAD)\" ]"
assert "local advanced past base" "[ \"\$(git rev-parse HEAD)\" != \"$START_SHA\" ]"
assert "tree clean"              "local_clean"

echo "Scenario 2 — origin advanced, non-overlapping files → rebase clean, push"
setup
echo "lane work" > docs/nightly/reports/2026-01-01.md
advance_origin "base.txt=origin-changed-this"
ship_nightly_commit; rc=$?
assert "returns 0"                  "[ $rc -eq 0 ]"
assert "origin == local HEAD"       "[ \"\$(origin_head)\" = \"\$(git rev-parse HEAD)\" ]"
assert "origin's change present"    "git show origin/master:base.txt | grep -q origin-changed-this"
assert "lane's change present"      "git show origin/master:docs/nightly/reports/2026-01-01.md | grep -q 'lane work'"
assert "tree clean"                 "local_clean"

echo "Scenario 3 — origin & nightly both touch translation-report.json → excluded, push clean"
setup
echo "lane work" > docs/nightly/reports/2026-01-01.md
echo '{"report":"NIGHTLY-regenerated-different"}' > fe-next/scripts/translation-report.json
advance_origin "fe-next/scripts/translation-report.json={\"report\":\"origin-i18n-regen\"}"
ship_nightly_commit; rc=$?
assert "returns 0"                       "[ $rc -eq 0 ]"
assert "origin == local HEAD"            "[ \"\$(origin_head)\" = \"\$(git rev-parse HEAD)\" ]"
assert "origin's report version kept"    "git show origin/master:fe-next/scripts/translation-report.json | grep -q origin-i18n-regen"
assert "nightly did NOT clobber report"  "! git show origin/master:fe-next/scripts/translation-report.json | grep -q NIGHTLY-regenerated"
assert "lane's doc shipped"              "git show origin/master:docs/nightly/reports/2026-01-01.md | grep -q 'lane work'"
assert "tree clean (report restored)"    "local_clean"

echo "Scenario 4 — lane touched ONLY a generated file → no-change, no push"
setup
echo '{"report":"NIGHTLY-regen-only"}' > fe-next/scripts/translation-report.json
ship_nightly_commit; rc=$?
assert "returns 0"               "[ $rc -eq 0 ]"
assert "NO_CHANGE_MODE=1"        "[ \"$NO_CHANGE_MODE\" = 1 ]"
assert "NEW_SHA == baseline"     "[ \"$NEW_SHA\" = \"$START_SHA\" ]"
assert "origin unchanged"        "[ \"\$(origin_head)\" = \"$START_SHA\" ]"
assert "tree clean (restored)"   "local_clean"

echo "Scenario 5 — origin & nightly modify the SAME source file → fail visibly + recoverably"
setup
printf 'export const x = 2; // nightly\n' > fe-next/app/page.tsx
echo "lane work" > docs/nightly/reports/2026-01-01.md
advance_origin "fe-next/app/page.tsx=export const x = 3; // origin"
local_commit_before=""  # captured after ship
ship_nightly_commit; rc=$?
nightly_sha_msg="$(git log -1 --pretty=%s)"
assert "returns 1 (unrecoverable, human needed)" "[ $rc -eq 1 ]"
assert "local commit PRESERVED"   "[ \"\$nightly_sha_msg\" = 'chore(nightly): autonomous improvement loop test' ]"
assert "tree CLEAN (rebase aborted, no markers)" "local_clean"
assert "no unmerged paths"        "[ -z \"\$(git diff --name-only --diff-filter=U)\" ]"
assert "alert names the conflict file" "printf '%s' \"\$ALERTS\" | grep -q 'page.tsx'"
assert "origin NOT advanced by nightly" "git show origin/master:fe-next/app/page.tsx | grep -q '// origin'"
assert "nightly's page.tsx NOT on origin" "! git show origin/master:fe-next/app/page.tsx | grep -q '// nightly'"

echo "Scenario 6 — lane mutated BOTH generated files (translation-report + tsconfig) + a real doc → both excluded, doc shipped"
setup
echo "real lane doc" > docs/nightly/reports/2026-01-01.md
echo '{"report":"NIGHTLY-regen"}'                 > fe-next/scripts/translation-report.json
echo '{"compilerOptions":{},"_nextBuild":true}'   > fe-next/tsconfig.json   # simulate next build mutation
ship_nightly_commit; rc=$?
assert "returns 0"                          "[ $rc -eq 0 ]"
assert "origin == local HEAD"               "[ \"\$(origin_head)\" = \"\$(git rev-parse HEAD)\" ]"
assert "doc shipped"                        "git show origin/master:docs/nightly/reports/2026-01-01.md | grep -q 'real lane doc'"
assert "translation-report NOT committed"   "! git show origin/master:fe-next/scripts/translation-report.json | grep -q NIGHTLY-regen"
assert "tsconfig NOT committed"             "! git show origin/master:fe-next/tsconfig.json | grep -q _nextBuild"
assert "tree clean (both restored)"         "local_clean"

echo "Scenario 7 — origin & nightly both touch the SAME docs/ file → auto-resolved (nightly wins), push clean"
setup
echo "NIGHTLY report v2"          > docs/nightly/reports/2026-01-01.md
advance_origin "docs/nightly/reports/2026-01-01.md=ORIGIN stranded report v1"
ship_nightly_commit; rc=$?
assert "returns 0 (docs conflict auto-resolved)" "[ $rc -eq 0 ]"
assert "origin == local HEAD"                    "[ \"\$(origin_head)\" = \"\$(git rev-parse HEAD)\" ]"
assert "nightly's docs version won"              "git show origin/master:docs/nightly/reports/2026-01-01.md | grep -q 'NIGHTLY report v2'"
assert "origin's stranded version overwritten"   "! git show origin/master:docs/nightly/reports/2026-01-01.md | grep -q 'stranded report v1'"
assert "tree clean"                              "local_clean"
assert "no unmerged paths"                       "[ -z \"\$(git diff --name-only --diff-filter=U)\" ]"
assert "no push-failed alert"                    "! printf '%s' \"\$ALERTS\" | grep -q 'push failed'"

echo "Scenario 8 — conflict on BOTH a docs/ file AND a code file → NOT auto-resolved, fail visibly"
setup
echo "NIGHTLY report v2"                          > docs/nightly/reports/2026-01-01.md
printf 'export const x = 2; // nightly\n'         > fe-next/app/page.tsx
advance_origin "docs/nightly/reports/2026-01-01.md=ORIGIN report v1" \
               "fe-next/app/page.tsx=export const x = 3; // origin"
ship_nightly_commit; rc=$?
assert "returns 1 (mixed conflict → human)"       "[ $rc -eq 1 ]"
assert "local commit PRESERVED"                   "[ \"\$(git log -1 --pretty=%s)\" = 'chore(nightly): autonomous improvement loop test' ]"
assert "tree CLEAN (rebase aborted)"              "local_clean"
assert "no unmerged paths"                        "[ -z \"\$(git diff --name-only --diff-filter=U)\" ]"
assert "alert names the code conflict"            "printf '%s' \"\$ALERTS\" | grep -q 'page.tsx'"
assert "origin's code NOT clobbered"              "git show origin/master:fe-next/app/page.tsx | grep -q '// origin'"
assert "nightly docs NOT half-shipped"            "! git show origin/master:docs/nightly/reports/2026-01-01.md | grep -q 'NIGHTLY report v2'"

echo "Scenario 9 — residual ship: a 2nd ship_nightly_commit sweeps trailing changes and ends CLEAN"
# git-ship appends the Outcome line to the report AFTER its own commit, so every
# successful run leaves the tree dirty (this is what aborted the 2026-05-19 run).
# run.sh now calls ship_nightly_commit a 2nd time at end-of-run with REPORT=/dev/null
# so the residue (and any other trailing change) gets pushed too and the tree ends
# clean for the NEXT run's preflight. Prove that pattern here.
setup
echo "lane work" > docs/nightly/reports/2026-01-01.md
ship_nightly_commit; rc1=$?
echo "**Outcome:** ✅ shipped" >> docs/nightly/reports/2026-01-01.md   # simulate post-commit append
assert "first ship returned 0"            "[ $rc1 -eq 0 ]"
assert "tree dirty after Outcome append"  "! local_clean"
RES_MSG=$(mktemp); echo "chore(nightly): post-run residue test" > "$RES_MSG"
# REPORT=/dev/null so the residual ship's OWN Outcome append can't re-dirty the tree.
MSG_FILE="$RES_MSG" REPORT=/dev/null NO_CHANGE_MODE=0 ship_nightly_commit; rc2=$?
assert "residual ship returned 0"         "[ $rc2 -eq 0 ]"
assert "tree CLEAN after residual ship"   "local_clean"
assert "residual change reached origin"   "git show origin/master:docs/nightly/reports/2026-01-01.md | grep -q 'Outcome'"
assert "origin == local HEAD"             "[ \"\$(origin_head)\" = \"\$(git rev-parse HEAD)\" ]"
assert "two distinct nightly commits"     "[ \"\$(git rev-list --count origin/master)\" -ge 3 ]"

echo "Scenario 10 — founder WIP excluded from the commit (NIGHTLY_WIP_PROTECT)"
# The autonomous nightly must never sweep a human's concurrent uncommitted work
# into its commit. run.sh records the founder's pre-run dirty paths and passes
# them via NIGHTLY_WIP_PROTECT; ship UNSTAGES those (keeps the working copy) so
# they stay as uncommitted WIP and only lane changes get committed.
setup
printf 'FOUNDER edited base\n' > base.txt            # founder tracked WIP
printf 'founder scratch\n'     > founder-draft.txt   # founder untracked WIP
echo "lane work" > docs/nightly/reports/2026-01-01.md
WIP_LIST=$(mktemp); printf 'base.txt\nfounder-draft.txt\n' > "$WIP_LIST"
NIGHTLY_WIP_PROTECT="$WIP_LIST" ship_nightly_commit; rc=$?
assert "returns 0"                            "[ $rc -eq 0 ]"
assert "lane doc shipped"                     "git show origin/master:docs/nightly/reports/2026-01-01.md | grep -q 'lane work'"
assert "founder tracked WIP NOT committed"    "git show origin/master:base.txt | grep -qx 'base'"
assert "founder tracked WIP still dirty"      "git status --porcelain | grep -q '^ M base.txt'"
assert "founder untracked NOT committed"      "! git ls-tree -r --name-only origin/master | grep -qx 'founder-draft.txt'"
assert "founder untracked still present"      "[ -f founder-draft.txt ]"
assert "founder untracked still untracked"    "git status --porcelain | grep -q '?? founder-draft.txt'"

echo "Scenario 11 — WIP exclusion leaves nothing shippable → no-change, no push"
# A run where the ONLY dirty files are the founder's WIP must NOT commit them.
setup
printf 'FOUNDER edited base\n' > base.txt
WIP_LIST=$(mktemp); printf 'base.txt\n' > "$WIP_LIST"
NIGHTLY_WIP_PROTECT="$WIP_LIST" ship_nightly_commit; rc=$?
assert "returns 0 (no-change)"                "[ $rc -eq 0 ]"
assert "NO_CHANGE_MODE=1"                     "[ \"$NO_CHANGE_MODE\" = 1 ]"
assert "origin unchanged"                     "[ \"\$(origin_head)\" = \"$START_SHA\" ]"
assert "founder WIP still dirty (kept)"       "git status --porcelain | grep -q '^ M base.txt'"

echo
echo "──────────────────────────────────────────"
echo "PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN ✓" || echo "FAILURES ✗"
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
