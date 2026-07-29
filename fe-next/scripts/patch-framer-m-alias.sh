#!/usr/bin/env bash
# After patch-framer-motion-mocks.sh adds LazyMotion+domAnimation, some
# components (e.g. XpProgressBar, LevelBadge) use `m.X` instead of `motion.X`.
# Tests that mock framer-motion with only `motion:` need `m:` alias too.
# This script adds `m: motion`-style alias where missing. Idempotent.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DRY=${1:-}

FILES=$(grep -rln "vi.mock('framer-motion'" \
  "$REPO/components" "$REPO/__tests__" "$REPO/app" "$REPO/hooks" "$REPO/lib" 2>/dev/null || true)

PATCHED=0
SKIPPED=0
for f in $FILES; do
  # Skip files that already have `m:` in the mock body (within ~50 lines after vi.mock).
  if awk '/vi.mock\(.framer-motion./,/^}\)\)/' "$f" | grep -qE "^\s*m\s*:"; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  # Skip if no `motion:` in mock to alias from.
  if ! awk '/vi.mock\(.framer-motion./,/^}\)\)/' "$f" | grep -qE "^\s*motion\s*:"; then
    SKIPPED=$((SKIPPED+1))
    continue
  fi

  if [ "$DRY" = "--dry-run" ]; then
    echo "WOULD alias m: ${f#$REPO/}"
    continue
  fi

  python3 - "$f" <<'PY'
import re, sys
path = sys.argv[1]
with open(path) as fh:
    src = fh.read()

# Inside the `vi.mock('framer-motion', ...)` block, find the `motion:` value
# and after its closing `,` insert `  m: <same-value>,\n`.
# Simple shape: `motion: { ... },` on one or multiple lines.
# We match the motion: ... } block via brace counter.

mock_re = re.compile(r"vi\.mock\(\s*['\"]framer-motion['\"],\s*\(\)\s*=>\s*", re.MULTILINE)
m = mock_re.search(src)
if not m:
    print(f"NO MATCH (no vi.mock): {path}")
    sys.exit(0)

# Find motion: occurrence after the mock start.
motion_re = re.compile(r"^(\s*)motion\s*:\s*", re.MULTILINE)
mm = motion_re.search(src, m.end())
if not mm:
    print(f"NO motion: in mock: {path}")
    sys.exit(0)
indent = mm.group(1)
val_start = mm.end()

# Determine motion value end. If next char is `{`, walk braces.
if val_start < len(src) and src[val_start] == '{':
    depth = 0
    i = val_start
    while i < len(src):
        c = src[i]
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                # Find next `,` after this brace.
                end = i + 1
                while end < len(src) and src[end] in ' \t':
                    end += 1
                if end < len(src) and src[end] == ',':
                    end += 1
                motion_value = src[val_start:end]
                break
        i += 1
    else:
        print(f"unbalanced braces: {path}")
        sys.exit(0)
else:
    # Identifier value, e.g. `motion: motionObj,`
    end_match = re.search(r",", src[val_start:])
    if not end_match:
        print(f"no terminating comma: {path}")
        sys.exit(0)
    end = val_start + end_match.end()
    motion_value = src[val_start:end]

# Insert `m: <motion_value>` after the motion line.
insert_at = val_start + len(motion_value)
addition = f"\n{indent}m: {motion_value.rstrip()}"
new = src[:insert_at] + addition + src[insert_at:]
if new != src:
    with open(path, 'w') as fh:
        fh.write(new)
    print(f"M-ALIAS ok: {path}")
PY
  PATCHED=$((PATCHED+1))
done

echo ""
echo "Patched: $PATCHED test files"
echo "Skipped: $SKIPPED (already had m: alias or no motion: shape)"
