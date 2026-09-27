#!/bin/bash
# Intel source registry — the extensibility contract (spec §10).
#
# Adding a data source is a ONE-LINE change here + dropping a collect-<id>.sh next
# to it. The Phase 0 driver (run-intel.sh) iterates INTEL_SOURCES; nothing else
# needs editing. Format per line:  "<id>:<script>:<timeout_sec>"
#   id           collector id (also the output filename: $INTEL_DIR/<id>.json)
#   script       collector script under lib/intel/
#   timeout_sec  per-collector hard wall-clock (with_timeout); a hang here costs
#                only this budget then falls back to the last-good snapshot.
#
# Order is rough priority (cheapest/richest REST sources first). Tested by
# test/registry.test.sh.
INTEL_SOURCES=(
  "posthog:collect-posthog.sh:90"
  "feedback:collect-feedback.sh:45"
  "railway:collect-railway.sh:60"
  "search:collect-search.sh:90"
  "sentry:collect-sentry.sh:60"
  "supabase:collect-supabase.sh:60"
  "revenue:collect-revenue.sh:60"
  "flagged-puzzles:collect-flagged-puzzles.sh:45"
  "restore:collect-restore.sh:20"
  "impact:collect-impact.sh:20"
)

# Validate the registry: every entry must be "id:script:timeout" with a numeric
# timeout. Prints offending lines to stderr and returns 1 if any are malformed;
# the driver uses this to SKIP a bad line (warn) rather than abort the phase.
# Echoes the well-formed entries to stdout (one per line).
intel_registry_lint() {
  local bad=0 entry id script tmo
  for entry in "${INTEL_SOURCES[@]}"; do
    IFS=':' read -r id script tmo <<<"$entry"
    if [ -z "$id" ] || [ -z "$script" ] || ! [[ "$tmo" =~ ^[0-9]+$ ]]; then
      echo "registry: SKIP malformed entry: '$entry'" >&2
      bad=1
      continue
    fi
    printf '%s:%s:%s\n' "$id" "$script" "$tmo"
  done
  return $bad
}
