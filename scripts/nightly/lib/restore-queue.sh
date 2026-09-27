#!/bin/bash
# restore-queue.sh — dropped-work requeue ledger (2026-07-03 overhaul, spec
# docs/superpowers/specs/2026-07-03-nightly-overhaul.md C1).
#
# Problem measured over 06-19→07-03: 312 files dropped/salvaged across 8 nights,
# recovered only by MANUAL founder restores. A drop already alerts + backs up,
# but nothing feeds the work back into the loop — this ledger does. run.sh
# appends an entry at every drop site; the Phase-0 collector
# (lib/intel/collect-restore.sh) turns unresolved entries into top-severity
# 01-triage brief signals, so the NEXT night's first lane restores + re-gates the
# work autonomously. Lane 01 marks an entry done by appending
# {"resolve":"<tag>"}.
#
# Pure jq/append — no git, no network. Tested by test/restore-queue.test.sh.
set -uo pipefail

# restore_queue_append QUEUE_FILE DATE_TAG FILES_LIST_FILE BACKUP_DIR REASON
# Appends one ndjson entry: {tag, date, files[], backup, reason}. Never fails the
# caller (a broken requeue must not break the drop path that invokes it).
restore_queue_append() {
  local q="$1" tag="$2" files_file="$3" backup="$4" reason="${5:-}"
  mkdir -p "$(dirname "$q")" 2>/dev/null || true
  jq -cn \
    --arg tag "$tag" \
    --arg date "$(date +%Y-%m-%d)" \
    --arg backup "$backup" \
    --arg reason "$reason" \
    --argjson files "$(jq -Rn '[inputs | select(length>0)]' < "$files_file" 2>/dev/null || echo '[]')" \
    '{tag:$tag, date:$date, files:$files, backup:$backup, reason:$reason}' \
    >> "$q" 2>/dev/null || true
}

# restore_queue_pending QUEUE_FILE
# Prints unresolved entries (one compact json per line): entries whose .tag has
# no later {"resolve":"<tag>"} line. Missing file / malformed lines → skipped,
# always exits 0 (a requeue read must never block a run).
restore_queue_pending() {
  local q="${1:-}"
  [ -n "$q" ] && [ -f "$q" ] || return 0
  jq -cs '
    [ .[] | select(type=="object") ] as $rows
    | [ $rows[] | select(.resolve? != null) | .resolve ] as $resolved
    | $rows[] | select(.tag? != null) | select(.tag as $t | $resolved | index($t) | not)
  ' <(grep -E '^\{' "$q" 2>/dev/null | while IFS= read -r l; do
        echo "$l" | jq -c . 2>/dev/null || true
      done) 2>/dev/null
  return 0
}
