#!/bin/bash
# Test for lib/repair-dropped.sh — the same-night fix attempt for gate-failing
# files (before they are dropped). Proves the prompt builder (pure part):
#   - names every gate-failing file
#   - embeds the gate error output
#   - carries the hard rules (fix-only, no new features, no commit)
#   - bounds the embedded gate output (tail, not the whole multi-MB log)
#
# Run: bash scripts/nightly/test/repair-dropped.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../lib" && pwd)"
# shellcheck disable=SC1091
. "$DIR/repair-dropped.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

ROOT=$(mktemp -d -t repair.XXXXXX)
trap 'rm -rf "$ROOT"' EXIT

BAD="$ROOT/bad.list"
printf '%s\n' "fe-next/components/A.tsx" "fe-next/hooks/useB.ts" > "$BAD"
GOUT="$ROOT/gate.out"
{ seq 1 500 | sed 's/^/noise line /'; echo "fe-next/components/A.tsx(12,5): error TS2345: bad arg"; echo "FAIL fe-next/hooks/useB.ts"; } > "$GOUT"
PROMPT="$ROOT/prompt.md"

echo "repair-dropped: prompt builder"
nightly_build_repair_prompt "$BAD" "$GOUT" "$PROMPT"
assert "prompt written"              '[ -s "$PROMPT" ]'
assert "names file A"                'grep -q "fe-next/components/A.tsx" "$PROMPT"'
assert "names file B"                'grep -q "fe-next/hooks/useB.ts" "$PROMPT"'
assert "embeds TS error"             'grep -q "error TS2345" "$PROMPT"'
assert "fix-only rule"               'grep -qi "ONLY fix" "$PROMPT"'
assert "no-commit rule"              'grep -qi "DO NOT COMMIT" "$PROMPT"'
assert "gate output bounded"         '! grep -q "noise line 1$" "$PROMPT"'
assert "keeps error tail"            'grep -q "noise line 500" "$PROMPT"'

echo
echo "repair-dropped: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
