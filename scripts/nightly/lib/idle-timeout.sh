#!/bin/bash
# idle-timeout.sh — a PROGRESS watchdog that replaces the fixed wall-clock gtimeout
# ceilings on the nightly lanes (headless.sh) and the integration gate
# (gate-isolated.sh). Sourced by both.
#
# WHY (2026-06-07): the fixed per-lane caps (600/900/1500s) and the 2700s gate cap
# SIGKILLed work that was still PROGRESSING — 4 lanes cut mid-edit and the gate
# shipped tests-UNVERIFIED because a slow-but-advancing suite ran past 45min. The
# founder asked to remove the hard caps. Removing them outright risks an infinite
# hang (a wedged MCP call / OOM'd test never returns, and launchd's TimeOut is
# advisory — it does NOT force-terminate run.sh). So instead of a wall-clock guillotine
# we watch the process's OUTPUT FILE: as long as it keeps growing the process is making
# progress and is NEVER killed; only a true wedge (no new bytes for `idle` seconds) is
# killed. A far-out `max` backstop is the last-resort ceiling against a process that
# stays busy-but-useless forever.
#
# run_with_idle_timeout <idle_secs> <max_secs> <outfile> -- <cmd> [args…]
#   Runs cmd with its stdout+stderr redirected to <outfile> (truncated first), watches
#   <outfile>'s byte count, and on idle/max kills the WHOLE child process tree
#   (cmd + its MCP servers / build spawns). idle<=0 disables idle detection; max<=0
#   disables the backstop. Returns the child's exit code, or 124 on an idle/max kill
#   (so the existing rc=124 → INCONCLUSIVE/keep-partials handling fires unchanged).

# Recursively signal a pid and all its descendants (depth-first: kids before parent),
# so claude's long-lived MCP servers / next-build workers don't outlive the wedge.
_idle_kill_tree() {
  local p="$1" sig="${2:-TERM}" c
  for c in $(pgrep -P "$p" 2>/dev/null); do _idle_kill_tree "$c" "$sig"; done
  kill -"$sig" "$p" 2>/dev/null || true
}

run_with_idle_timeout() {
  local idle="$1" max="$2" outfile="$3"; shift 3
  [ "${1:-}" = "--" ] && shift

  : > "$outfile"
  # </dev/null: never let the child block on a tty read (claude lanes already pass
  # this; npm/vitest/next in the gate must not read stdin either).
  "$@" < /dev/null > "$outfile" 2>&1 &
  local cpid=$!

  local poll="${IDLE_TIMEOUT_POLL:-5}" start now last_size=0 last_change cur reason=""
  start=$(date +%s); last_change=$start

  while kill -0 "$cpid" 2>/dev/null; do
    sleep "$poll"
    now=$(date +%s)
    cur=$(wc -c < "$outfile" 2>/dev/null | tr -d ' '); cur=${cur:-0}
    if [ "$cur" != "$last_size" ]; then last_size="$cur"; last_change="$now"; fi

    if [ "${max:-0}" -gt 0 ] && [ $((now - start)) -ge "$max" ]; then
      reason="max"; break
    fi
    if [ "${idle:-0}" -gt 0 ] && [ $((now - last_change)) -ge "$idle" ]; then
      reason="idle"; break
    fi
  done

  if [ -n "$reason" ]; then
    # Graceful first, then hard — same TERM→grace→KILL shape gtimeout used.
    _idle_kill_tree "$cpid" TERM
    local g=0
    while [ "$g" -lt "${IDLE_TIMEOUT_KILL_GRACE:-10}" ] && kill -0 "$cpid" 2>/dev/null; do
      sleep 1; g=$((g+1))
    done
    kill -0 "$cpid" 2>/dev/null && _idle_kill_tree "$cpid" KILL
    wait "$cpid" 2>/dev/null
    return 124
  fi

  wait "$cpid"
  return $?
}
