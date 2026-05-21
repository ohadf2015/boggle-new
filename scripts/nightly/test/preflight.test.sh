#!/bin/bash
# Integration test for preflight_check() — proves the nightly NO LONGER aborts on a
# dirty working tree. The loop intentionally runs on top of the founder's WIP and
# ships it (run.sh snapshots the WIP first so a gate failure restores it untouched),
# so a dirty tree must NOT stop the run. Drives a REAL temp git repo + file:// remote
# + a stubbed `claude mcp list` so the real function runs end-to-end.
# Run: bash scripts/nightly/test/preflight.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PASS=0; FAIL=0
assert() { # name ; condition-string
  if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi
}

ROOT=$(mktemp -d -t preflighttest.XXXXXX)
ORIGIN="$ROOT/origin.git"; REPO="$ROOT/repo"; BIN="$ROOT/bin"
mkdir -p "$BIN"

# Stub `claude` so `claude mcp list` reports the hard-required servers connected.
cat > "$BIN/claude" <<'STUB'
#!/bin/bash
if [ "$1" = "mcp" ] && [ "$2" = "list" ]; then
  echo "posthog: http://x ✓ Connected"
  echo "sentry: http://x ✓ Connected"
  echo "supabase: http://x ✓ Connected"
fi
STUB
chmod +x "$BIN/claude"
export PATH="$BIN:$PATH"

# Real temp repo on master with a file:// origin (so fetch/pull resolve).
git -c init.defaultBranch=master init -q --bare "$ORIGIN"
git -c init.defaultBranch=master clone -q "$ORIGIN" "$REPO" 2>/dev/null
( cd "$REPO"
  git config user.email t@t; git config user.name tester
  echo base > base.txt
  git add -A; git commit -qm init; git branch -M master; git push -q origin master )

# Make the tree DIRTY — tracked modification + untracked file. This is the exact
# condition the old preflight aborted on.
( cd "$REPO"; echo "founder WIP" >> base.txt; echo "scratch" > untracked.txt )

# Env contract + isolated lock/last-run so we never touch the real cache.
export TELEGRAM_BOT_TOKEN=x TELEGRAM_CHAT_ID=x
export POSTHOG_PERSONAL_API_KEY=x POSTHOG_PROJECT_ID=x
export NIGHTLY_DISABLED=0
export LOCK_FILE="$ROOT/lock" LAST_RUN_FILE="$ROOT/last-run"   # last-run absent → no 18h dedupe skip
export PROJECT_DIR="$REPO"
export NIGHTLY_PID=$$

# shellcheck disable=SC1091
source "$HERE/../lib/preflight.sh"

echo "preflight_check on a DIRTY working tree"
OUT=$(preflight_check 2>&1); rc=$?

assert "does NOT abort with 'working tree dirty'"  '! printf "%s" "$OUT" | grep -q "ABORT — working tree dirty"'
assert "returns 0 (proceeds with the run)"          "[ $rc -eq 0 ]"
assert "logs it will run on top of WIP"             'printf "%s" "$OUT" | grep -q "will run on top of WIP"'
assert "WIP left intact (preflight never reverts)"  '[ -n "$(cd "$REPO" && git status --porcelain)" ]'

# Clean tree should still take the ff-pull path (regression guard).
( cd "$REPO"; git checkout -q -- base.txt; rm -f untracked.txt )
rm -f "$LOCK_FILE" "$LAST_RUN_FILE"
echo
echo "preflight_check on a CLEAN working tree (ff-pull path intact)"
OUT2=$(preflight_check 2>&1); rc2=$?
assert "returns 0"                    "[ $rc2 -eq 0 ]"
assert "took the ff-pull path"        'printf "%s" "$OUT2" | grep -q "ff-pulling master"'
assert "did NOT log dirty-skip"       '! printf "%s" "$OUT2" | grep -q "skipping ff-pull"'

rm -rf "$ROOT"
echo
echo "──────────────────────────────────────────"
echo "PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN ✓" || echo "FAILURES ✗"
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
