#!/bin/bash
# Unit test for run_with_idle_timeout() — the progress watchdog that REPLACES the
# fixed wall-clock gtimeout caps on lanes + the gate. A process is killed ONLY when
# its output file stops growing for `idle` seconds (a true wedge), never on
# wall-clock while it is still emitting. A far-out `max` backstop prevents an
# infinite hang (launchd's advisory TimeOut does not enforce one).
# Run: bash scripts/nightly/test/idle-timeout.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/idle-timeout.sh"

PASS=0; FAIL=0
log() { :; }
export IDLE_TIMEOUT_POLL=1   # poll every 1s so 2-3s thresholds resolve fast in tests

assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi; }

OUT=$(mktemp -t idle-out.XXXXXX)

echo "run_with_idle_timeout unit test"
echo

echo "Scenario 1 — steady output (gaps < idle) runs to completion, returns child rc"
# writes every 0.5s for ~3s — never idle longer than 2s — then exits 0.
: > "$OUT"
t0=$(date +%s)
run_with_idle_timeout 2 30 "$OUT" -- bash -c 'for i in $(seq 1 6); do echo "tick $i"; sleep 0.5; done; exit 0'
rc=$?; t1=$(date +%s)
assert "returns child rc 0 (not killed)"   "[ $rc -eq 0 ]"
assert "all output captured"               "[ \"\$(grep -c tick \"$OUT\")\" -eq 6 ]"
assert "ran to natural end (>=2s)"         "[ $((t1-t0)) -ge 2 ]"

echo "Scenario 2 — goes silent past idle → killed (124), early (well under max)"
# emits once, then sleeps 20s with NO output. idle=2 → killed ~3s, long before max=60.
: > "$OUT"
t0=$(date +%s)
run_with_idle_timeout 2 60 "$OUT" -- bash -c 'echo started; sleep 20; echo done'
rc=$?; t1=$(date +%s)
assert "returns 124 (idle-killed)"         "[ $rc -eq 124 ]"
assert "killed EARLY (<15s, not at max)"   "[ $((t1-t0)) -lt 15 ]"
assert "never reached the post-sleep line" "! grep -q done \"$OUT\""

echo "Scenario 3 — busy but exceeds max backstop → killed (124)"
# emits every 0.3s forever (never idle) → only the max=3s backstop can stop it.
: > "$OUT"
t0=$(date +%s)
run_with_idle_timeout 30 3 "$OUT" -- bash -c 'while true; do echo busy; sleep 0.3; done'
rc=$?; t1=$(date +%s)
assert "returns 124 (max-killed)"          "[ $rc -eq 124 ]"
assert "killed near max (<15s)"            "[ $((t1-t0)) -lt 15 ]"
assert "did emit before kill"              "grep -q busy \"$OUT\""

echo "Scenario 4 — fast child returns its own exit code (no kill)"
: > "$OUT"
run_with_idle_timeout 5 30 "$OUT" -- bash -c 'echo hi; exit 7'
rc=$?
assert "propagates child rc 7"             "[ $rc -eq 7 ]"
assert "output captured"                   "grep -q hi \"$OUT\""

echo "Scenario 5 — kills the whole child TREE (descendants don't outlive the wedge)"
# parent spawns a long-lived grandchild that writes to a marker, then the parent goes
# silent. After the idle-kill, the grandchild must be dead (no further marker writes).
MARK=$(mktemp -t idle-mark.XXXXXX); : > "$MARK"
: > "$OUT"
run_with_idle_timeout 2 60 "$OUT" -- bash -c '( while true; do echo x >> "'"$MARK"'"; sleep 0.3; done ) & echo parent-started; sleep 20'
rc=$?
lines_at_kill=$(wc -l < "$MARK" | tr -d ' ')
sleep 2
lines_after=$(wc -l < "$MARK" | tr -d ' ')
assert "idle-killed (124)"                 "[ $rc -eq 124 ]"
assert "grandchild STOPPED writing (tree killed)" "[ \"$lines_after\" = \"$lines_at_kill\" ]"

echo
echo "──────────────────────────────────────────"
echo "PASS=$PASS  FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "ALL GREEN ✓" || echo "FAILURES ✗"
exit "$([ "$FAIL" -eq 0 ] && echo 0 || echo 1)"
