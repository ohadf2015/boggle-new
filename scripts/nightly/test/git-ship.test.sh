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

echo
echo "──────────────────────────────────────────"
echo "PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN ✓" || echo "FAILURES ✗"
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
