#!/bin/bash
# test-parallel.sh - Run frontend tests in parallel shards
# Usage: ./scripts/test-parallel.sh [SHARDS]
# Default: 4 shards (each ~27s on 12-core machine)
#
# For CI, run each shard as a separate job:
#   npx vitest run --config vitest.config.ts --shard=1/4
#   npx vitest run --config vitest.config.ts --shard=2/4
#   etc.

set -e

SHARDS=${1:-4}
PIDS=()
RESULTS=()
TMPDIR=$(mktemp -d)
FAILED=0

echo "Running frontend tests in $SHARDS parallel shards..."

# Calculate workers per shard: leave 1 core for main thread per shard
TOTAL_CPUS=$(sysctl -n hw.ncpu 2>/dev/null || nproc 2>/dev/null || echo 8)
WORKERS_PER_SHARD=$(( (TOTAL_CPUS / SHARDS) - 1 ))
[ "$WORKERS_PER_SHARD" -lt 1 ] && WORKERS_PER_SHARD=1

echo "CPUs: $TOTAL_CPUS, Workers per shard: $WORKERS_PER_SHARD"

for i in $(seq 1 "$SHARDS"); do
  VITEST_MAX_WORKERS=$WORKERS_PER_SHARD npx vitest run --config vitest.config.ts --shard="$i/$SHARDS" --reporter=blob > "$TMPDIR/shard-$i.log" 2>&1 &
  PIDS+=($!)
done

for i in "${!PIDS[@]}"; do
  SHARD_NUM=$((i + 1))
  if wait "${PIDS[$i]}"; then
    RESULTS+=("✓ Shard $SHARD_NUM passed")
  else
    RESULTS+=("✗ Shard $SHARD_NUM FAILED")
    FAILED=1
  fi
done

echo ""
echo "=== Results ==="
for r in "${RESULTS[@]}"; do
  echo "  $r"
done

# Show duration from each shard
for i in $(seq 1 "$SHARDS"); do
  DUR=$(grep "Duration" "$TMPDIR/shard-$i.log" 2>/dev/null | tail -1 | sed 's/.*Duration /  Shard '$i': /')
  echo "$DUR"
done

# Show failures if any
if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "=== Failures ==="
  for i in $(seq 1 "$SHARDS"); do
    if grep -q "failed" "$TMPDIR/shard-$i.log" 2>/dev/null; then
      grep "FAIL\|failed" "$TMPDIR/shard-$i.log" | head -5
    fi
  done
fi

rm -rf "$TMPDIR"
exit $FAILED
