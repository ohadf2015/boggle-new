#!/bin/bash
# lane-time-guard.sh — PreToolUse hook. The ROOT-CAUSE fix for the recurring
# exit-124 timeout epidemic (4/8 lanes killed 2026-06-02, 5/6 on 06-01, 32% on
# 05-25).
#
# WHY prior fixes failed: every attempt lived in the PROMPT — MCP watchdogs (wrong
# layer; timed-out lanes made ~0 MCP calls), then "you have ~N minutes, stop at
# 80%" prose. Forensics proved the agent NEVER once ran `date` in any lane (timed
# out OR successful) — it is clock-blind and cannot obey a relative budget it
# cannot measure. Successful lanes weren't better at time-telling; they just made
# SMALL (1–5 edit, 1–3 file) changes and exited naturally. Losers sprawled (10
# files, repeated full-repo tsc) until the invisible SIGTERM guillotine fell
# mid-edit, leaving half-written files the gate then dropped → zero shipped.
#
# THE LEVER: a PreToolUse hook fires OUTSIDE the agent's discretion. Even under
# --dangerously-skip-permissions a `deny` blocks the tool. So we enforce, not ask:
#   • inject remaining-time on every edit (mechanical perception — no polling)
#   • DENY new-file edits past the 80% finalize cutoff (force convergence)
#   • DENY edits beyond a per-lane file cap (kill the multi-file sprawl)
#   • DENY all edits past the hard cap (stop before the guillotine)
# Bash is never denied — the agent needs git/tsc/revert to wrap up cleanly.
#
# INERT outside the nightly: if $LEXI_LANE_DEADLINE_FILE is unset/missing it
# exits 0 immediately, so interactive sessions see a sub-10ms no-op.
#
# Contract (Claude Code hooks): stdin = {tool_name, tool_input:{file_path,...}}.
# stdout JSON {hookSpecificOutput:{...}} with permissionDecision:"deny" to block
# (model sees permissionDecisionReason) or additionalContext to inject text.
set -uo pipefail

DEADLINE_FILE="${LEXI_LANE_DEADLINE_FILE:-}"
[ -n "$DEADLINE_FILE" ] && [ -f "$DEADLINE_FILE" ] || exit 0   # not in a lane → no-op

input=$(cat)
tool=$(printf '%s' "$input" | jq -r '.tool_name // ""' 2>/dev/null || echo "")
fpath=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""' 2>/dev/null || echo "")

# deadline file: "START_EPOCH FINALIZE_EPOCH HARD_EPOCH"
read -r START FINALIZE HARD _rest < "$DEADLINE_FILE" 2>/dev/null || exit 0
[ -n "${FINALIZE:-}" ] && [ -n "${HARD:-}" ] || exit 0

now="${LEXI_FAKE_NOW:-$(date +%s)}"
cap="${LEXI_LANE_FILE_CAP:-8}"
fileset="${LEXI_LANE_FILESET_FILE:-}"

# BSD `date -r EPOCH` (darwin); fall back to GNU `date -d @EPOCH`; else a label.
hhmm=$(date -r "$FINALIZE" +%H:%M:%S 2>/dev/null || date -d "@$FINALIZE" +%H:%M:%S 2>/dev/null || echo "the cutoff")
rem=$(( FINALIZE - now )); [ "$rem" -lt 0 ] && rem=0
rem_min=$(( rem / 60 )); rem_sec=$(( rem % 60 ))

distinct=0
if [ -n "$fileset" ] && [ -f "$fileset" ]; then
  distinct=$(sort -u "$fileset" 2>/dev/null | grep -c . || echo 0)
fi
distinct=$(printf '%s' "$distinct" | tr -dc '0-9'); distinct=${distinct:-0}

allow_with_context() { jq -nc --arg c "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:$c}}'; exit 0; }
deny()               { jq -nc --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'; exit 0; }
record_file()        { [ -n "$fpath" ] && [ -n "$fileset" ] && printf '%s\n' "$fpath" >> "$fileset"; }

case "$tool" in
  Edit|Write|MultiEdit|NotebookEdit)
    # The mandatory artifact + any docs/ file is gate-clean (outside fe-next/) and
    # is the "never give up" floor — NEVER block it, even past the hard cutoff or
    # at the file cap, so the agent can always record `status: partial`.
    case "$fpath" in
      */docs/*|docs/*)
        record_file
        allow_with_context "(docs/artifact write — always allowed) ⏰ ~${rem_min}m ${rem_sec}s to finalize ($hhmm). Record your status honestly (shipped|partial|blocked) and wrap up now."
        ;;
    esac
    is_new=1
    if [ -n "$fpath" ] && [ -n "$fileset" ] && [ -f "$fileset" ] && grep -qxF "$fpath" "$fileset" 2>/dev/null; then
      is_new=0
    fi

    if [ "$now" -ge "$HARD" ]; then
      deny "⛔ HARD time limit reached — SIGKILL is imminent. Do NOT edit. Immediately revert any incomplete edit (git checkout -- <file>), set your artifact status: partial, and END this turn now."
    fi

    if [ "$now" -ge "$FINALIZE" ]; then
      if [ "$is_new" = "1" ]; then
        deny "⛔ Finalize cutoff ($hhmm) passed — NO new files. Finish ONLY the file(s) you have already changed, run tsc/lint on just those, update your artifact, then END. If a change can't be completed cleanly in time, revert it: git checkout -- <file>."
      fi
      record_file
      allow_with_context "⛔ Finalize cutoff ($hhmm) passed. ONLY finishing in-flight edits is allowed — complete THIS file, verify (tsc/lint on changed files only), update your artifact, and END now. Do not open new work."
    fi

    if [ "$is_new" = "1" ] && [ "$distinct" -ge "$cap" ]; then
      deny "⛔ File-scope cap reached ($distinct/$cap files). Do NOT start a new file — a sprawling multi-file change gets dropped whole by the gate. Finish + tsc/lint-verify the files you already changed, then END. One small COMPLETE change ships; a big incomplete one ships nothing."
    fi

    record_file
    next=$distinct; [ "$is_new" = "1" ] && next=$(( distinct + 1 ))
    allow_with_context "⏰ ~${rem_min}m ${rem_sec}s until finalize ($hhmm), after which new files are BLOCKED. Files changed: ${next}/${cap}. If this change is complete + tsc-clean, finish and STOP — don't start more than you can land + verify in the time left."
    ;;

  Bash)
    # Never deny Bash — the agent needs git/tsc/revert to converge. Nudge on time;
    # keep pre-finalize noise low (only nudge in the last 5 min or after cutoff).
    if [ "$now" -ge "$FINALIZE" ]; then
      allow_with_context "⛔ Finalize cutoff ($hhmm) passed. Use Bash ONLY to verify/revert/finalize (tsc on changed files, git checkout -- <file>, artifact update) — do NOT start new work. END this turn soon."
    fi
    if [ "$rem" -le 300 ]; then
      allow_with_context "⏰ ~${rem_min}m ${rem_sec}s until finalize ($hhmm); ${distinct}/${cap} files changed. Avoid slow full-repo commands — run \`tsc --noEmit\` scoped to your changed files, not the whole project — and don't begin work you can't finish in time."
    fi
    exit 0
    ;;

  *)
    exit 0 ;;
esac
