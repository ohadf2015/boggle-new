#!/bin/bash
# Test the feedback-poll daemon-collision guard: when the always-on
# feedback-daemon is already long-polling getUpdates, feedback-poll must NOT
# fire its own getUpdates (Telegram allows one per bot → "Conflict" failure that
# cost ~5 nights of founder feedback). It defers to the daemon's buffer instead.
#
# Network-free: the guard exits BEFORE any curl when the daemon is "alive"
# (forced via the NIGHTLY_DAEMON_CHECK seam).
#
# Run: bash scripts/nightly/test/feedback-poll-guard.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
POLL="$HERE/../lib/feedback-poll.sh"
PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1)); else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi }

echo "── feedback-poll: defers to daemon (no double getUpdates) ──"

TMP=$(mktemp -d -t fbpoll.XXXXXX)

# Daemon ALIVE (forced) → must skip without polling.
OUT=$(NIGHTLY_DAEMON_CHECK='true' TELEGRAM_BOT_TOKEN=dummy PROJECT_DIR="$TMP" bash "$POLL" 2>&1); RC=$?
assert "exits 0 when daemon is polling" "[ $RC -eq 0 ]"
assert "logs that it skipped the redundant poll" "echo \"\$OUT\" | grep -q 'skipping redundant getUpdates'"
assert "never reached a getUpdates call (no failure line)" "! echo \"\$OUT\" | grep -q 'getUpdates failed'"

# Daemon DOWN (forced false) → guard must NOT skip (proceeds past the guard).
# We stop it reaching the network by leaving the token but asserting only that
# the SKIP message is absent (it proceeds; any later curl is the legacy path).
OUT3=$(NIGHTLY_DAEMON_CHECK='false' TELEGRAM_BOT_TOKEN=dummy PROJECT_DIR="$TMP" timeout 20 bash "$POLL" 2>&1 || true)
assert "does NOT skip when daemon is down (fallback poll path)" "! echo \"\$OUT3\" | grep -q 'skipping redundant getUpdates'"

rm -rf "$TMP"
echo
echo "feedback-poll-guard: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
