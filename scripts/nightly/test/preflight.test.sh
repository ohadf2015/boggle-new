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

# ── MCP graceful degradation (2026-05-24 regression) ──────────────────────
# posthog ✗-failed at 02:00:13 and the OLD hard-abort killed all 8 lanes — even
# though lanes 4/5/6/7/8 don't touch posthog. A down analytics MCP must now
# WARN-and-proceed (lanes needing it degrade/skip), never abort the whole night.
cat > "$BIN/claude" <<'STUB'
#!/bin/bash
if [ "$1" = "mcp" ] && [ "$2" = "list" ]; then
  echo "posthog: http://x ✗ Failed to connect"
  echo "sentry: http://x ✓ Connected"
  echo "supabase: http://x ✓ Connected"
fi
STUB
chmod +x "$BIN/claude"
( cd "$REPO"; git checkout -q -- . 2>/dev/null; git clean -fdq 2>/dev/null )
rm -f "$LOCK_FILE" "$LAST_RUN_FILE"; unset NIGHTLY_NOW_EPOCH
export NIGHTLY_MCP_RETRIES=1 NIGHTLY_MCP_RETRY_SLEEP=0   # no real sleep in test
echo
echo "MCP graceful degradation (posthog down)"
OUTM=$(preflight_check 2>&1); rcM=$?
assert "posthog down → preflight still RUNS (no hard abort)" "[ $rcM -eq 0 ]"
assert "  …logs a WARN for posthog"                          'printf "%s" "$OUTM" | grep -q "WARN — MCP .posthog. not connected"'
assert "  …does NOT abort on MCP"                            '! printf "%s" "$OUTM" | grep -q "ABORT — MCP"'
unset NIGHTLY_MCP_RETRIES NIGHTLY_MCP_RETRY_SLEEP
# restore all-connected stub for the dedup cases below
cat > "$BIN/claude" <<'STUB'
#!/bin/bash
if [ "$1" = "mcp" ] && [ "$2" = "list" ]; then
  echo "posthog: http://x ✓ Connected"
  echo "sentry: http://x ✓ Connected"
  echo "supabase: http://x ✓ Connected"
fi
STUB
chmod +x "$BIN/claude"

# ── once-per-day dedup ────────────────────────────────────────────────────
# Regression guard for 2026-05-22: the OLD 18h rolling window suppressed a
# legitimate next-day run whenever the prior run drifted into late morning
# (sleep-deferred launchd makes run-times drift later each day). The rule is now
# "at most one successful run per LOCAL CALENDAR DAY" + a 4h floor to kill a
# genuine double-fire that straddles midnight. preflight reads NIGHTLY_NOW_EPOCH
# (defaults to `date +%s`) so "now" is injectable and these cases are deterministic.
epoch() { date -j -f '%Y-%m-%d %H:%M:%S' "$1" +%s; }
( cd "$REPO"; git checkout -q -- . 2>/dev/null; git clean -fdq 2>/dev/null )  # ensure clean tree
echo
echo "once-per-day dedup"

# A) the exact 05-22 bug: last run YESTERDAY 11:15, now TODAY 02:39 (age ~15.4h,
#    DIFFERENT calendar day). Old 18h window skipped this; calendar-day must RUN.
rm -f "$LOCK_FILE"; touch -t 202605211115.27 "$LAST_RUN_FILE"
export NIGHTLY_NOW_EPOCH="$(epoch '2026-05-22 02:39:42')"
OUTA=$(preflight_check 2>&1); rcA=$?
assert "diff-day, age 15.4h → RUNS (the 05-22 regression)"  "[ $rcA -eq 0 ]"
assert "  …and does NOT log a duplicate-skip"              '! printf "%s" "$OUTA" | grep -q "skipping duplicate"'

