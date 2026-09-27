#!/usr/bin/env bash
# Migrate /mascot/*.gif refs in source code to /mascot/*.webp.
# Idempotent: safe to re-run. Skips files that have no .gif refs.
# Verification: greps for any remaining /mascot/*.gif refs after run.
#
# Usage: bash scripts/migrate-gif-to-webp.sh [--dry-run]
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
MASCOT_DIR="$REPO/public/mascot"
DRY=${1:-}

if [ ! -d "$MASCOT_DIR" ]; then
  echo "FATAL: $MASCOT_DIR missing"
  exit 1
fi

# Build map: only swap if a webp variant exists for the gif basename.
GIFS=()
while IFS= read -r path; do
  GIFS+=("$(basename "$path")")
done < <(find "$MASCOT_DIR" -maxdepth 1 -name '*.gif' | sort)
echo "Found ${#GIFS[@]} mascot GIFs"

# Source roots to scan. Browser-rendered code only.
# `emails/` excluded: Outlook + older Gmail clients don't render WebP, must stay GIF.
SCAN_PATHS=(
  "$REPO/app"
  "$REPO/components"
  "$REPO/hooks"
  "$REPO/lib"
  "$REPO/contexts"
  "$REPO/utils"
  "$REPO/host"
  "$REPO/player"
  "$REPO/server"
)

SWAPPED=0
SKIPPED=0
for gif in "${GIFS[@]}"; do
  base="${gif%.gif}"
  webp="${base}.webp"
  if [ ! -f "$MASCOT_DIR/$webp" ]; then
    echo "SKIP $gif (no webp variant)"
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  # Pattern: /mascot/<base>.gif (literal). Anchor on slash to avoid false matches.
  pattern="/mascot/${gif}"
  replacement="/mascot/${webp}"

  # Find files containing the pattern.
  files=$(grep -rl --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
    -F "$pattern" "${SCAN_PATHS[@]}" 2>/dev/null || true)

  if [ -z "$files" ]; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  count=$(echo "$files" | wc -l | tr -d ' ')
  if [ "$DRY" = "--dry-run" ]; then
    echo "WOULD swap $pattern → $replacement in $count file(s)"
    echo "$files" | sed 's/^/  /'
  else
    echo "SWAP $pattern → $replacement ($count file(s))"
    while IFS= read -r f; do
      [ -z "$f" ] && continue
      # macOS sed needs '' after -i; GNU sed does not. Cross-compat via tmp file.
      tmp="$(mktemp)"
      sed "s|${pattern}|${replacement}|g" "$f" > "$tmp"
      mv "$tmp" "$f"
    done <<< "$files"
    SWAPPED=$((SWAPPED+1))
  fi
done

echo ""
echo "Swapped: $SWAPPED gif basenames"
echo "Skipped: $SKIPPED gif basenames"

# Post-verify: any remaining /mascot/*.gif refs in source?
echo ""
echo "Remaining /mascot/*.gif refs in source:"
remaining=$(grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git \
  -E '/mascot/[a-zA-Z0-9_-]+\.gif' "${SCAN_PATHS[@]}" 2>/dev/null || true)
if [ -z "$remaining" ]; then
  echo "  (none — clean)"
else
  echo "$remaining"
fi
