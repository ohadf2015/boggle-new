#!/bin/bash
# Test for lib/idea-history.sh — the anti-repetition ledger for lane 4.
#
# Problem it fixes: lane 4 re-pitched the SAME game-mode idea night after night
# (3 of 4 nights = "shareable emoji result card", which the founder had already
# PASSED on via the idea:pass Telegram button). The lane never read prior pitches
# or the founder's verdicts, so to the founder it looked like the nightly "stopped
# suggesting new ideas".
#
# THE GUARANTEE under test: given prior reports' `- Top idea:` lines + the
# feedback ndjson callbacks, the helper emits a tiered ledger that (a) maps each
# pitched idea to the founder's verdict via the SAME hash run.sh uses
# (shasum|cut -c1-8 of the idea line), (b) aggregates exact repeats with a count
# so repetition is visible, and (c) degrades to a clear empty-state. The lane
# prompt then refuses to re-pitch these as "new".
#
# Run: bash scripts/nightly/test/idea-history.test.sh
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
HELPER="$HERE/../lib/idea-history.sh"

PASS=0; FAIL=0
assert() { if eval "$2"; then printf '    ✓ %s\n' "$1"; PASS=$((PASS+1))
  else printf '    ✗ %s   [%s]\n' "$1" "$2"; FAIL=$((FAIL+1)); fi; }

hash_of() { echo "$1" | shasum | cut -c1-8; }  # MUST match run.sh:680 exactly

# --- fixture project tree --------------------------------------------------
SANDBOX=$(mktemp -d -t ideahist.XXXXXX)
trap 'rm -rf "$SANDBOX"' EXIT
R="$SANDBOX/docs/nightly/reports"; F="$SANDBOX/docs/nightly/feedback"
mkdir -p "$R" "$F"

SHARE_IDEA='Shareable result card (emoji format) — Wordle-style share loop'
VOICE_IDEA='Voice chat in MP rooms — close the comms gap vs Nanagrams'

# Two nights pitched the SAME idea (exact dup → must aggregate as 2x).
printf -- '- Top idea: %s\n' "$SHARE_IDEA" > "$R/2026-05-20.md"
{ printf -- '- Top idea: %s\n' "$VOICE_IDEA"
  printf '#### Top game-mode improvement idea\n- Title: Word Tower hazard variety\n'; } > "$R/2026-05-21.md"
printf -- '- Top idea: %s\n' "$SHARE_IDEA" > "$R/2026-05-22.md"

# Founder PASSED on the voice-chat idea (callback keyed by its hash).
VOICE_HASH=$(hash_of "$VOICE_IDEA")
printf '{"callback_data":"idea:pass:%s","msg_text_first120":"voice chat"}\n' "$VOICE_HASH" > "$F/2026-05-21.ndjson"

echo "── idea-history: ledger maps verdicts + aggregates repeats ──"
OUT=$(PROJECT_DIR="$SANDBOX" bash "$HELPER" 2>&1); RC=$?

assert "helper exits 0"                              '[ "$RC" = "0" ]'
assert "lists the shareable-card idea"              'echo "$OUT" | grep -qi "Shareable result card"'
assert "lists the voice-chat idea"                  'echo "$OUT" | grep -qi "Voice chat"'
assert "shareable idea aggregated as pitched twice" 'echo "$OUT" | grep -i "Shareable result card" | grep -qE "2|two|×2|x2"'
assert "voice-chat idea filed under the PASSED tier" 'echo "$OUT" | awk "/PASSED/{f=1} f" | grep -qi "Voice chat"'
assert "shareable card is NOT under the PASSED tier (no verdict)" '! echo "$OUT" | awk "/PASSED/{f=1} f&&/⏳|no verdict/{f=0} f" | grep -qi "Shareable"'
assert "surfaces the existing-mode improvement title" 'echo "$OUT" | grep -qi "Word Tower hazard variety"'
assert "states the concept-family dedup rule (core mechanic)" 'echo "$OUT" | grep -qiE "core mechanic|same.*mechanic|regardless of (which )?(mode|surface)"'

echo "── idea-history: graceful empty-state ──"
EMPTY=$(mktemp -d -t ideahist-empty.XXXXXX)
OUT2=$(PROJECT_DIR="$EMPTY" bash "$HELPER" 2>&1); RC2=$?
rm -rf "$EMPTY"
assert "empty project still exits 0"      '[ "$RC2" = "0" ]'
assert "empty state says no prior ideas"  'echo "$OUT2" | grep -qiE "no prior|none on record|propose freely|no ideas"'

echo "── idea-history: lane 4 prompt consumes it + enforces novelty ──"
P="$HERE/../prompts/04-competitor.md"
assert "prompt 04 runs idea-history.sh"                'grep -q "idea-history.sh" "$P"'
assert "prompt 04 states concept-family dedup rule"   'grep -qiE "core mechanic|same idea" "$P"'
assert "prompt 04 parses idea: feedback verdicts"     'grep -qE "idea:pass|idea:build" "$P"'
assert "prompt 04 requires a NEW (non-repeated) idea" 'grep -qiE "do not (re-?)?pitch|must be new|already pitched|not repeat" "$P"'

echo
echo "  $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
