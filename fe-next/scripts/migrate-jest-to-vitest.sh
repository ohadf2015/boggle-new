#!/bin/bash
# Bulk migrate Jest test files to Vitest compatibility
# Safe to run multiple times (idempotent)
#
# What it does:
# 1. jest.mock( → vi.mock(
# 2. jest.fn( → vi.fn(
# 3. jest.spyOn( → vi.spyOn(
# 4. jest.clearAllMocks() → vi.clearAllMocks()
# 5. jest.resetAllMocks() → vi.resetAllMocks()
# 6. jest.restoreAllMocks() → vi.restoreAllMocks()
# 7. jest.resetModules() → vi.resetModules()
# 8. jest.useFakeTimers() → vi.useFakeTimers()
# 9. jest.useRealTimers() → vi.useRealTimers()
# 10. jest.advanceTimersByTime( → vi.advanceTimersByTime(
# 11. jest.runAllTimers() → vi.runAllTimers()
# 12. jest.requireActual( → vi.importActual(
#
# What it does NOT touch:
# - backend/ files (stay on Jest)
# - node_modules/
# - .next/
# - jest.Mock type annotations (keep for TS compat)

set -e

cd "$(dirname "$0")/.."

echo "=== Jest → Vitest Migration Script ==="
echo ""

# Count files to process
FILES=$(find components app contexts stores host player types lib shared __tests__ hooks utils \
  -name "*.test.*" -type f \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  2>/dev/null | sort)

TOTAL=$(echo "$FILES" | wc -l | tr -d ' ')
echo "Found $TOTAL test files to process"
echo ""

MODIFIED=0

for f in $FILES; do
  CHANGED=false

  # Check if file has any jest. calls (skip if already migrated)
  if grep -q 'jest\.\(mock\|fn\|spyOn\|clearAllMocks\|resetAllMocks\|restoreAllMocks\|resetModules\|useFakeTimers\|useRealTimers\|advanceTimersByTime\|runAllTimers\|requireActual\)' "$f" 2>/dev/null; then
    # Core replacements
    sed -i '' \
      -e 's/jest\.mock(/vi.mock(/g' \
      -e 's/jest\.fn(/vi.fn(/g' \
      -e 's/jest\.fn()/vi.fn()/g' \
      -e 's/jest\.spyOn(/vi.spyOn(/g' \
      -e 's/jest\.clearAllMocks()/vi.clearAllMocks()/g' \
      -e 's/jest\.resetAllMocks()/vi.resetAllMocks()/g' \
      -e 's/jest\.restoreAllMocks()/vi.restoreAllMocks()/g' \
      -e 's/jest\.resetModules()/vi.resetModules()/g' \
      -e 's/jest\.useFakeTimers()/vi.useFakeTimers()/g' \
      -e 's/jest\.useRealTimers()/vi.useRealTimers()/g' \
      -e 's/jest\.advanceTimersByTime(/vi.advanceTimersByTime(/g' \
      -e 's/jest\.runAllTimers()/vi.runAllTimers()/g' \
      -e 's/jest\.runAllTicks()/vi.runAllTicks()/g' \
      -e 's/jest\.requireActual(/vi.importActual(/g' \
      -e 's/jest\.requireMock(/vi.importMock(/g' \
      "$f"
    CHANGED=true
  fi

  if $CHANGED; then
    MODIFIED=$((MODIFIED + 1))
  fi
done

echo "Modified $MODIFIED / $TOTAL files"
echo ""
echo "=== Running Vitest to check results ==="
npx vitest run utils/ hooks/ 2>&1 | grep "Test Files\|Tests " | tail -2
echo ""
echo "Done. Run 'npx vitest run' to see full results."
