#!/bin/bash
# Test for the session/usage-limit detection + reset-clock parsing in
# lib/headless.sh. ROOT CAUSE this guards (2026-06-09): the 5h Claude usage
# window was exhausted mid-run; lanes 02-08 died on "You've hit your session
# limit · resets 3:40am" / "rate_limit". The runner was limit-blind — it treated
# the limit exactly like a code failure (rc=1 → revert → advance), burning lanes
# 03-08 as 1-second instant-fails instead of pausing for the ~2-min reset.
#
# These two pure functions are the testable core of the fix:
#   _seconds_until_reset <msg>   → integer seconds until the named reset clock
#                                  (LEXI_FAKE_NOW seam for determinism), or "" on
#                                  unparseable input (caller falls back).
#   _detect_limit_signal <file>  → "WAIT <secs>" | "BACKOFF" | "" by scanning a
#                                  stream-json sidecar for a limit result.
#
# Run: bash scripts/nightly/test/headless-session-limit.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
# Pin the clock TZ so the reset-time math is deterministic regardless of the
# runner's locale (the limit message clock is wall-time in the machine's TZ).
export TZ=Europe/Stockholm

# shellcheck source=/dev/null
. "$HERE/../lib/headless.sh"

PASS=0; FAIL=0
check() { # <desc> <got> <expected>
  if [ "$2" = "$3" ]; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1));
  else printf '    ✗ %s   [got=%s want=%s]\n' "$1" "$2" "$3"; FAIL=$((FAIL+1)); fi
}

# A fixed "now" = 2026-06-09 02:00:00 Stockholm, so reset clocks are easy to reason about.
NOW=$(date -j -f "%Y-%m-%d %H:%M:%S" "2026-06-09 02:00:00" +%s)

echo "── _seconds_until_reset: am/pm, minutes, rollover, fallback ──"
g=$(LEXI_FAKE_NOW="$NOW" _seconds_until_reset "You've hit your session limit · resets 3:40am (Europe/Stockholm)")
check "03:40am is 1h40m (6000s) after 02:00" "$g" 6000

g=$(LEXI_FAKE_NOW="$NOW" _seconds_until_reset "resets 11pm")
check "11pm is 21h (75600s) after 02:00" "$g" 75600

g=$(LEXI_FAKE_NOW="$NOW" _seconds_until_reset "resets 2:30am")
check "2:30am is 30m (1800s) after 02:00" "$g" 1800

# Reset clock already PAST today → it means tomorrow (rollover, never negative/zero).
NOW_LATE=$(date -j -f "%Y-%m-%d %H:%M:%S" "2026-06-09 04:00:00" +%s)
g=$(LEXI_FAKE_NOW="$NOW_LATE" _seconds_until_reset "resets 3:40am")
check "3:40am when now is 04:00 → tomorrow (23h40m = 85200s)" "$g" 85200

g=$(LEXI_FAKE_NOW="$NOW" _seconds_until_reset "resets 12am")
check "12am (midnight) normalizes to 00:00 → tomorrow (22h = 79200s)" "$g" 79200

g=$(LEXI_FAKE_NOW="$NOW" _seconds_until_reset "resets 12pm")
check "12pm (noon) stays 12:00 → 10h (36000s)" "$g" 36000

g=$(LEXI_FAKE_NOW="$NOW" _seconds_until_reset "no clock here at all")
check "unparseable message → empty (caller uses fallback)" "$g" ""

echo "── _detect_limit_signal: explicit reset, bare rate_limit, normal failure ──"
SC=$(mktemp)
printf '%s\n' '{"type":"result","subtype":"success","is_error":true,"num_turns":47,"result":"You'"'"'ve hit your session limit · resets 3:40am (Europe/Stockholm)"}' > "$SC"
g=$(LEXI_FAKE_NOW="$NOW" _detect_limit_signal "$SC" | grep -oE '^WAIT')
check "session-limit result with reset clock → WAIT" "$g" "WAIT"
secs=$(LEXI_FAKE_NOW="$NOW" _detect_limit_signal "$SC" | grep -oE '[0-9]+$')
check "WAIT carries the parsed reset seconds (6000)" "$secs" 6000
rm -f "$SC"

SC=$(mktemp)
printf '%s\n' '{"type":"assistant","message":{"content":[{"type":"text","text":"rate_limit"}]}}' > "$SC"
g=$(_detect_limit_signal "$SC")
check "bare rate_limit (no reset clock) → BACKOFF" "$g" "BACKOFF"
rm -f "$SC"

SC=$(mktemp)
printf '%s\n' '{"type":"result","subtype":"success","is_error":true,"result":"Tool execution failed: TypeError x is not a function"}' > "$SC"
g=$(_detect_limit_signal "$SC")
check "a normal code failure → empty (NOT a limit, real revert)" "$g" ""
rm -f "$SC"

SC=$(mktemp); : > "$SC"
g=$(_detect_limit_signal "$SC")
check "empty sidecar → empty" "$g" ""
g=$(_detect_limit_signal "/no/such/file")
check "missing sidecar → empty" "$g" ""
rm -f "$SC"

echo "── _stall_should_abort: cutoff guard (don't sleep a stall into morning) ──"
# Helper: echo abort|sleep for a given now/wait (default cutoff 06:30 local).
verdict() { if LEXI_FAKE_NOW="$1" _stall_should_abort "$2"; then echo abort; else echo sleep; fi; }

g=$(verdict "$NOW" 9550)                 # 02:00 + ~2h39m → ~04:39 < 06:30
check "in-window reset (resume 04:39) still sleeps" "$g" sleep

g=$(verdict "$NOW" 20000)                # 02:00 + ~5h33m → ~07:33 > 06:30
check "wait that resumes past 06:30 → abort" "$g" abort

g=$(verdict "$NOW_LATE" 7200)            # now 04:00 + 2h → 06:00 < 06:30
check "later start, still in-window (06:00) sleeps" "$g" sleep

NOW_PAST=$(date -j -f "%Y-%m-%d %H:%M:%S" "2026-06-09 07:00:00" +%s)
g=$(verdict "$NOW_PAST" 60)              # already past 06:30 cutoff
check "now already past cutoff → abort even a tiny wait" "$g" abort

g=$(LANE_LIMIT_NO_SLEEP_PAST=08:00 verdict "$NOW" 20000)  # resume 07:33 < custom 08:00
check "custom cutoff 08:00 lets the 07:33 resume sleep" "$g" sleep

g=$(LANE_LIMIT_NO_SLEEP_PAST=garbage verdict "$NOW" 99999) # unparseable → never abort
check "unparseable cutoff → sleep (fail-open, preserves old behavior)" "$g" sleep

echo
echo "headless-session-limit: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
