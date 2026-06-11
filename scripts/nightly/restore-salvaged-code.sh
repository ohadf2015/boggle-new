#!/bin/bash
# restore-salvaged-code.sh <date-tag|latest> — restore lane CODE that a docs-only
# nightly salvage reverted.
#
# When the nightly gate fails on lane code it ships DOCS-ONLY and reverts the lane
# CODE from the working tree (so master stays clean + founder WIP is never touched).
# BEFORE reverting, it backs up every dropped code file to
#   $LOG_DIR/salvaged-code-<date-tag>/   (mirrors repo-relative paths)
# This script copies that backup back into the repo working tree so the work is never
# lost or hard to find — which is exactly how the 2026-06-11 lane code was recovered.
#
# IT DOES NOT COMMIT. Dropped code failed the gate at least once (that is why it was
# dropped), so you must review + re-gate it (lint/test/build) and fix the real break
# before shipping — never blind-commit restored code to master.
#
# Usage:
#   scripts/nightly/restore-salvaged-code.sh            # restore the most recent backup
#   scripts/nightly/restore-salvaged-code.sh 20260611-020004
#   scripts/nightly/restore-salvaged-code.sh latest
#
# Env (overridable for tests): LEXI_NIGHTLY_LOG_DIR, LEXI_REPO_DIR.
set -uo pipefail

LOG_DIR="${LEXI_NIGHTLY_LOG_DIR:-$HOME/logs/lexi-nightly}"
REPO_DIR="${LEXI_REPO_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
tag="${1:-latest}"

if [ "$tag" = "latest" ]; then
  src=$(ls -dt "$LOG_DIR"/salvaged-code-* 2>/dev/null | head -1)
else
  src="$LOG_DIR/salvaged-code-$tag"
fi

if [ -z "${src:-}" ] || [ ! -d "$src" ]; then
  echo "restore-salvaged-code: no backup found for '$tag' under $LOG_DIR" >&2
  echo "  available:" >&2
  ls -dt "$LOG_DIR"/salvaged-code-* 2>/dev/null | sed 's#.*/salvaged-code-#    #' >&2 || echo "    (none)" >&2
  exit 1
fi

count=$(find "$src" -type f | wc -l | tr -d ' ')
echo "restore-salvaged-code: restoring $count file(s) from $src → $REPO_DIR"
find "$src" -type f | sed "s#^$src/#  #"
rsync -a "$src"/ "$REPO_DIR"/
echo
echo "Restored. These files failed the gate at least once — review + re-gate (lint/test/build)"
echo "and fix the real break before committing. Do NOT blind-commit to master."
