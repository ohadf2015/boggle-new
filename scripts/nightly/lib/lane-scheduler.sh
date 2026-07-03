#!/bin/bash
# lane-scheduler.sh — brief-signal-gated lane selection (2026-07-03 overhaul,
# spec docs/superpowers/specs/2026-07-03-nightly-overhaul.md C3).
#
# The 12 lanes used to run EVERY night in fixed order regardless of signal. A
# lane whose Phase-0 brief slice is empty falls back to in-lane "ONE targeted
# discovery" — in practice often invented, low-value work — while burning the
# shared usage window that later high-signal lanes then hit rc=75 on.
#
# Policy (deliberately simple):
#   - CORE lanes (NIGHTLY_CORE_LANES) always run — the founder's priority set.
#   - Non-core lanes run iff brief.json has ≥1 signal bucketed for them.
#   - Of the remaining zero-signal non-core lanes, keep NIGHTLY_IDLE_QUOTA (2)
#     by day-of-year rotation, so every lane still gets periodic attention
#     (an idle lane can DISCOVER new signals its collectors don't cover yet).
#   - Order is never changed — the priority-first order encodes founder intent.
#   - Fail-open: missing/broken brief.json or NIGHTLY_SCHEDULER=0 → all lanes.
#
# Tested by test/lane-scheduler.test.sh.
set -uo pipefail

# nightly_schedule_lanes BRIEF_JSON LANE...
# Prints the lanes to run, one per line, in the given order.
# NIGHTLY_DOY overrides day-of-year for deterministic tests.
nightly_schedule_lanes() {
  local brief="${1:-}"; shift
  local lanes=("$@")

  if [ "${NIGHTLY_SCHEDULER:-1}" = "0" ] || [ -z "$brief" ] || [ ! -f "$brief" ] \
     || ! jq -e '.by_lane' "$brief" >/dev/null 2>&1; then
    printf '%s\n' "${lanes[@]}"
    return 0
  fi

  local core=" ${NIGHTLY_CORE_LANES:-01-triage 11-mode-qa 02-perf 05-landing} "
  local quota="${NIGHTLY_IDLE_QUOTA:-2}"
  local doy="${NIGHTLY_DOY:-$(date +%j | sed 's/^0*//')}"

  # Partition: keep core + signal lanes; collect zero-signal non-core lanes.
  local idle=() lane n
  local -a keep=()
  for lane in "${lanes[@]}"; do
    if [[ "$core" == *" $lane "* ]]; then
      keep+=("$lane"); continue
    fi
    n=$(jq --arg l "$lane" '(.by_lane[$l] // []) | length' "$brief" 2>/dev/null || echo 0)
    if [ "${n:-0}" -gt 0 ] 2>/dev/null; then
      keep+=("$lane")
    else
      idle+=("$lane"); keep+=("__IDLE__$lane")
    fi
  done

  # Rotation: pick $quota consecutive idle lanes starting at doy % count, so the
  # picked pair advances daily and every idle lane cycles through.
  local picked=" "
  local count=${#idle[@]}
  if [ "$count" -gt 0 ]; then
    [ "$quota" -gt "$count" ] && quota="$count"
    local start=$(( doy % count )) i
    for (( i=0; i<quota; i++ )); do
      picked+="${idle[$(( (start + i) % count ))]} "
    done
  fi

  for lane in "${keep[@]}"; do
    if [[ "$lane" == __IDLE__* ]]; then
      lane="${lane#__IDLE__}"
      [[ "$picked" == *" $lane "* ]] && printf '%s\n' "$lane"
    else
      printf '%s\n' "$lane"
    fi
  done
  return 0
}