# B) honors injected clock; SAME calendar day → SKIP. Anchored in 2020 so the
#    assertion is independent of real wall-clock (old code, ignoring the inject,
#    would compute a multi-year age > any window and wrongly RUN).
rm -f "$LOCK_FILE"; touch -t 202001011200.00 "$LAST_RUN_FILE"
export NIGHTLY_NOW_EPOCH="$(epoch '2020-01-01 12:30:00')"
OUTB=$(preflight_check 2>&1); rcB=$?
assert "same calendar day → SKIPS (return 1)"              "[ $rcB -eq 1 ]"
assert "  …and logs a duplicate-skip"                      'printf "%s" "$OUTB" | grep -q "skipping duplicate"'

# C) midnight straddle: DIFFERENT day but only 10min apart (<4h floor) → SKIP.
rm -f "$LOCK_FILE"; touch -t 202001012355.00 "$LAST_RUN_FILE"
export NIGHTLY_NOW_EPOCH="$(epoch '2020-01-02 00:05:00')"
OUTC=$(preflight_check 2>&1); rcC=$?
assert "diff day but <4h apart (midnight straddle) → SKIPS" "[ $rcC -eq 1 ]"

# D) normal drift: different day, ~22h apart → RUNS.
rm -f "$LOCK_FILE"; touch -t 202001011100.00 "$LAST_RUN_FILE"
export NIGHTLY_NOW_EPOCH="$(epoch '2020-01-02 09:00:00')"
OUTD=$(preflight_check 2>&1); rcD=$?
assert "diff day, ~22h apart → RUNS"                       "[ $rcD -eq 0 ]"

unset NIGHTLY_NOW_EPOCH
rm -f "$LAST_RUN_FILE" "$LOCK_FILE"

# ── unpushed non-docs commit → isolated ship (was: ABORT, 2026-06-04) ──────
# Founder's hand-committed local code on HEAD (unpushed) USED to abort the run
# ("push or revert first") — but that let a tiny unpushed WIP commit block the
# whole night (the 2026-06-04 miss). It no longer aborts: preflight PROCEEDS and
# signals NIGHTLY_ISOLATED_SHIP=1 so git-ship cherry-picks only the nightly's own
# commit onto a fresh origin/master and leaves the founder's commit + tree local.
# The old push-time-conflict risk (2026-05-27) is now handled by the isolated
# worktree path + strand-on-conflict (proven in test/git-ship.test.sh #13/#14).
( cd "$REPO"; git checkout -q -- . 2>/dev/null; git clean -fdq 2>/dev/null )
rm -f "$LOCK_FILE"
unset NIGHTLY_ISOLATED_SHIP
echo
echo "unpushed non-docs commit on HEAD → isolated ship (must NOT abort)"
( cd "$REPO"
  echo "hand-edit" >> base.txt
  git add base.txt
  git -c user.email=t@t -c user.name=t commit -qm "hand: local non-docs commit" )
# Run in the CURRENT shell (file redirect, not $(...) which subshells) so the
# exported NIGHTLY_ISOLATED_SHIP propagates exactly as it does in run.sh:177.
_oute=$(mktemp); preflight_check > "$_oute" 2>&1; rcE=$?; OUTE=$(cat "$_oute"); rm -f "$_oute"
assert "unpushed non-docs commit → PROCEEDS (return 0)"  "[ $rcE -eq 0 ]"
assert "  …logs the offending path"                      'printf "%s" "$OUTE" | grep -q "base.txt"'
assert "  …enables isolated ship in the log"             'printf "%s" "$OUTE" | grep -q "enabling isolated ship"'
assert "  …sets NIGHTLY_ISOLATED_SHIP=1"                 '[ "${NIGHTLY_ISOLATED_SHIP:-0}" = 1 ]'
# Reset for next case
( cd "$REPO"; git reset --hard origin/master -q )
unset NIGHTLY_ISOLATED_SHIP

# Mirror: unpushed DOCS-only commit must NOT abort (loop's own salvage commits
# and stranded seo-daily reports are common; ff-pull/rebase paths handle them).
rm -f "$LOCK_FILE" "$LAST_RUN_FILE"
echo
echo "unpushed docs-only commit on HEAD (must NOT abort)"
( cd "$REPO"
  mkdir -p docs/nightly/reports
  echo "report" > docs/nightly/reports/2099-01-01.md
  git add docs/
  git -c user.email=t@t -c user.name=t commit -qm "docs(nightly): stranded report" )
