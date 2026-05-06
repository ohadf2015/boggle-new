#!/usr/bin/env bash
# Patch test files that mock 'framer-motion' but lack LazyMotion/domAnimation
# exports — required after components were converted from `motion.X` to
# `m.X` + `<LazyMotion features={domAnimation}>`. Idempotent.
#
# Usage: bash scripts/patch-framer-motion-mocks.sh [--dry-run]
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DRY=${1:-}

# Find test files mocking framer-motion.
FILES=$(grep -rln "vi.mock('framer-motion'" \
  "$REPO/components" "$REPO/__tests__" "$REPO/app" "$REPO/hooks" "$REPO/lib" 2>/dev/null || true)

PATCHED=0
SKIPPED=0
for f in $FILES; do
  # Skip if already has LazyMotion in the mock body.
  if grep -q "LazyMotion" "$f"; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  # Skip if file has no AnimatePresence return line (indicates non-standard shape).
  if ! grep -q "AnimatePresence" "$f"; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  if [ "$DRY" = "--dry-run" ]; then
    echo "WOULD patch: ${f#$REPO/}"
    continue
  fi

  # Inject LazyMotion + domAnimation after the AnimatePresence line in the mock.
  # Pattern targets a line with `AnimatePresence:` followed by a closing `,`.
  python3 - "$f" <<'PY'
import re, sys
path = sys.argv[1]
with open(path) as fh:
    src = fh.read()

# Find lines containing AnimatePresence: ... ,  inside a vi.mock('framer-motion',
# and inject LazyMotion + domAnimation after.
pattern = re.compile(r"(AnimatePresence:[^\n]+,)\n", re.MULTILINE)
addition = "\\1\n    LazyMotion: ({ children }) => children,\n    domAnimation: {},\n"
new = pattern.sub(addition, src, count=1)
if new != src:
    with open(path, 'w') as fh:
        fh.write(new)
    print(f"PATCH ok: {path}")
else:
    print(f"PATCH skipped (no AnimatePresence , match): {path}")
PY
  PATCHED=$((PATCHED+1))
done

echo ""
echo "Patched: $PATCHED test files"
echo "Skipped: $SKIPPED (already had LazyMotion or non-standard mock)"
