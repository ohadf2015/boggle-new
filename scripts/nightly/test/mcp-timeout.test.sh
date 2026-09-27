#!/bin/bash
# Test for the per-MCP-tool-call timeout fix — the root-cause fix for the
# exit-124 epidemic (12/37 lane-runs, 32%, on 2026-05-25).
#
# THE GUARANTEE under test:
#   headless_run propagates MCP_TOOL_TIMEOUT + MCP_TIMEOUT into the `claude`
#   subprocess environment, with sane shipped defaults, and an operator override
#   is respected. With these set, a hung Sentry/Supabase MCP tool call is killed
#   by Claude's client-side watchdog (returns a tool error → Claude continues)
#   instead of stalling the whole lane until the multi-minute wall-clock ceiling.
#
# SCOPE: this asserts the env var PROPAGATION only. The correctness of Claude's
# watchdog (kill-on-hang, return-error-and-continue) is upstream behaviour,
# documented at https://code.claude.com/docs/en/mcp.md and not re-tested here
# (that would require standing up a real hanging MCP server).
#
# Run: bash scripts/nightly/test/mcp-timeout.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"

PASS=0; FAIL=0
assert() { # name ; condition-string
  if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi
}

# --- harness: a fake `claude` that dumps its env, so we can prove the lane
#     subprocess actually inherits the timeout vars (stronger than checking the
#     parent shell's exports). -----------------------------------------------
SANDBOX=$(mktemp -d -t mcptimeout.XXXXXX)
trap 'rm -rf "$SANDBOX"' EXIT

mkdir -p "$SANDBOX/bin" "$SANDBOX/proj/docs/nightly"
cat > "$SANDBOX/bin/claude" <<'STUB'
#!/bin/bash
# Fake claude: capture the env we were launched with, then exit clean+fast.
env > "$CLAUDE_ENV_CAPTURE"
exit 0
STUB
chmod +x "$SANDBOX/bin/claude"

PROMPT="$SANDBOX/proj/prompt.md"
printf 'fixed date __TODAY__, no MCP needed.\n' > "$PROMPT"

run_headless() { # captures env into $1 ; extra env assignments are caller-set
  local capture="$1"
  : > "$capture"
  # Fresh subshell so each scenario starts from a clean env (the lib exports at
  # source time; we want to re-source per scenario to test override precedence).
  (
    export PATH="$SANDBOX/bin:$PATH"          # fake claude wins
    export PROJECT_DIR="$SANDBOX/proj"
    export CLAUDE_ENV_CAPTURE="$capture"
    unset ACTIVE_DIRECTIVES_FILE FEEDBACK_SUMMARY_FILE
    # shellcheck disable=SC1091
    source "$HERE/../lib/headless.sh"
    headless_run "test" "$PROMPT" "sonnet" 30 "$SANDBOX/log" >/dev/null 2>&1
  )
}

captured() { # var-name capture-file → echoes the value the subprocess saw
  grep -m1 "^$1=" "$2" | cut -d= -f2-
}

echo "── mcp-timeout: headless propagates per-tool + startup watchdogs ──"

# 1) Default ships: the claude subprocess sees MCP_TOOL_TIMEOUT, numeric, and
#    well under any lane wall-clock (so a hang aborts in seconds, not minutes).
CAP1="$SANDBOX/cap1.env"
run_headless "$CAP1"
TOOL_TO=$(captured MCP_TOOL_TIMEOUT "$CAP1")
START_TO=$(captured MCP_TIMEOUT "$CAP1")
assert "MCP_TOOL_TIMEOUT reaches the claude subprocess" '[ -n "$TOOL_TO" ]'
assert "MCP_TOOL_TIMEOUT is a positive integer (ms)"   '[[ "$TOOL_TO" =~ ^[0-9]+$ ]] && [ "$TOOL_TO" -gt 0 ]'
# Must be far below the SHORTEST lane wall-clock (lane 8 = 720s = 720000ms) so a
# single hung call can never eat a meaningful slice of the budget.
assert "MCP_TOOL_TIMEOUT << shortest lane wall-clock (<120000ms)" '[ "$TOOL_TO" -le 120000 ]'
assert "MCP_TIMEOUT (startup) reaches the subprocess, positive int" '[[ "$START_TO" =~ ^[0-9]+$ ]] && [ "$START_TO" -gt 0 ]'

# 2) Operator override is respected (var is set with :- default, not hardcoded).
CAP2="$SANDBOX/cap2.env"
MCP_TOOL_TIMEOUT=9999 MCP_TIMEOUT=8888 run_headless "$CAP2"
assert "operator MCP_TOOL_TIMEOUT override wins" '[ "$(captured MCP_TOOL_TIMEOUT "$CAP2")" = "9999" ]'
assert "operator MCP_TIMEOUT override wins"      '[ "$(captured MCP_TIMEOUT "$CAP2")" = "8888" ]'

echo "── mcp-timeout: orchestrator (run.sh) sets the same watchdogs ──"
# The summary composer in run.sh calls `claude` directly (NOT via headless.sh),
# so it has the same hang exposure — assert run.sh exports both vars too.
RUN_SH="$HERE/../run.sh"
assert "run.sh exports MCP_TOOL_TIMEOUT" 'grep -qE "^[[:space:]]*export MCP_TOOL_TIMEOUT" "$RUN_SH"'
assert "run.sh exports MCP_TIMEOUT"      'grep -qE "^[[:space:]]*export MCP_TIMEOUT" "$RUN_SH"'

echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
