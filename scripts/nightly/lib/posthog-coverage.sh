#!/bin/bash
# posthog-coverage.sh — telemetry COVERAGE-HEALTH helper for the nightly job.
#
# Answers a question no other lane asks: "does every event the CODE claims to fire
# actually arrive in PostHog?" Lane 03 instruments NEW funnel gaps; this audits the
# EXISTING contract. Two failure modes it catches:
#   • DEAD     — code defines the event but it has ZERO live volume (unreachable path,
#                a broken emitter, or a never-triggered branch).
#   • CRATERED — the event fired a healthy baseline but its volume collapsed (a deploy
#                silently broke the call site — the most insidious regression).
#
# Pure/testable functions (no network — the lane supplies live data via posthog-query.sh):
#   nightly_extract_growth_events <growthTracking.ts>   -> event names, one per line
#   nightly_coverage_classify <code-events-file> <live-tsv>  -> markdown of DEAD+CRATERED
#
# live-tsv rows: "<eventName>\t<vol_last_7d>\t<vol_prior_7d>" (include both the bare name
# and the 'growth:'-prefixed name; the emit helper dual-prefixes). See test for fixtures.
set -uo pipefail

# Extract the string-literal members of the `export type GrowthEvent = ... ;` union.
# Scoped strictly between the union declaration and its terminating semicolon so we never
# pick up literals from neighbouring code or the GrowthEventData interface.
nightly_extract_growth_events() { # <file>
  local file="$1"
  [ -f "$file" ] || return 1
  awk '
    /export[ \t]+type[ \t]+GrowthEvent[ \t]*=/ { inunion=1; next }
    inunion {
      line = $0
      sub(/^[ \t]*/, "", line)
      # Only real union-member lines: leading "|" then the quoted literal.
      # Comment lines (// ...) never match, so embedded quotes/semicolons in
      # doc comments cannot contaminate or truncate extraction.
      if (line ~ /^\|/ && match(line, /'\''[a-zA-Z0-9_:.-]+'\''/)) {
        lit = substr(line, RSTART+1, RLENGTH-2)
        print lit
        if (line ~ /;[ \t]*(\/\/.*)?$/) exit
      }
    }
  ' "$file" | awk '!seen[$0]++'
}

# ponytail: CRATER threshold tuned for nightly noise — only flag when the prior-7d baseline
# was meaningful (>=BASELINE_MIN) AND today's 7d fell below DROP_PCT of it. Raise BASELINE_MIN
# if low-volume events false-positive.
nightly_coverage_classify() { # <code-events-file> <live-tsv>
  local code="$1" live="$2"
  local BASELINE_MIN="${COVERAGE_BASELINE_MIN:-20}"
  local DROP_PCT="${COVERAGE_DROP_PCT:-30}"   # crater if d7 < prev7 * DROP_PCT/100
  [ -f "$code" ] || return 1
  [ -f "$live" ] || return 1

  echo "| event | status | live 7d | prior 7d |"
  echo "|---|---|---|---|"
  local ev d7 prev7
  while IFS= read -r ev; do
    [ -n "$ev" ] || continue
    # Sum volume across the bare name AND the growth:-prefixed emit.
    read -r d7 prev7 < <(awk -F'\t' -v e="$ev" '
      $1==e || $1=="growth:" e { d+=$2; p+=$3 }
      END { printf "%d %d\n", d, p }' "$live")
    if [ "$d7" -eq 0 ] && [ "$prev7" -eq 0 ]; then
      echo "| \`$ev\` | DEAD | 0 | 0 |"
    elif [ "$prev7" -ge "$BASELINE_MIN" ] && [ $((d7 * 100)) -lt $((prev7 * DROP_PCT)) ]; then
      echo "| \`$ev\` | CRATERED | $d7 | $prev7 |"
    fi
  done < "$code"
}
