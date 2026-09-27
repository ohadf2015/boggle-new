#!/bin/bash
# Test for lib/hooks/lane-time-guard.sh — the PreToolUse guard that bounds the
# three confirmed lane-timeout sinks:
#   1. edit sprawl       — new files past the 80% finalize cutoff / file cap (pre-existing)
#   2. heavy full-repo Bash — tsc/build/test (~60s each); the gate re-verifies after the
#                            lane, so these are capped + forbidden past finalize
#   3. runaway research  — WebSearch/WebFetch + read-only intel MCP past the 60% window
#
# Uses the LEXI_FAKE_NOW seam to drive wall-clock deterministically. Deadline file
# is "START FINALIZE HARD"; with budget 900s → research window opens at +540s (60%),
# finalize at +720s (80%), hard at +900s.
#
# Run: bash scripts/nightly/test/lane-time-guard.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HOOK="$HERE/../lib/hooks/lane-time-guard.sh"

PASS=0; FAIL=0
check() { # <desc> <got> <expected>
  if [ "$2" = "$3" ]; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1));
  else printf '    ✗ %s   [got=%s want=%s]\n' "$1" "$2" "$3"; FAIL=$((FAIL+1)); fi
}

# decision <json> <fake_now> → "deny" | "allow" (allow = explicit allow OR silent exit 0)
decision() {
  local out d
  out=$(printf '%s' "$1" | LEXI_FAKE_NOW="$2" bash "$HOOK" 2>/dev/null)
  [ -z "$out" ] && { printf 'allow'; return; }
  d=$(printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecision // "allow"' 2>/dev/null || echo allow)
  printf '%s' "$d"
}

fresh_deadline() {
  # START=1000000, FINALIZE=+720 (80% of 900), HARD=+900 → research opens +540
  DF=$(mktemp); printf '1000000 1000720 1000900\n' > "$DF"
  FS=$(mktemp); : > "$FS"
  rm -f "${DF}.heavy" 2>/dev/null || true
  export LEXI_LANE_DEADLINE_FILE="$DF" LEXI_LANE_FILESET_FILE="$FS" LEXI_LANE_FILE_CAP=8
}
clean_deadline() { rm -f "$DF" "$FS" "${DF}.heavy" 2>/dev/null || true; }

echo "── lane-time-guard: inert outside a lane ──"
unset LEXI_LANE_DEADLINE_FILE 2>/dev/null || true
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"npm run build"}}' 1000800)
check "no deadline file → silent no-op (allow)" "$g" allow

echo "── lane-time-guard: heavy full-repo Bash ──"
fresh_deadline
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"cd fe-next && npx tsc --noEmit"}}' 1000100)
check "heavy 'tsc --noEmit' mid-run, under cap → allowed" "$g" allow
clean_deadline

fresh_deadline
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"npm run build"}}' 1000800)
check "heavy 'npm run build' past finalize → DENY" "$g" deny
fresh_deadline   # reset heavy counter for an independent assertion
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"npm run test"}}' 1000800)
check "heavy 'npm run test' past finalize → DENY" "$g" deny
clean_deadline

# Cap: with HEAVY_CAP=2, the 3rd heavy command is denied even before finalize.
# (The counter increments AFTER the check, so calls 1+2 are allowed, 3 is denied.)
fresh_deadline
decision '{"tool_name":"Bash","tool_input":{"command":"npx tsc --noEmit"}}' 1000100 >/dev/null
decision '{"tool_name":"Bash","tool_input":{"command":"npx tsc --noEmit"}}' 1000150 >/dev/null
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"npx tsc --noEmit"}}' 1000200)
check "heavy command over cap (3rd run) → DENY even mid-run" "$g" deny
clean_deadline

echo "── lane-time-guard: non-heavy Bash never denied ──"
fresh_deadline
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"git status"}}' 1000100)
check "git status mid-run → allowed" "$g" allow
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"npx eslint components/Foo.tsx"}}' 1000800)
check "eslint on changed files even past finalize → allowed" "$g" allow
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"git checkout -- components/Foo.tsx"}}' 1000850)
check "git checkout revert past finalize → allowed" "$g" allow
clean_deadline

echo "── lane-time-guard: dev-servers / backgrounding blocked (hang prevention) ──"
fresh_deadline
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"npm run dev"}}' 1000100)
check "npm run dev → DENY (leaks output fd → false post-completion timeout)" "$g" deny
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"cd fe-next && next dev -p 3005"}}' 1000100)
check "next dev → DENY" "$g" deny
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"echo hi","run_in_background":true}}' 1000100)
check "run_in_background:true → DENY" "$g" deny
g=$(decision '{"tool_name":"Bash","tool_input":{"command":"echo hi"}}' 1000100)
check "foreground echo → allowed" "$g" allow
clean_deadline

echo "── lane-time-guard: research tools bounded past the 60% window ──"
fresh_deadline
g=$(decision '{"tool_name":"WebSearch","tool_input":{"query":"x"}}' 1000100)
check "WebSearch BEFORE research window (t<+540) → allowed" "$g" allow
g=$(decision '{"tool_name":"WebSearch","tool_input":{"query":"x"}}' 1000600)
check "WebSearch AFTER research window (t>+540) → DENY" "$g" deny
g=$(decision '{"tool_name":"WebFetch","tool_input":{"url":"x"}}' 1000600)
check "WebFetch after research window → DENY" "$g" deny
g=$(decision '{"tool_name":"mcp__sentry__search_issues","tool_input":{}}' 1000600)
check "mcp Sentry (read-only intel) after research window → DENY" "$g" deny
g=$(decision '{"tool_name":"mcp__ahrefs__authenticate","tool_input":{}}' 1000600)
check "mcp Ahrefs after research window → DENY" "$g" deny
clean_deadline

echo "── lane-time-guard: write-capable MCP is NEVER gated (can still ship) ──"
fresh_deadline
g=$(decision '{"tool_name":"mcp__supabase__apply_migration","tool_input":{}}' 1000600)
check "mcp Supabase apply_migration after research window → allowed (write needed to ship)" "$g" allow
g=$(decision '{"tool_name":"mcp__plugin_railway_railway__deploy","tool_input":{}}' 1000600)
check "mcp Railway deploy after research window → allowed" "$g" allow
clean_deadline

echo "── lane-time-guard: edit cutoffs still enforced (regression) ──"
fresh_deadline
printf 'fe-next/components/Existing.tsx\n' > "$FS"
g=$(decision '{"tool_name":"Write","tool_input":{"file_path":"fe-next/components/New.tsx"}}' 1000800)
check "NEW file past finalize → DENY" "$g" deny
g=$(decision '{"tool_name":"Write","tool_input":{"file_path":"docs/nightly/artifacts/lane-01.md"}}' 1000950)
check "docs/ artifact write past hard cutoff → allowed (never give up floor)" "$g" allow
clean_deadline

echo
echo "lane-time-guard: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
