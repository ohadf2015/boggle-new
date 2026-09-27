#!/bin/bash
# Test for lib/mcp-config.sh. Proves (fixture claude.json, no live anything):
#   - emits the correct MCP server subset per lane (data lanes get their servers)
#   - lanes needing none (04/06/07/08) get a valid EMPTY {"mcpServers":{}} → zero boot
#   - output is always valid JSON with an mcpServers object
#   - a requested server absent from claude.json is skipped, not errored
#   - returns nonzero (caller falls back) when jq/claude.json unavailable for a needy lane
#
# Run: bash scripts/nightly/test/mcp-config.test.sh
set -uo pipefail

HELPER="$(cd "$(dirname "$0")/../lib" && pwd)/mcp-config.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t mcpcfgtest.XXXXXX); trap 'rm -rf "$ROOT"' EXIT
CJ="$ROOT/claude.json"
cat > "$CJ" <<'JSON'
{ "mcpServers": {
  "sentry":    {"type":"stdio","command":"npx","args":["x"],"env":{"SENTRY_ACCESS_TOKEN":"t"}},
  "supabase":  {"type":"stdio","command":"npx","args":["y"],"env":{"SUPABASE_ACCESS_TOKEN":"t"}},
  "posthog":   {"type":"http","url":"https://mcp.posthog.com/mcp"},
  "mcp-image": {"type":"stdio","command":"npx","args":["z"]},
  "vercel":    {"type":"stdio","command":"npx","args":["v"]},
  "figma":     {"type":"stdio","command":"npx","args":["f"]}
} }
JSON

. "$HELPER"
echo "  mcp-config:"

# 01-triage → sentry+supabase+posthog (3, and NOT vercel/figma)
OUT="$ROOT/01.json"; build_lane_mcp_config "01-triage" "$OUT" "$CJ"
N=$(jq '.mcpServers|length' "$OUT" 2>/dev/null)
assert "01-triage selects exactly 3 servers" "[ \"$N\" = 3 ]"
assert "01-triage includes sentry+supabase+posthog" "jq -e '.mcpServers|has(\"sentry\") and has(\"supabase\") and has(\"posthog\")' '$OUT' >/dev/null"
assert "01-triage excludes vercel/figma" "jq -e '.mcpServers|(has(\"vercel\")|not) and (has(\"figma\")|not)' '$OUT' >/dev/null"

# 03-engagement → posthog only
OUT="$ROOT/03.json"; build_lane_mcp_config "03-engagement" "$OUT" "$CJ"
assert "03-engagement selects posthog only" "[ \"\$(jq -c '.mcpServers|keys' '$OUT')\" = '[\"posthog\"]' ]"

# 05-landing → posthog + mcp-image
OUT="$ROOT/05.json"; build_lane_mcp_config "05-landing" "$OUT" "$CJ"
assert "05-landing includes mcp-image+posthog" "jq -e '.mcpServers|has(\"mcp-image\") and has(\"posthog\")' '$OUT' >/dev/null"

# 06-seo / 07 / 08 / 04 → empty {} (zero MCP boot)
for L in 04-competitor 06-seo 07-self-learn 08-adsense; do
  OUT="$ROOT/$L.json"; build_lane_mcp_config "$L" "$OUT" "$CJ"; rc=$?
  assert "$L → empty mcpServers, rc=0" "[ \$rc -eq 0 ] && [ \"\$(jq -c '.mcpServers' '$OUT')\" = '{}' ]"
done

# Requested-but-absent server is skipped (pretend claude.json lacks supabase)
CJ2="$ROOT/no-supabase.json"; jq 'del(.mcpServers.supabase)' "$CJ" > "$CJ2"
OUT="$ROOT/01b.json"; build_lane_mcp_config "01-triage" "$OUT" "$CJ2"
assert "absent server skipped not errored (01-triage→2)" "[ \"\$(jq '.mcpServers|length' '$OUT')\" = 2 ]"

# Needy lane with missing claude.json → nonzero (caller falls back to no-strict)
OUT="$ROOT/01c.json"; build_lane_mcp_config "01-triage" "$OUT" "$ROOT/nope.json"; rc=$?
assert "needy lane + missing claude.json → rc!=0" "[ \$rc -ne 0 ]"

# Empty-needs lane never needs claude.json → still rc=0 even if file missing
OUT="$ROOT/06b.json"; build_lane_mcp_config "06-seo" "$OUT" "$ROOT/nope.json"; rc=$?
assert "empty lane + missing claude.json → rc=0, {}" "[ \$rc -eq 0 ] && [ \"\$(jq -c '.mcpServers' '$OUT')\" = '{}' ]"

echo; echo "  mcp-config: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
