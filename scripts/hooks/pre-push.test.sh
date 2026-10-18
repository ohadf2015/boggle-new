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
  printf '#!/bin/sh\necho "%s $*" >> "%s"\n[ "$1" = list ] && echo lib/a.test.ts\nexit 0\n' "$bin" "$CALLS" > "fe-next/node_modules/.bin/$bin"
  chmod +x "fe-next/node_modules/.bin/$bin"
done
printf '#!/bin/sh\nexec sh -e "%s" "$@"\n' "$HOOK" > "$ROOT/hooks/pre-push"
chmod +x "$ROOT/hooks/pre-push"
git config core.hooksPath "$ROOT/hooks"

git checkout -qb work
echo 'export const a = 2;' > fe-next/lib/a.ts
git commit -qam change

push() { # refspec... → sets OUT, RC, and the per-run CALLS log
  : > "$CALLS"
  OUT=$(TMPDIR="$ROOT" git push -q origin "$@" 2>&1); RC=$?
}

echo "▸ agent/x: vitest skipped, lint + type-check still run"
push work:agent/x
assert "push succeeds" '[ "$RC" -eq 0 ]'
assert "prints the skip line" 'grep -q "Tests: SKIPPED for agent branch push" <<<"$OUT"'
assert "vitest never invoked" '! grep -q "^vitest" "$CALLS"'
assert "eslint ran" 'grep -q "^eslint" "$CALLS"'
assert "tsc ran" 'grep -q "^tsc" "$CALLS"'

echo "▸ feat/x: full hook, vitest runs"
push work:feat/x
assert "push succeeds" '[ "$RC" -eq 0 ]'
assert "no skip line" '! grep -q "SKIPPED" <<<"$OUT"'
assert "vitest invoked" 'grep -q "^vitest run" "$CALLS"'
assert "eslint ran" 'grep -q "^eslint" "$CALLS"'
assert "tsc ran" 'grep -q "^tsc" "$CALLS"'

echo "▸ agent/y + feat/y in one push: any non-agent ref keeps the tests"
push work:agent/y work:feat/y
assert "vitest invoked" 'grep -q "^vitest run" "$CALLS"'
assert "no skip line" '! grep -q "SKIPPED" <<<"$OUT"'

echo "▸ local agent/ branch pushed to a non-agent remote name keeps the tests"
git branch -q agent/local work
push agent/local:fix/z
assert "vitest invoked" 'grep -q "^vitest run" "$CALLS"'

echo "▸ a branch merely containing 'agent' is not an agent branch"
push work:feat/agent/q
assert "vitest invoked" 'grep -q "^vitest run" "$CALLS"'

echo ""
echo "pre-push: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
