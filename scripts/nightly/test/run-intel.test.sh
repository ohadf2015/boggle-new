#!/bin/bash
# Test for lib/intel/run-intel.sh — the Phase 0 driver. Proves the STABILITY
# guarantee (advisor's make-or-break condition):
#   - a HUNG collector costs only its own timeout → stale fallback, does NOT block
#   - a MISSING collector → stale fallback, does NOT abort the phase
#   - a healthy collector contributes its signals
#   - brief.json is ALWAYS produced
#   - the whole phase finishes well under a sane bound (no runaway)
# Plus the deferred registry invariant: every REAL registered collector exists.
#
# Run: bash scripts/nightly/test/run-intel.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
DRIVER="$DIR/run-intel.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t runintel.XXXXXX)
export INTEL_ROOT="$ROOT/intel"
export INTEL_DIR="$INTEL_ROOT/2026-05-29"
mkdir -p "$INTEL_DIR"
COLL="$ROOT/collectors"; mkdir -p "$COLL"
trap 'rm -rf "$ROOT"' EXIT

# Temp registry: a healthy collector, a hanging one (per-collector timeout 1s),
# and a missing one. Source the REAL registry for intel_registry_lint, then
# override INTEL_SOURCES.
cat > "$COLL/registry.sh" <<EOF
. "$DIR/registry.sh"
INTEL_SOURCES=( "good:collect-good.sh:5" "hang:collect-hang.sh:1" "missing:collect-missing.sh:5" )
EOF

cat > "$COLL/collect-good.sh" <<'EOF'
#!/bin/bash
jq -n '{_meta:{source:"good",collected_at:"2026-05-29T02:00:00Z",stale:false,stale_since:null,source_ok:true,note:""},
        signals:[{source:"good",kind:"perf",title:"good signal",metric:"m",magnitude:10,reach:5,severity:0.5,lane:"02-perf",target_metric:"good:1",evidence:"",effort:"S",fingerprint:"good:1"}]}' \
  > "$INTEL_DIR/good.json"
EOF
chmod +x "$COLL/collect-good.sh"
printf '#!/bin/bash\nsleep 5\n' > "$COLL/collect-hang.sh"; chmod +x "$COLL/collect-hang.sh"

# Seed prior snapshots so stale_fallback has last-good for hang + missing.
PRIOR="$INTEL_ROOT/2026-05-28"; mkdir -p "$PRIOR"
for s in hang missing; do
  jq -n --arg s "$s" '{_meta:{source:$s,collected_at:"2026-05-28T02:00:00Z",stale:false,stale_since:null,source_ok:true,note:""},
        signals:[{source:$s,kind:"perf",title:($s+" prior"),metric:"m",magnitude:1,reach:0,severity:0.3,lane:"02-perf",target_metric:($s+":1"),evidence:"",effort:"M",fingerprint:($s+":1")}]}' \
    > "$PRIOR/$s.json"
done

echo "run-intel: drive with hang + missing + good (per-collector timeouts contain the hang)"
SAFE_PATH="/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin"
start=$(date +%s)
INTEL_COLLECTORS_DIR="$COLL" INTEL_ROOT="$INTEL_ROOT" INTEL_DIR="$INTEL_DIR" TODAY=2026-05-29 \
  PATH="$SAFE_PATH" bash "$DRIVER"
rc=$?
elapsed=$(( $(date +%s) - start ))

assert "driver exits 0"                       '[ "$rc" -eq 0 ]'
assert "phase finished under 30s (no runaway)" '[ "$elapsed" -lt 30 ]'
assert "good source wrote real signals"       '[ "$(jq -r ._meta.source_ok "$INTEL_DIR/good.json")" = "true" ]'
assert "hang source → stale fallback"         '[ "$(jq -r ._meta.stale "$INTEL_DIR/hang.json")" = "true" ]'
assert "hang kept prior signal (last-good)"   '[ "$(jq ".signals|length" "$INTEL_DIR/hang.json")" = "1" ]'
assert "missing source → stale fallback"      '[ "$(jq -r ._meta.stale "$INTEL_DIR/missing.json")" = "true" ]'
assert "brief.json produced"                  '[ -f "$INTEL_DIR/brief.json" ]'
assert "brief.md produced"                    '[ -f "$INTEL_DIR/brief.md" ]'
assert "brief includes good signal"           'jq -e ".items[] | select(.fingerprint==\"good:1\")" "$INTEL_DIR/brief.json" >/dev/null'
assert "stale sources flagged in brief _meta" '[ "$(jq "._meta.sources_stale | length" "$INTEL_DIR/brief.json")" -ge 2 ]'

echo "run-intel: every REAL registered collector exists on disk"
# shellcheck disable=SC1090
( . "$DIR/registry.sh"
  miss=0
  for e in "${INTEL_SOURCES[@]}"; do s=$(cut -d: -f2 <<<"$e"); [ -f "$DIR/$s" ] || { echo "MISSING $s"; miss=1; }; done
  exit $miss )
assert "all registered collect-*.sh present (post-P1b)" '[ "$?" -eq 0 ]'

echo
echo "run-intel: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
