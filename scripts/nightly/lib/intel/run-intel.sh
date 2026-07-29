#!/bin/bash
# run-intel.sh — Phase 0 driver of the Nightly Intelligence Suite (spec §5).
#
# Iterates the registry, runs every collector IN PARALLEL each under its own hard
# timeout (a hang costs only that collector's budget → stale fallback to last-good,
# never blocks the run), then scores → brief.json (deterministic, always) and
# enriches → brief.md. Writes ONLY under docs/nightly/intel/ (gate-immune).
# Exports BRIEF_FILE / BRIEF_JSON_FILE for the lane loop. Tested by test/run-intel.test.sh.
#
# Seams for testing: INTEL_COLLECTORS_DIR (registry + collectors location, default
# this dir); INTEL_ROOT / INTEL_DIR (output); INTEL_PHASE_TIMEOUT (phase backstop).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"
COLLECTORS_DIR="${INTEL_COLLECTORS_DIR:-$HERE}"
# shellcheck disable=SC1090
. "$COLLECTORS_DIR/registry.sh"

: "${PROJECT_DIR:=$(cd "$HERE/../../../.." && pwd)}"; export PROJECT_DIR
: "${TODAY:=$(date -u +%Y-%m-%d)}"; export TODAY
export INTEL_ROOT="${INTEL_ROOT:-$PROJECT_DIR/docs/nightly/intel}"
export INTEL_DIR="${INTEL_DIR:-$INTEL_ROOT/$TODAY}"
mkdir -p "$INTEL_DIR"
INTEL_PHASE_TIMEOUT="${INTEL_PHASE_TIMEOUT:-240}"

# Run a single collector (in a forked subshell). The subshell inherits intel-lib
# functions + INTEL_DIR/INTEL_ROOT, so stale_fallback works without export -f.
run_one() {
  local entry="$1" id script tmo path
  IFS=':' read -r id script tmo <<<"$entry"
  path="$COLLECTORS_DIR/$script"
  if [ ! -f "$path" ]; then
    echo "run-intel: MISSING collector $script → stale fallback ($id)" >&2
    stale_fallback "$id"; return 0
  fi
  if with_timeout "$tmo" bash "$path" >/dev/null 2>&1; then
    # collector may exit 0 but (defensively) write nothing — guarantee a file.
    [ -f "$INTEL_DIR/$id.json" ] || stale_fallback "$id"
  else
    echo "run-intel: collector $id failed/timed out → stale fallback" >&2
    stale_fallback "$id"
  fi
}

pids=()
while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  run_one "$entry" &
  pids+=("$!")
done < <(intel_registry_lint)

# Phase-level backstop: each collector already self-limits via with_timeout, so
# this only fires on a pathological straggler. POLL in 1s ticks (not one long
# `sleep $CAP`) and exit the instant collectors finish — a long background sleep
# would inherit fd1 and hang any `$(...)` caller until the cap elapsed. Redirect
# the watchdog's fds to /dev/null as belt-and-suspenders against that fd capture.
phase_watchdog() {
  local cap="$1"; shift
  local waited=0 alive
  while [ "$waited" -lt "$cap" ]; do
    sleep 1; waited=$((waited + 1)); alive=0
    for p in "$@"; do kill -0 "$p" 2>/dev/null && alive=1; done
    [ "$alive" -eq 0 ] && return 0
  done
  for p in "$@"; do kill "$p" 2>/dev/null; done
}
phase_watchdog "$INTEL_PHASE_TIMEOUT" "${pids[@]}" >/dev/null 2>&1 &
watchdog=$!
for p in "${pids[@]}"; do wait "$p" 2>/dev/null; done
kill "$watchdog" 2>/dev/null; wait "$watchdog" 2>/dev/null

# Deterministic brief (ALWAYS) → optional best-effort LLM enrichment.
bash "$HERE/score-brief.sh"
NIGHTLY_ENRICH_BRIEF="${NIGHTLY_ENRICH_BRIEF:-0}" bash "$HERE/enrich-brief.sh" || true

export BRIEF_JSON_FILE="$INTEL_DIR/brief.json"
export BRIEF_FILE="$INTEL_DIR/brief.md"
echo "run-intel: brief ready ($(jq '.items|length' "$BRIEF_JSON_FILE" 2>/dev/null || echo 0) items; stale: $(jq -rc '(._meta.sources_stale // [])|join(",")' "$BRIEF_JSON_FILE" 2>/dev/null))"
