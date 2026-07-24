#!/bin/bash
# Test for nightly_bisect_offenders() — the SUBSET-PEEL BISECT BACKSTOP
# (2026-07-24, the deferred "class-killer").
#
# The recurring nightly failure class: the gate goes red, no offender is
# positively attributable (parser one format behind), so the whole night's
# authored CODE is dropped (docs-only salvage). 60% of the last 20 nightlies
# shipped ZERO code this way — even when only ONE file was actually broken
# (2026-07-23 scrabble: 1 real offender + 9 innocents, all 10 dropped).
#
# Bisect decides purely on gate PASS/FAIL (never parses output), so it is
# immune to the "parser one format behind" class. It ships the innocent
# majority and drops only the isolated offender(s).
#
# Two layers:
#   1. UNIT — inject a MOCK gate (NIGHTLY_BISECT_GATE_FN) so the algorithm
#      (grouping / incremental accept / second-chance / offender isolation /
#      full-gate re-verify) is locked without a real npm build.
#   2. INTEGRATION — drive the REAL worktree gate via the NIGHTLY_GATE_CMD seam
#      to prove the wiring end-to-end (worktree apply + isolation + verdict).
#
# Run: bash scripts/nightly/test/bisect-offenders.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/gate-isolated.sh"

RUN_LOG=/dev/null
log() { :; }   # silence

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

# ── MOCK GATE ───────────────────────────────────────────────────────────────
# Fails (rc 1) iff the trial list contains any file in $BAD_QUICK (quick mode)
# or $BAD_FULL (full mode; defaults to BAD_QUICK). Set MOCK_WEDGE=1 to simulate
# an inconclusive wedge (rc 3). Newline-separated repo-relative paths.
mock_gate() {
  local list="$1" mode="${2:-quick}" f badset
  [ -n "${MOCK_WEDGE:-}" ] && return 3
  badset="${BAD_QUICK:-}"
  [ "$mode" = full ] && badset="${BAD_FULL:-$BAD_QUICK}"
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    if [ -n "$badset" ] && printf '%s\n' "$badset" | grep -qxF -- "$f"; then return 1; fi
  done < "$list"
  return 0
}
export NIGHTLY_BISECT_GATE_FN=mock_gate

mklist() { local t; t=$(mktemp); printf '%s\n' "$@" > "$t"; echo "$t"; }

echo "── bisect: 07-23 golden regression (1 offender + 9 innocents) ──"
# THIS TEST IS THE 'prevent recurrence' DELIVERABLE: it fails if anyone
# reintroduces drop-all for the single-offender case.
BAD_QUICK="fe-next/app/[locale]/scrabble-alternative-online/page.tsx"
ALL=$(mklist \
  "fe-next/app/[locale]/scrabble-alternative-online/page.tsx" \
  "fe-next/app/[locale]/shiritori/solo/page.tsx" \
  "fe-next/app/[locale]/word-games-for-the-classroom/page.tsx" \
  "fe-next/lib/experiments.ts" \
  "fe-next/server/redisAdapter.ts" \
  "fe-next/utils/growthTracking.ts" \
  "fe-next/components/a.tsx" "fe-next/components/b.tsx" \
  "fe-next/components/c.tsx" "fe-next/components/d.tsx")
OUT=$(mktemp)
nightly_bisect_offenders "$ALL" "$OUT"; rc=$?
assert "returns 0 (isolated a shippable subset)" "[ $rc -eq 0 ]"
assert "offenders == exactly the scrabble page" \
  "[ \"\$(cat \"$OUT\")\" = 'fe-next/app/[locale]/scrabble-alternative-online/page.tsx' ]"
assert "drops exactly 1 file (ships the other 9)" "[ \$(grep -c . \"$OUT\") -eq 1 ]"
rm -f "$ALL" "$OUT"; unset BAD_QUICK BAD_FULL

echo "── bisect: translations bisect as ONE atomic unit ──"
# A split (ship en.js, drop he.js) ships orphan i18n keys the BUILD can't catch.
# If ANY locale file is 'bad', ALL 6 must drop together.
BAD_QUICK="fe-next/translations/he.js"
ALL=$(mklist \
  "fe-next/translations/en.js" "fe-next/translations/es.js" \
  "fe-next/translations/he.js" "fe-next/translations/ja.js" \
  "fe-next/translations/ru.js" "fe-next/translations/sv.js" \
  "fe-next/components/good.tsx")
OUT=$(mktemp)
nightly_bisect_offenders "$ALL" "$OUT"; rc=$?
assert "returns 0" "[ $rc -eq 0 ]"
assert "all 6 translation files dropped together" "[ \$(grep -c 'translations/' \"$OUT\") -eq 6 ]"
assert "the innocent component is NOT dropped" "! grep -q 'components/good.tsx' \"$OUT\""
rm -f "$ALL" "$OUT"; unset BAD_QUICK BAD_FULL

echo "── bisect: all files bad → return 1 (no improvement over docs-only) ──"
BAD_QUICK=$'fe-next/a.ts\nfe-next/b.ts'
ALL=$(mklist "fe-next/a.ts" "fe-next/b.ts")
OUT=$(mktemp)
nightly_bisect_offenders "$ALL" "$OUT"; rc=$?
assert "returns 1 when nothing can be salvaged" "[ $rc -eq 1 ]"
assert "out file empty on failure" "[ ! -s \"$OUT\" ]"
rm -f "$ALL" "$OUT"; unset BAD_QUICK

