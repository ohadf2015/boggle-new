#!/bin/bash
# wt-restore.sh — inspect / recover working-tree snapshots taken by wt-snapshot.sh.
#
#   wt-restore.sh                 # list snapshots (newest first) + their baseline sha
#   wt-restore.sh <ts>            # show which files differ from the CURRENT tree
#   wt-restore.sh <ts> <path>     # print one file from that snapshot to stdout
#   wt-restore.sh <ts> --apply    # copy the snapshot's files back over the working
#                                 # tree (additive: never deletes your current files)
#
# Recovery is deliberately manual + non-destructive — you choose what to pull back.

set -uo pipefail
REPO="${WT_GUARD_REPO:-/Users/ohadfisher/git/boggle-new}"
DEST="${WT_GUARD_DEST:-$HOME/.cache/lexi-wt-backups}"

ts="${1:-}"
arg2="${2:-}"

if [ -z "$ts" ]; then
  echo "snapshots in $DEST (newest first):"
  for d in $(ls -1dt "$DEST"/2*/ 2>/dev/null); do
    t="$(basename "$d")"
    head="$(cat "$d/.HEAD" 2>/dev/null | cut -c1-9)"
    n="$(wc -l < "$d/.dirty" 2>/dev/null | tr -d ' ')"
    printf '  %s   base=%s   dirty=%s files\n' "$t" "${head:-?}" "${n:-?}"
  done
  echo
  echo "usage: $0 <ts> [<path> | --apply]"
  exit 0
fi

SNAP="$DEST/$ts/tree"
[ -d "$SNAP" ] || { echo "no snapshot tree at $SNAP"; exit 1; }

if [ "$arg2" = "--apply" ]; then
  echo "applying $ts over working tree (additive copy, no deletions)…"
  rsync -a "$SNAP/" "$REPO/"
  echo "done. Review with: git -C $REPO status"
  exit 0
fi

if [ -n "$arg2" ]; then
  cat "$SNAP/$arg2"
  exit 0
fi

echo "files in snapshot $ts that differ from the current working tree:"
diff -qr "$SNAP" "$REPO" 2>/dev/null \
  | grep -vE '/(node_modules|\.next|\.git|\.turbo|dist|build|coverage)/' \
  | sed 's/^/  /'
