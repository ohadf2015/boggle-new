#!/bin/bash
# Test for compose_failure_digest() — proves a failed-but-ran night still produces
# a useful digest naming the failure + lane work. Pure string composition, no net.
# Run: bash scripts/nightly/test/failure-digest.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$HERE/../lib/failure-digest.sh"

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1));
           else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi; }

echo "── failure-digest ──"

TODAY="2026-05-22"
RUN_LOG="/tmp/run-x.log"
LANE_SUMMARY_TEXT=$'  ✅ 01-triage — 3 files\n  ⚠️  03-engagement — cap exceeded, reverted\n  ❌ 04-competitor — exit 124'
MSG=$(compose_failure_digest "Gate failed twice (lint) — all lane changes dropped.")

assert "names the date"             "printf '%s' \"\$MSG\" | grep -q '2026-05-22'"
assert "flags it did NOT ship"      "printf '%s' \"\$MSG\" | grep -q 'did NOT ship'"
assert "includes the failure reason" "printf '%s' \"\$MSG\" | grep -q 'Gate failed twice'"
assert "lists lane results (triage)" "printf '%s' \"\$MSG\" | grep -q '01-triage'"
assert "lists a reverted lane"       "printf '%s' \"\$MSG\" | grep -q 'cap exceeded'"
assert "states nothing pushed"       "printf '%s' \"\$MSG\" | grep -q 'Nothing committed or pushed'"
assert "reassures WIP intact"        "printf '%s' \"\$MSG\" | grep -q 'WIP left intact'"
assert "points to the log"           "printf '%s' \"\$MSG\" | grep -q '/tmp/run-x.log'"

# Graceful when no lane results were recorded (e.g. very early abort).
unset LANE_SUMMARY_TEXT
MSG2=$(compose_failure_digest "Lane churn 47 files > 30 sanity cap.")
assert "churn reason present"        "printf '%s' \"\$MSG2\" | grep -q 'sanity cap'"
assert "fallback when no lanes"      "printf '%s' \"\$MSG2\" | grep -q 'no lane results recorded'"

# The exact scenario that prompted this: a run KILLED (SIGTERM) before any normal
# exit branch must still fire the digest. Prove the trap pattern run.sh installs
# (trap on_signal TERM INT, guarded on the composer being sourced) reaches the send.
echo "── SIGTERM trap fires the digest ──"
TRAP_OUT=$(mktemp); TRAP_SCRIPT=$(mktemp)
cat > "$TRAP_SCRIPT" <<SCRIPT
#!/bin/bash
set -uo pipefail
send_failure_digest()    { echo "DIGEST_SENT: \$1" > "$TRAP_OUT"; }
compose_failure_digest() { :; }
on_signal() {
  trap - TERM INT
  if declare -F send_failure_digest >/dev/null 2>&1 && declare -F compose_failure_digest >/dev/null 2>&1; then
    send_failure_digest "Run was killed (SIGTERM/SIGINT) before it could ship."
  fi
  exit 143
}
trap on_signal TERM INT
sleep 30
SCRIPT
bash "$TRAP_SCRIPT" & TPID=$!
sleep 1; kill -TERM "$TPID" 2>/dev/null; wait "$TPID" 2>/dev/null
assert "SIGTERM trap reaches send_failure_digest" "grep -q 'DIGEST_SENT' '$TRAP_OUT'"
# And it stays silent if killed BEFORE the composer is sourced (guard works).
TRAP_OUT2=$(mktemp); TRAP_SCRIPT2=$(mktemp)
cat > "$TRAP_SCRIPT2" <<SCRIPT
#!/bin/bash
set -uo pipefail
send_failure_digest() { echo "SENT" > "$TRAP_OUT2"; }   # composer NOT defined
on_signal() {
  trap - TERM INT
  if declare -F send_failure_digest >/dev/null 2>&1 && declare -F compose_failure_digest >/dev/null 2>&1; then
    send_failure_digest "x"
  fi
  exit 143
}
trap on_signal TERM INT
sleep 30
SCRIPT
bash "$TRAP_SCRIPT2" & TPID2=$!
sleep 1; kill -TERM "$TPID2" 2>/dev/null; wait "$TPID2" 2>/dev/null
assert "guard skips send when composer unsourced" "[ ! -s '$TRAP_OUT2' ]"
rm -f "$TRAP_OUT" "$TRAP_SCRIPT" "$TRAP_OUT2" "$TRAP_SCRIPT2"

echo
echo "failure-digest: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
