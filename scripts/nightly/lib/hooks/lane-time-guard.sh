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
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# deadline file: "START_EPOCH FINALIZE_EPOCH HARD_EPOCH"
read -r START FINALIZE HARD _rest < "$DEADLINE_FILE" 2>/dev/null || exit 0
[ -n "${FINALIZE:-}" ] && [ -n "${HARD:-}" ] || exit 0

now="${LEXI_FAKE_NOW:-$(date +%s)}"
# Research window closes EARLIER than the edit-finalize cutoff. Pure-research tools
# (web search/fetch + read-only intel MCP: Sentry/Ahrefs/PostHog) past this point
# are the #1 remaining timeout cause — on 2026-06-03 lane 01 made 12 sequential
# Sentry calls and lane 05 ran repeated full-repo tsc, both burning the whole
# budget on non-shipping work. 60% of wall-clock; the last 40% is for landing +
# verifying ONE change. START may be absent in older deadline files → default 0.
_start="${START:-0}"; [ -n "$_start" ] || _start=0
RESEARCH=$(( _start + (HARD - _start) * 6 / 10 ))
# Heavy full-repo Bash (tsc --noEmit / npm run build|test|build:schemas / next build /
# vitest run) costs ~60s each and is the OTHER sink. The nightly GATE runs
# lint+type+test+build authoritatively AFTER the lane, so a lane re-running them
# just burns budget. Cap how many a lane may run, and forbid them past finalize.
HEAVY_FILE="${DEADLINE_FILE}.heavy"
HEAVY_CAP="${LEXI_LANE_HEAVY_CAP:-2}"
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
    # Long-running / backgrounded commands leak the run's output fd → the lane can't
    # exit after finishing and hangs to a FALSE exit-124 timeout (lane 05, 06-03).
    # Lanes are short-lived: no dev servers, no daemons, no backgrounding.
    case "$cmd" in
      *"npm run dev"*|*"next dev"*|*"npm start"*|*"yarn dev"*|*"pnpm dev"*|*"vercel dev"*|*"redis-server"*|*"npm run start"*)
        deny "⛔ Dev-server / daemon blocked in a nightly lane. It keeps the run's output stream open so the lane cannot exit after you finish — it then hangs until SIGTERM (a false timeout). Lanes make ONE focused code change and exit: verify statically (\`npx eslint <your changed files>\`) and let the gate build. Do NOT start a server." ;;
    esac
    if [ "$(printf '%s' "$input" | jq -r '.tool_input.run_in_background // false' 2>/dev/null || echo false)" = "true" ]; then
      deny "⛔ Backgrounded Bash (run_in_background) blocked in a nightly lane — a detached child keeps the run's output stream open so the lane cannot exit and hangs to a false timeout. Run short FOREGROUND commands only."
    fi

    # Heavy full-repo command? (~60s each). The nightly GATE runs lint+type+test+
    # build authoritatively after the lane, so these are self-verification the lane
    # does NOT need — and they are the time-sink that killed lanes 05/06/01.
    is_heavy=0
    case "$cmd" in
      *"tsc --noEmit"*|*"npm run build"*|*"npm run test"*|*"npm test"*|*"vitest run"*|*"next build"*|*"npm run build:fast"*|*"npm run build:schemas"*|*"yarn build"*|*"pnpm build"*)
        is_heavy=1 ;;
    esac

    if [ "$is_heavy" = "1" ]; then
      # Past finalize a 60s+ build/test/tsc cannot complete before SIGTERM — it would
      # get the lane killed mid-run. Forbid it outright; the gate verifies.
      if [ "$now" -ge "$FINALIZE" ]; then
        deny "⛔ Finalize cutoff ($hhmm) passed — a full-repo build/test/tsc (~60s+) will NOT finish before the hard SIGTERM and will get your whole lane killed mid-run with nothing shipped. The nightly GATE runs lint+type+test+build authoritatively AFTER you finish — trust it. To sanity-check ONLY your changes, \`npx eslint <your changed files>\` is fast. Otherwise just \`git\`-verify, update your artifact, and END."
      fi
      heavy_n=0; [ -f "$HEAVY_FILE" ] && heavy_n=$(grep -c . "$HEAVY_FILE" 2>/dev/null || echo 0)
      heavy_n=$(printf '%s' "$heavy_n" | tr -dc '0-9'); heavy_n=${heavy_n:-0}
      if [ "$heavy_n" -ge "$HEAVY_CAP" ]; then
        deny "⛔ Full-repo build/test/tsc cap reached ($heavy_n/$HEAVY_CAP). Each run is ~60s+ of your budget and the nightly GATE already runs the FULL lint+type+test+build after your lane — re-running it yourself just burns wall-clock and risks the SIGTERM guillotine. STOP self-checking the whole repo; if you must, \`npx eslint <only your changed files>\`. Finish your one change and END."
      fi
      printf '%s\n' "$now" >> "$HEAVY_FILE" 2>/dev/null || true
      allow_with_context "⏰ ~${rem_min}m ${rem_sec}s to finalize ($hhmm). Heads-up: this full-repo command is ~60s+ and the nightly GATE re-verifies lint+type+test+build after you — run it at most ${HEAVY_CAP}×, prefer \`npx eslint <changed files>\` for a quick check, and don't start one you can't afford."
    fi

    # Non-heavy Bash is never denied — the agent needs git/eslint/revert to converge.
    if [ "$now" -ge "$FINALIZE" ]; then
      allow_with_context "⛔ Finalize cutoff ($hhmm) passed. Use Bash ONLY to verify/revert/finalize (eslint on changed files, git checkout -- <file>, artifact update) — do NOT start new work or full-repo builds. END this turn soon."
    fi
    if [ "$rem" -le 300 ]; then
      allow_with_context "⏰ ~${rem_min}m ${rem_sec}s until finalize ($hhmm); ${distinct}/${cap} files changed. Don't run full-repo tsc/build/test (the gate does that after you) — \`npx eslint <your changed files>\` is the fast self-check. Don't begin work you can't finish in time."
    fi
    exit 0
    ;;

  WebSearch|WebFetch)
    # Pure research — never needed to SHIP. Past the research window it only eats the
    # time left to implement + verify, so deny it (force convergence).
    if [ "$now" -ge "$RESEARCH" ]; then
      deny "⛔ Research window closed — you have spent 60%+ of the lane budget; more web research will not leave time to land AND verify a change before SIGTERM. STOP researching: act on the intelligence brief + what you already found, make ONE small gate-clean change, and finalize."
    fi
    exit 0 ;;

  mcp__sentry__*|mcp__ahrefs__*|mcp__posthog__*|mcp__plugin_atlassian_*)
    # Read-only intel MCP. On 2026-06-03 lane 01 made 12 sequential Sentry calls and
    # shipped nothing. Past the research window, deny — these never ship code; the
    # write-capable servers (supabase/railway/…) are intentionally NOT gated here so
    # a lane can still apply a migration to finalize.
    if [ "$now" -ge "$RESEARCH" ]; then
      deny "⛔ Research window closed — read-only intel queries (Sentry/Ahrefs/PostHog) past 60% of budget are the #1 timeout cause (a lane once made 12 Sentry calls and shipped zero). STOP querying; act on the brief + what you have, implement ONE change, and finalize."
    fi
    exit 0 ;;

  *)
    exit 0 ;;
esac
