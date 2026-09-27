#!/bin/bash
# Collector: Railway → normalized intel signals (spec §4). REST/CLI, NO MCP.
# Monitors deploy health (build success/failure status) using the railway CLI.
#
# Deploy health lane routing:
#   $railway logs HEALTHY  → 02-perf (informational, low severity)
#   $railway logs FAILED   → 01-triage (error, high severity ~0.9)
#
# Severity is normalized WITHIN this source. Degrades cleanly (stale_fallback) if
# the railway CLI is not available — a dead source must never block Phase 0.
# Tested by test/collect-railway.test.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

ID=railway

# Degrade if railway CLI not available
if ! command -v railway >/dev/null 2>&1; then
  stale_fallback "$ID"
  tmp="$INTEL_DIR/$ID.json.tmp"
  jq '._meta.note="railway CLI not linked"' \
     "$INTEL_DIR/$ID.json" > "$tmp" && mv "$tmp" "$INTEL_DIR/$ID.json"
  echo "collect-railway: railway CLI not found → stale fallback"
  exit 0
fi

# Fetch deploy logs from Railway (wrapped with timeout). Return empty string on
# timeout/error, so the collector degrading is clean.
railway_logs() {
  with_timeout 30 railway logs 2>/dev/null | tail -n 80 || true
}

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }

# Get logs
LOGS=$(railway_logs)

# Check for success markers (high priority to avoid false failures)
if echo "$LOGS" | grep -qE "Deploy.*(SUCCESS|live|healthy)|Build successful|status: SUCCESS"; then
  # Healthy deploy: informational perf signal, low severity
  add "$(emit_signal railway perf "Railway deploy healthy" deploy_status 1 0 0.15 02-perf "railway:deploy_status" "" M "railway:deploy:ok")"
  intel_write "$ID" "$SIGNALS" true ""
  echo "collect-railway: emitted $(echo "$SIGNALS" | jq length) signals (healthy)"
  exit 0
fi

# Check for failure markers (high severity)
if echo "$LOGS" | grep -qE "Deploy.*FAILED|Build failed|status: FAILED|Crashed|Stopped due to"; then
  # Failed deploy: error signal, high severity
  add "$(emit_signal railway error "Railway deploy failed" deploy_status 1 0 0.9 01-triage "railway:deploy:failed" "" M "railway:deploy:failed")"
  intel_write "$ID" "$SIGNALS" true ""
  echo "collect-railway: emitted $(echo "$SIGNALS" | jq length) signals (failed)"
  exit 0
fi

# No clear status yet (unusual for recent logs, but possible on quiet days)
# Emit a neutral signal and note the ambiguity
add "$(emit_signal railway perf "Railway deploy status unclear" deploy_status 0 0 0.2 02-perf "railway:deploy_status" "" M "railway:deploy:unclear")"
intel_write "$ID" "$SIGNALS" true "no terminal deploy status detected in recent logs"
echo "collect-railway: emitted $(echo "$SIGNALS" | jq length) signals (unclear)"
