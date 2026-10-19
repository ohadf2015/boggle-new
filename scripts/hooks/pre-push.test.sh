#!/bin/bash
# Drives the REAL .husky/pre-push through real `git push`es to a file:// remote, with
# eslint/tsc/tsx/vitest stubbed to log their calls. Run: bash scripts/hooks/pre-push.test.sh
set -uo pipefail

HOOK="$(cd "$(dirname "$0")/../.." && pwd)/.husky/pre-push"
ROOT=$(mktemp -d -t prepushtest.XXXXXX)
trap 'rm -rf "$ROOT"' EXIT
PASS=0; FAIL=0

assert() { # name ; condition-string
  if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi
}

git -c init.defaultBranch=master init -q --bare "$ROOT/origin.git"
git -c init.defaultBranch=master clone -q "$ROOT/origin.git" "$ROOT/local" 2>/dev/null
cd "$ROOT/local" || exit 1
git config user.email t@t; git config user.name tester
git symbolic-ref HEAD refs/heads/master
mkdir -p fe-next/node_modules/.bin fe-next/lib "$ROOT/hooks"
printf 'node_modules\n' > .gitignore
echo 'export const a = 1;' > fe-next/lib/a.ts
git add -A && git commit -qm base && git push -q origin master

CALLS="$ROOT/calls.log"
for bin in eslint tsc tsx vitest; do
  printf '#!/bin/sh\necho "%s $*" >> "%s"\nexit 0\n' "$bin" "$CALLS" > "fe-next/node_modules/.bin/$bin"
  chmod +x "fe-next/node_modules/.bin/$bin"
done
printf '#!/bin/sh\nexec sh -e "%s" "$@"\n' "$HOOK" > "$ROOT/hooks/pre-push"
chmod +x "$ROOT/hooks/pre-push"
git config core.hooksPath "$ROOT/hooks"

git checkout -qb work

push() { # refspec... → sets OUT, RC, and the per-run CALLS log
  : > "$CALLS"
  OUT=$(TMPDIR="$ROOT" PREPUSH_LOCK="$ROOT/test.lock" git push -q origin "$@" 2>&1); RC=$?
}

echo "▸ source-only change: lint + incremental tsc run, no vitest"
echo 'export const a = 2;' > fe-next/lib/a.ts
git commit -qam change
push work:feat/x
assert "push succeeds" '[ "$RC" -eq 0 ]'
assert "eslint invoked" 'grep -q "^eslint" "$CALLS"'
assert "tsc invoked incrementally" 'grep -q "^tsc --noEmit --incremental" "$CALLS"'
assert "vitest never invoked" '! grep -q "^vitest" "$CALLS"'

echo "▸ test file in the diff: vitest runs on that file only (no cone, no list, no shards)"
echo 'it("x", () => {});' > fe-next/lib/a.test.ts
git add -A && git commit -qm test
push work:feat/y
assert "push succeeds" '[ "$RC" -eq 0 ]'
assert "vitest runs the changed test file" 'grep -q "^vitest run lib/a.test.ts" "$CALLS"'
assert "no --changed cone" '! grep -q -- "--changed" "$CALLS"'
assert "no shards" '! grep -q -- "--shard" "$CALLS"'

echo "▸ agent branch gets the same gate (no special skip)"
push work:agent/z
assert "vitest runs the changed test file" 'grep -q "^vitest run lib/a.test.ts" "$CALLS"'

echo
echo "pass=$PASS fail=$FAIL"
[ "$FAIL" -eq 0 ]