echo "── bisect: 0/1 code file → return 1 (docs-only already minimal) ──"
ALL=$(mklist "fe-next/only.ts"); OUT=$(mktemp)
nightly_bisect_offenders "$ALL" "$OUT"; rc=$?
assert "single-file set is not bisected" "[ $rc -eq 1 ]"
rm -f "$ALL" "$OUT"

echo "── bisect: weak oracle — kept passes QUICK but fails FULL → return 1 ──"
# Full gate is the ship authority. If the cheap oracle greenlights a set the full
# gate rejects, bisect must NOT ship it — fall back to docs-only.
BAD_QUICK="fe-next/realbreak.tsx"           # quick isolates this
BAD_FULL=$'fe-next/realbreak.tsx\nfe-next/sneaky.tsx'  # sneaky also breaks full only
ALL=$(mklist "fe-next/realbreak.tsx" "fe-next/sneaky.tsx" "fe-next/ok.tsx")
OUT=$(mktemp)
nightly_bisect_offenders "$ALL" "$OUT"; rc=$?
assert "returns 1 (kept set fails the authoritative full gate)" "[ $rc -eq 1 ]"
rm -f "$ALL" "$OUT"; unset BAD_QUICK BAD_FULL

echo "── bisect: a wedge (inconclusive) → return 1, never ship on unknown ──"
MOCK_WEDGE=1
ALL=$(mklist "fe-next/a.tsx" "fe-next/b.tsx"); OUT=$(mktemp)
nightly_bisect_offenders "$ALL" "$OUT"; rc=$?
assert "returns 1 on wedge" "[ $rc -eq 1 ]"
rm -f "$ALL" "$OUT"; unset MOCK_WEDGE

echo "── bisect: budget cap → return 1 (bounded cost) ──"
BAD_QUICK="fe-next/x9.tsx"
files=(); for i in $(seq 0 9); do files+=("fe-next/x$i.tsx"); done
ALL=$(mklist "${files[@]}"); OUT=$(mktemp)
NIGHTLY_BISECT_MAX_GATES=2 nightly_bisect_offenders "$ALL" "$OUT"; rc=$?
assert "returns 1 when gate-call budget is exhausted" "[ $rc -eq 1 ]"
rm -f "$ALL" "$OUT"; unset BAD_QUICK

# ── INTEGRATION: real worktree gate via NIGHTLY_GATE_CMD seam ─────────────────
echo "── bisect: INTEGRATION — real worktree isolates a broken file, ships the rest ──"
unset NIGHTLY_BISECT_GATE_FN   # use the real _nightly_bisect_gate → run_isolated_gate
PROJECT_DIR=$(mktemp -d -t bisectint.XXXXXX); export PROJECT_DIR
( cd "$PROJECT_DIR"
  git -c init.defaultBranch=master init -q
  git config user.email t@t; git config user.name tester
  mkdir -p fe-next/app fe-next/node_modules/.bin
  for n in good1 good2 good3; do printf 'export const %s = 1;\n' "$n" > "fe-next/app/$n.ts"; done
  printf 'export const bad = 1;\n' > fe-next/app/bad.ts
  for b in eslint vitest tsc next; do printf '#!/bin/sh\necho fake\n' > "fe-next/node_modules/.bin/$b"; done
  git add -A; git commit -qm init )
# Lane edits all four; bad.ts carries a marker the "compiler" rejects.
for n in good1 good2 good3; do printf 'export const %s = 2;\n' "$n" > "$PROJECT_DIR/fe-next/app/$n.ts"; done
printf 'export const bad = 2; /* BROKEN_MARKER */\n' > "$PROJECT_DIR/fe-next/app/bad.ts"
# Deterministic gate: fails iff the worktree contains the broken marker.
export NIGHTLY_GATE_CMD='! grep -rq BROKEN_MARKER app/'
ALL=$(mklist "fe-next/app/good1.ts" "fe-next/app/good2.ts" "fe-next/app/good3.ts" "fe-next/app/bad.ts")
OUT=$(mktemp)
nightly_bisect_offenders "$ALL" "$OUT"; rc=$?
assert "INTEGRATION returns 0" "[ $rc -eq 0 ]"
assert "INTEGRATION isolates exactly bad.ts" "[ \"\$(cat \"$OUT\")\" = 'fe-next/app/bad.ts' ]"
assert "INTEGRATION main tree untouched (bad.ts still present)" \
  "grep -q BROKEN_MARKER \"\$PROJECT_DIR/fe-next/app/bad.ts\""
assert "INTEGRATION leaves no dangling worktree" \
  "[ \"\$(cd \"\$PROJECT_DIR\" && git worktree list | wc -l | tr -d ' ')\" = 1 ]"
unset NIGHTLY_GATE_CMD; rm -f "$ALL" "$OUT"
( cd "$PROJECT_DIR" && git worktree prune 2>/dev/null ); rm -rf "$PROJECT_DIR"

echo
echo "── bisect-offenders: $PASS passed, $FAIL failed ──"
[ "$FAIL" -eq 0 ]