OUTF=$(preflight_check 2>&1); rcF=$?
assert "unpushed docs-only commit → PROCEEDS (return 0)" "[ $rcF -eq 0 ]"
assert "  …does NOT log unpushed-non-docs abort"         '! printf "%s" "$OUTF" | grep -q "unpushed non-docs commits"'
( cd "$REPO"; git reset --hard origin/master -q )
rm -f "$LOCK_FILE" "$LAST_RUN_FILE"

# ── stranded pending-ref auto-recovery (2026-05-29 regression) ────────────
# git-ship saves a docs-only commit to refs/nightly-pending/$DATE + resets master
# when a push fails (that night: pre-push tsc tripped on an unrelated stale-.next
# error). The ref then stranded forever. preflight must now auto-recover it:
# cherry-pick docs-only strands onto the LATEST origin/master (even after origin
# advanced) and push. Non-docs strands are left for manual review.
( cd "$REPO"; git checkout -q -- . 2>/dev/null; git clean -fdq 2>/dev/null; git reset --hard origin/master -q )
rm -f "$LOCK_FILE" "$LAST_RUN_FILE"
echo
echo "stranded docs-only pending ref → auto-recovered (non-FF: origin advanced)"
( cd "$REPO"
  # Build the stranded commit on the CURRENT origin/master, park it in a ref.
  git checkout -q -b _pending origin/master
  mkdir -p docs/nightly/reports
  echo stranded > docs/nightly/reports/2099-12-31.md
  git add docs/
  git -c user.email=t@t -c user.name=t commit -qm "docs(nightly): stranded salvage"
  git update-ref refs/nightly-pending/2099-12-31 HEAD
  git checkout -q master; git branch -qD _pending
  # Advance origin so recovery is forced through cherry-pick (not a trivial FF).
  echo advance > base2.txt; git add base2.txt
  git -c user.email=t@t -c user.name=t commit -qm "origin advances during the day"
  git push -q origin master )
OUTG=$(preflight_check 2>&1); rcG=$?
assert "recovery runs without aborting (return 0)"        "[ $rcG -eq 0 ]"
assert "  …logs the recovery"                             'printf "%s" "$OUTG" | grep -q "recovered stranded docs ref"'
assert "  …pending ref is deleted after recovery"         '! (cd "$REPO" && git show-ref --verify --quiet refs/nightly-pending/2099-12-31)'
assert "  …doc is now TRACKED on origin/master"           '(cd "$REPO" && git fetch -q origin master && git cat-file -e origin/master:docs/nightly/reports/2099-12-31.md 2>/dev/null)'
( cd "$REPO"; git checkout -q -- . 2>/dev/null; git clean -fdq 2>/dev/null )
rm -f "$LOCK_FILE" "$LAST_RUN_FILE"

echo
echo "stranded NON-docs pending ref → left for manual review (never auto-reshipped)"
( cd "$REPO"
  git checkout -q -b _pending2 origin/master
  echo "rogue code" > rogue.ts
  git add rogue.ts
  git -c user.email=t@t -c user.name=t commit -qm "feat: un-re-gated code strand"
  git update-ref refs/nightly-pending/2099-11-30 HEAD
  git checkout -q master; git branch -qD _pending2 )
OUTH=$(preflight_check 2>&1); rcH=$?
assert "non-docs strand does NOT abort the run (return 0)"  "[ $rcH -eq 0 ]"
assert "  …WARNs it touches non-docs paths"                 'printf "%s" "$OUTH" | grep -q "touches non-docs paths"'
assert "  …leaves the pending ref intact for manual fix"    '(cd "$REPO" && git show-ref --verify --quiet refs/nightly-pending/2099-11-30)'
( cd "$REPO"; git update-ref -d refs/nightly-pending/2099-11-30 2>/dev/null || true )
rm -f "$LOCK_FILE" "$LAST_RUN_FILE"

rm -rf "$ROOT"
echo
echo "──────────────────────────────────────────"
echo "PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN ✓" || echo "FAILURES ✗"
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
