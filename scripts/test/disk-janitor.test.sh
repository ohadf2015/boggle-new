#!/bin/bash
# disk-janitor.test.sh — TDD for scripts/disk-janitor.sh
#
# Run: bash scripts/test/disk-janitor.test.sh
# Bash 3.2 compatible (macOS default). No mapfile / no read -ra.

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
JANITOR="$HERE/../disk-janitor.sh"

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ok: $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL: $1"; }
assert_contains() { case "$1" in *"$2"*) ok "$3";; *) bad "$3 (missing: $2)";; esac; }
assert_absent()   { case "$1" in *"$2"*) bad "$3 (unexpected: $2)";; *) ok "$3";; esac; }

# --- sandbox repo --------------------------------------------------------
SBX="$(mktemp -d -t disk-janitor-test.XXXXXX)"
trap 'rm -rf "$SBX"' EXIT
mkdir -p "$SBX/fe-next"
( cd "$SBX" && git init -q && git config user.email t@t && git config user.name t \
  && echo x > seed && git add seed && git commit -qm seed )

# Build dirs: live .next (fresh), .next-nightly (managed, fresh), and stale alts (old).
mkdir -p "$SBX/fe-next/.next"            && touch "$SBX/fe-next/.next/x"
mkdir -p "$SBX/fe-next/.next-nightly"    && touch "$SBX/fe-next/.next-nightly/x"
mkdir -p "$SBX/fe-next/.next-clean"      && touch "$SBX/fe-next/.next-clean/x"
mkdir -p "$SBX/fe-next/.next-verify2"    && touch "$SBX/fe-next/.next-verify2/x"
# Age the stale ones to 30 days old; keep live ones fresh.
touch -t "$(date -v-30d +%Y%m%d%H%M 2>/dev/null || echo 202601010000)" \
  "$SBX/fe-next/.next-clean" "$SBX/fe-next/.next-verify2"

echo "TEST 1: dry-run selects stale .next-* but never the live .next or .next-nightly"
OUT="$(DISK_JANITOR_DRY_RUN=1 DISK_JANITOR_MIN_AGE_DAYS=7 DISK_JANITOR_REPO="$SBX" bash "$JANITOR" 2>&1)"
assert_contains "$OUT" "WOULD-REMOVE-NEXT $SBX/fe-next/.next-clean"   "selects stale .next-clean"
assert_contains "$OUT" "WOULD-REMOVE-NEXT $SBX/fe-next/.next-verify2" "selects stale .next-verify2"
assert_absent   "$OUT" "WOULD-REMOVE-NEXT $SBX/fe-next/.next "         "never live .next"
assert_absent   "$OUT" ".next-nightly"                                "never .next-nightly (nightly-managed)"

echo "TEST 2: fresh stale-named dir under min-age is NOT selected"
mkdir -p "$SBX/fe-next/.next-fresh" && touch "$SBX/fe-next/.next-fresh/x"  # mtime = now
OUT2="$(DISK_JANITOR_DRY_RUN=1 DISK_JANITOR_MIN_AGE_DAYS=7 DISK_JANITOR_REPO="$SBX" bash "$JANITOR" 2>&1)"
assert_absent "$OUT2" "WOULD-REMOVE-NEXT $SBX/fe-next/.next-fresh" "fresh alt dir spared by age guard"

echo "TEST 3: real run actually deletes the stale dirs and keeps the live ones"
DISK_JANITOR_MIN_AGE_DAYS=7 DISK_JANITOR_REPO="$SBX" bash "$JANITOR" >/dev/null 2>&1
[ ! -d "$SBX/fe-next/.next-clean" ] && ok "deleted .next-clean" || bad "deleted .next-clean"
[ -d "$SBX/fe-next/.next" ]         && ok "kept live .next"      || bad "kept live .next"
[ -d "$SBX/fe-next/.next-nightly" ] && ok "kept .next-nightly"   || bad "kept .next-nightly"

echo "TEST 4: stale worktree (old, clean, no cwd) is selected; fresh one spared"
( cd "$SBX" && git worktree add -q --detach "$SBX/.claude/worktrees/stale" HEAD 2>/dev/null
  git worktree add -q --detach "$SBX/.claude/worktrees/fresh" HEAD 2>/dev/null )
touch -t "$(date -v-30d +%Y%m%d%H%M 2>/dev/null || echo 202601010000)" "$SBX/.claude/worktrees/stale"
OUT4="$(DISK_JANITOR_DRY_RUN=1 DISK_JANITOR_MIN_AGE_DAYS=7 DISK_JANITOR_REPO="$SBX" bash "$JANITOR" 2>&1)"
assert_contains "$OUT4" "WOULD-REMOVE-WORKTREE $SBX/.claude/worktrees/stale" "selects stale worktree"
assert_absent   "$OUT4" "WOULD-REMOVE-WORKTREE $SBX/.claude/worktrees/fresh" "spares fresh worktree"

echo "TEST 5: dirty worktree is never selected even when old"
echo dirty > "$SBX/.claude/worktrees/stale/uncommitted.txt"
OUT5="$(DISK_JANITOR_DRY_RUN=1 DISK_JANITOR_MIN_AGE_DAYS=7 DISK_JANITOR_REPO="$SBX" bash "$JANITOR" 2>&1)"
assert_absent "$OUT5" "WOULD-REMOVE-WORKTREE $SBX/.claude/worktrees/stale" "dirty worktree protected"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
