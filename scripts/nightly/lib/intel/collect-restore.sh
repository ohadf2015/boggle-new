#!/bin/bash
# Collector: restore-queue → intel signals (2026-07-03 overhaul, spec C1).
# Pending dropped-work entries (files the gate dropped on a prior night, backed
# up but never re-shipped) become TOP-severity 01-triage signals, so the next
# night's first lane restores + fixes + re-gates them autonomously instead of
# waiting for a manual founder restore (312 files were manually chased over
# 06-19→07-03). Pure local file read — no network. Resolution: lane 01 appends
# {"resolve":"<tag>"} to the queue after the restored work ships.
# Tested by test/collect-restore.test.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"
# shellcheck disable=SC1091
. "$HERE/../restore-queue.sh"

ID=restore
PROJECT_DIR="${PROJECT_DIR:-/Users/ohadfisher/git/boggle-new}"
QUEUE="${RESTORE_QUEUE_FILE:-$PROJECT_DIR/docs/nightly/restore-queue.ndjson}"

SIGNALS='[]'
add() { SIGNALS=$(jq -n --argjson a "$SIGNALS" --argjson s "$1" '$a + [$s]'); }

while IFS= read -r entry; do
  [ -z "$entry" ] && continue
  tag=$(echo "$entry" | jq -r '.tag')
  nfiles=$(echo "$entry" | jq -r '.files | length')
  files_head=$(echo "$entry" | jq -r '.files[:6] | join(", ")')
  backup=$(echo "$entry" | jq -r '.backup // ""')
  reason=$(echo "$entry" | jq -r '.reason // ""')
  date=$(echo "$entry" | jq -r '.date // ""')
  # Age-escalate. A restore that keeps losing the nightly scheduler strands
  # uncommitted lane code on master for days (Class 4 silent no-op — the exact
  # failure on 20260730-010001). Nights-pending bumps severity 0.95→0.99 and
  # marks the signal STALE so it cannot be silently out-ranked night after night.
  nights=0
  if [ -n "$date" ]; then
    d0=$(date -j -f "%Y-%m-%d" "$date" +%s 2>/dev/null || date -d "$date" +%s 2>/dev/null || echo "")
    if [ -n "$d0" ]; then nights=$(( ( $(date +%s) - d0 ) / 86400 )); [ "$nights" -lt 0 ] && nights=0; fi
  fi
  if [ "$nights" -ge 2 ]; then
    sev=0.99
    title="⚠️ STALE RESTORE ($nights nights unshipped) $tag ($nfiles files, dropped $date)"
    stale_note="STALE: dropped $nights nights ago, still not re-shipped — lane code stranded uncommitted on master (Class 4). Restore FIRST, before any other work tonight. "
  else
    sev=0.95
    title="Restore dropped nightly work $tag ($nfiles files, dropped $date)"
    stale_note=""
  fi
  evidence="${stale_note}restore: scripts/nightly/restore-salvaged-code.sh $tag (backup: $backup). Files: $files_head. Drop reason: $reason. After the restored work is fixed + shipping, append {\"resolve\":\"$tag\"} to docs/nightly/restore-queue.ndjson."
  add "$(emit_signal restore dropped_work "$title" dropped_files "$nfiles" "$nfiles" "$sev" 01-triage "" "$evidence" M "restore:$tag")"
done < <(restore_queue_pending "$QUEUE")

intel_write "$ID" "$SIGNALS" true ""
echo "collect-restore: emitted $(echo "$SIGNALS" | jq length) signals"
