#!/bin/bash
# Test for restore-salvaged-code.sh — proves the founder can recover dropped lane code
# from the nightly's salvage backup with one command (the 2026-06-11 recovery, scripted).
#
# Run: bash scripts/nightly/test/restore-salvaged-code.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$HERE/../restore-salvaged-code.sh"

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

echo "── restore-salvaged-code ──"

# Two backups; TAG2 is newer (touched later) → 'latest' must resolve to it.
LOGD=$(mktemp -d -t salvlog.XXXXXX)
REPO=$(mktemp -d -t salvrepo.XXXXXX)
mkdir -p "$LOGD/salvaged-code-TAG1/fe-next/utils"
printf 'OLD\n' > "$LOGD/salvaged-code-TAG1/fe-next/utils/a.ts"
sleep 1
mkdir -p "$LOGD/salvaged-code-TAG2/fe-next/utils" "$LOGD/salvaged-code-TAG2/fe-next/blog"
printf 'NEW_A\n' > "$LOGD/salvaged-code-TAG2/fe-next/utils/a.ts"
printf 'NEW_B\n' > "$LOGD/salvaged-code-TAG2/fe-next/blog/b.tsx"

# Explicit tag restores that backup's files into the repo, preserving relative paths.
LEXI_NIGHTLY_LOG_DIR="$LOGD" LEXI_REPO_DIR="$REPO" bash "$SCRIPT" TAG1 >/dev/null 2>&1; rc=$?
assert "explicit tag exits 0" "[ $rc -eq 0 ]"
assert "explicit tag restores the file at its repo-relative path" "[ -f \"$REPO/fe-next/utils/a.ts\" ]"
assert "restored content matches the backup" "[ \"\$(cat \"$REPO/fe-next/utils/a.ts\")\" = OLD ]"

# 'latest' (and the no-arg default) resolves to the most recently written backup.
rm -rf "${REPO:?}"/*;
LEXI_NIGHTLY_LOG_DIR="$LOGD" LEXI_REPO_DIR="$REPO" bash "$SCRIPT" latest >/dev/null 2>&1
assert "latest picks the newest backup (TAG2)" "[ \"\$(cat \"$REPO/fe-next/utils/a.ts\")\" = NEW_A ]"
assert "latest restores all files in the newest backup" "[ -f \"$REPO/fe-next/blog/b.tsx\" ]"
rm -rf "${REPO:?}"/*
LEXI_NIGHTLY_LOG_DIR="$LOGD" LEXI_REPO_DIR="$REPO" bash "$SCRIPT" >/dev/null 2>&1
assert "no-arg defaults to latest" "[ \"\$(cat \"$REPO/fe-next/utils/a.ts\")\" = NEW_A ]"

# Unknown tag → non-zero exit, nothing restored (safe).
rm -rf "${REPO:?}"/*
LEXI_NIGHTLY_LOG_DIR="$LOGD" LEXI_REPO_DIR="$REPO" bash "$SCRIPT" NOPE >/dev/null 2>&1; rc=$?
assert "unknown tag exits non-zero" "[ $rc -ne 0 ]"
assert "unknown tag restores nothing" "[ -z \"\$(ls -A \"$REPO\")\" ]"

rm -rf "$LOGD" "$REPO"

echo
if [ "$FAIL" -eq 0 ]; then echo "restore-salvaged-code: $PASS passed, 0 failed"; exit 0
else echo "restore-salvaged-code: $PASS passed, $FAIL FAILED"; exit 1; fi
