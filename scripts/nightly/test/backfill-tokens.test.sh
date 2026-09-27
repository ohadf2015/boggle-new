#!/bin/bash
# Test for lib/intel/backfill-tokens.sh. Proves (no live API — fixture claude.json + stubbed curl):
#   - backfills SUPABASE_ACCESS_TOKEN / SENTRY_AUTH_TOKEN from ~/.claude.json when unset
#   - parses SENTRY_ORG_SLUG from the sentry MCP args (--organization-slug=…)
#   - NEVER overrides an already-set env value
#   - no-op (exit 0, vars stay empty) when claude.json or jq absent / key missing
#   - auto-discovers SENTRY_PROJECT_SLUG via REST only when exactly ONE project exists
#
# Run: bash scripts/nightly/test/backfill-tokens.test.sh
set -uo pipefail

HELPER="$(cd "$(dirname "$0")/../lib/intel" && pwd)/backfill-tokens.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t backfilltest.XXXXXX)
trap 'rm -rf "$ROOT"' EXIT

# Fixture ~/.claude.json with sentry + supabase server defs.
cat > "$ROOT/claude.json" <<'JSON'
{
  "mcpServers": {
    "sentry":   { "type":"stdio","command":"npx","args":["-y","@sentry/mcp-server@latest","--organization-slug=lexiclash"],"env":{"SENTRY_ACCESS_TOKEN":"sntryu_FIXTURE"} },
    "supabase": { "type":"stdio","command":"npx","args":["-y","@supabase/mcp-server-supabase","--project-ref=hdtmpkicuxvtmvrmtybx"],"env":{"SUPABASE_ACCESS_TOKEN":"sbp_FIXTURE"} },
    "posthog":  { "type":"http","url":"https://mcp.posthog.com/mcp" }
  }
}
JSON

# Stub curl that returns a Sentry projects array. PROJECTS_FIXTURE controls 1 vs many.
BIN="$ROOT/bin"; mkdir -p "$BIN"
cat > "$BIN/curl" <<STUB
#!/bin/bash
cat "\${PROJECTS_FIXTURE:-$ROOT/one-project.json}"
STUB
chmod +x "$BIN/curl"
echo '[{"slug":"javascript-nextjs"}]' > "$ROOT/one-project.json"
echo '[{"slug":"web-a"},{"slug":"web-b"}]' > "$ROOT/many-projects.json"

echo "  backfill-tokens:"

# 1+2+3 — backfills supabase + sentry token + org slug from fixture (project slug preset to skip net)
( export CLAUDE_CONFIG_JSON="$ROOT/claude.json"; export SENTRY_PROJECT_SLUG="preset"
  unset SUPABASE_ACCESS_TOKEN SENTRY_AUTH_TOKEN SENTRY_ORG_SLUG 2>/dev/null || true
  . "$HELPER"; backfill_intel_tokens
  [ "$SUPABASE_ACCESS_TOKEN" = "sbp_FIXTURE" ] && [ "$SENTRY_AUTH_TOKEN" = "sntryu_FIXTURE" ] && [ "$SENTRY_ORG_SLUG" = "lexiclash" ] ) \
  && R1=0 || R1=1
assert "backfills supabase+sentry token and parses org slug" "[ $R1 -eq 0 ]"

# 4 — never overrides a value already set in env
( export CLAUDE_CONFIG_JSON="$ROOT/claude.json"; export SENTRY_PROJECT_SLUG="preset"
  export SUPABASE_ACCESS_TOKEN="PRESET_KEEP"
  unset SENTRY_AUTH_TOKEN SENTRY_ORG_SLUG 2>/dev/null || true
  . "$HELPER"; backfill_intel_tokens
  [ "$SUPABASE_ACCESS_TOKEN" = "PRESET_KEEP" ] ) && R4=0 || R4=1
assert "does not override an already-set value" "[ $R4 -eq 0 ]"

# 5 — no-op when claude.json missing (returns 0, var stays empty)
( export CLAUDE_CONFIG_JSON="$ROOT/does-not-exist.json"; export SENTRY_PROJECT_SLUG="preset"
  unset SUPABASE_ACCESS_TOKEN SENTRY_AUTH_TOKEN SENTRY_ORG_SLUG 2>/dev/null || true
  . "$HELPER"; backfill_intel_tokens; rc=$?
  [ $rc -eq 0 ] && [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] ) && R5=0 || R5=1
assert "no-op + exit 0 when claude.json absent" "[ $R5 -eq 0 ]"

# 6 — auto-discovers SENTRY_PROJECT_SLUG when exactly one project (stub curl)
( export CLAUDE_CONFIG_JSON="$ROOT/claude.json"; export PATH="$BIN:$PATH"
  export PROJECTS_FIXTURE="$ROOT/one-project.json"
  unset SUPABASE_ACCESS_TOKEN SENTRY_AUTH_TOKEN SENTRY_ORG_SLUG SENTRY_PROJECT_SLUG 2>/dev/null || true
  . "$HELPER"; backfill_intel_tokens
  [ "$SENTRY_PROJECT_SLUG" = "javascript-nextjs" ] ) && R6=0 || R6=1
assert "auto-discovers project slug when single project" "[ $R6 -eq 0 ]"

# 7 — leaves SENTRY_PROJECT_SLUG unset when multiple projects (ambiguous)
( export CLAUDE_CONFIG_JSON="$ROOT/claude.json"; export PATH="$BIN:$PATH"
  export PROJECTS_FIXTURE="$ROOT/many-projects.json"
  unset SUPABASE_ACCESS_TOKEN SENTRY_AUTH_TOKEN SENTRY_ORG_SLUG SENTRY_PROJECT_SLUG 2>/dev/null || true
  . "$HELPER"; backfill_intel_tokens
  [ -z "${SENTRY_PROJECT_SLUG:-}" ] ) && R7=0 || R7=1
assert "leaves project slug unset when multiple projects" "[ $R7 -eq 0 ]"

echo; echo "  backfill-tokens: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
