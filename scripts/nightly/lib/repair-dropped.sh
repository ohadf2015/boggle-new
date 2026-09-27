#!/bin/bash
# repair-dropped.sh — same-night fix attempt for gate-failing files (2026-07-03
# overhaul, spec C1). Before the peel loop DROPS a lane's file, spend one
# bounded headless run trying to FIX the actual gate error. The recurring drop
# causes are mechanical (hooks after an early return, `ssr:false` inside a
# Server Component, a missed import) — exactly what a short focused run fixes.
# One attempt per night (run.sh guards), capped at NIGHTLY_REPAIR_SECS; on any
# failure the caller proceeds to the existing drop path — this can only SAVE
# work, never lose more. Kill-switch: NIGHTLY_REPAIR_PASS=0.
#
# Prompt builder is pure + tested by test/repair-dropped.test.sh.
set -uo pipefail

# nightly_build_repair_prompt BAD_LIST_FILE GATE_OUTPUT_FILE OUT_PROMPT_FILE
# Composes the focused repair mission. Gate output is bounded to its tail (the
# error lines live at the end; the full log can be multi-MB).
nightly_build_repair_prompt() {
  local bad="$1" gout="$2" out="$3"
  local tail_lines="${NIGHTLY_REPAIR_TAIL:-120}"
  {
    echo "You are the nightly REPAIR pass for LexiClash. Working dir: ${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}. Be terse and surgical."
    echo
    echo "The integration gate (lint + tsc + tests) FAILED on these files, which are about to be DROPPED from tonight's ship unless you fix them:"
    echo
    sed 's/^/- /' "$bad" 2>/dev/null
    echo
    echo "═══ GATE ERROR OUTPUT (tail) ═══"
    echo '```'
    tail -n "$tail_lines" "$gout" 2>/dev/null
    echo '```'
    echo
    echo "═══ MISSION ═══"
    echo "ONLY fix the exact errors above, in the files listed. Known recurring causes: React hooks called after an early return (reorder so all hooks run unconditionally), \`ssr:false\` dynamic import inside a Server Component (move to a 'use client' wrapper), missing/renamed imports, a test asserting stale copy."
    echo
    echo "HARD RULES:"
    echo "- Minimal diffs. NO new features, NO refactors, NO new files unless a 'use client' wrapper is the fix."
    echo "- Touch ONLY the files listed above (plus a wrapper file if required)."
    echo "- If an error is genuinely unfixable in this pass (needs design), leave that file unchanged and say so."
    echo "- DO NOT COMMIT. DO NOT PUSH. The orchestrator re-gates and ships."
  } > "$out"
}

# nightly_repair_attempt BAD_LIST_FILE GATE_OUTPUT_FILE LOG_FILE
# Runs the bounded headless repair. Returns headless_run's rc (0 = it believes
# it fixed things — caller MUST re-gate; claims are never trusted).
nightly_repair_attempt() {
  local bad="$1" gout="$2" log="$3"
  local secs="${NIGHTLY_REPAIR_SECS:-600}"
  local prompt; prompt=$(mktemp -t nightly-repair-prompt.XXXXXX.md)
  nightly_build_repair_prompt "$bad" "$gout" "$prompt"
  headless_run "repair" "$prompt" "sonnet" "$secs" "$log"
  local rc=$?
  rm -f "$prompt" 2>/dev/null || true
  return $rc
}
