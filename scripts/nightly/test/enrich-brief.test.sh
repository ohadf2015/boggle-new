#!/bin/bash
# Test for lib/intel/enrich-brief.sh — brief.json → brief.md. Proves:
#   - ALWAYS produces brief.md (deterministic render) even with no LLM
#   - LLM enrichment is best-effort: a HUNG/failing `claude` falls back to the
#     deterministic render (never leaves lanes without a brief — advisor condition)
#   - the deterministic render lists items with lane + score
#
# Run: bash scripts/nightly/test/enrich-brief.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib/intel" && pwd)"
ENR="$DIR/enrich-brief.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t enrich.XXXXXX)
INTEL_DIR="$ROOT/2026-05-29"; mkdir -p "$INTEL_DIR"
BIN="$ROOT/bin"; mkdir -p "$BIN"
trap 'rm -rf "$ROOT"' EXIT

cat > "$INTEL_DIR/brief.json" <<'JSON'
{"_meta":{"generated_at":"2026-05-29T02:00:00Z","n_signals":2,"sources_ok":["posthog"],"sources_stale":["sentry"]},
 "items":[
   {"source":"posthog","kind":"perf","title":"Slow LCP on /en/multiplayer","metric":"lcp_avg_ms","magnitude":5806,"reach":0,"severity":0.9,"lane":"02-perf","target_metric":"posthog:lcp:/en/multiplayer","evidence":"/en/multiplayer","effort":"M","fingerprint":"posthog:lcp:/en/multiplayer","score":0.9,"rank":1},
   {"source":"posthog","kind":"funnel","title":"Rage clicks on /en/play","metric":"rageclicks_24h","magnitude":57,"reach":57,"severity":0.6,"lane":"03-engagement","target_metric":"posthog:rageclick:/en/play","evidence":"/en/play","effort":"S","fingerprint":"posthog:rageclick:/en/play","score":0.55,"rank":2}
 ],
 "by_lane":{"02-perf":[{"title":"Slow LCP on /en/multiplayer","score":0.9}],"03-engagement":[{"title":"Rage clicks on /en/play","score":0.55}]}}
JSON

echo "enrich-brief: deterministic render with NO claude"
SAFE_PATH="/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin"
INTEL_DIR="$INTEL_DIR" PATH="$SAFE_PATH" bash "$ENR"; rc=$?
BMD="$INTEL_DIR/brief.md"
assert "exits 0 without claude"             '[ "$rc" -eq 0 ]'
assert "brief.md produced"                  '[ -f "$BMD" ]'
assert "brief.md mentions a lane"           'grep -q "02-perf" "$BMD"'
assert "brief.md mentions a score"          'grep -q "score" "$BMD"'
assert "brief.md lists the LCP item"        'grep -q "Slow LCP" "$BMD"'
assert "brief.md notes stale source"        'grep -qi "sentry" "$BMD"'

echo "enrich-brief: LLM hang falls back to deterministic"
cat > "$BIN/claude" <<'STUB'
#!/bin/bash
sleep 99   # simulate a hung LLM call
echo "NARRATIVE THAT SHOULD NEVER APPEAR"
STUB
chmod +x "$BIN/claude"
rm -f "$BMD"
NIGHTLY_ENRICH_BRIEF=1 NIGHTLY_ENRICH_TIMEOUT=1 INTEL_DIR="$INTEL_DIR" PATH="$BIN:$SAFE_PATH" bash "$ENR"; rc=$?
assert "exits 0 despite LLM hang"           '[ "$rc" -eq 0 ]'
assert "brief.md still produced"            '[ -f "$BMD" ]'
assert "did NOT use hung LLM output"        '! grep -q "SHOULD NEVER APPEAR" "$BMD"'
assert "fell back to deterministic render"  'grep -q "Slow LCP" "$BMD"'

echo
echo "enrich-brief: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
