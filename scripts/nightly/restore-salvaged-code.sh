#!/bin/bash
# restore-salvaged-code.sh <date-tag|latest> — restore lane CODE that a docs-only
# nightly salvage (or a drop-and-re-gate peel) reverted.
#
# When the nightly gate fails on lane code it ships DOCS-ONLY and reverts the lane
# CODE from the working tree (so master stays clean + founder WIP is never touched).
# BEFORE reverting, it backs up every dropped code file to
#   $LOG_DIR/salvaged-code-<date-tag>/   (mirrors repo-relative paths)
#
# HOW IT RESTORES (2026-09-19): per-file 3-way `git merge-file`, never a blind copy.
#   base   = the file at that night's `baseline sha=` (from $LOG_DIR/run-<tag>.log)
#   ours   = the file in the working tree NOW (master may have moved on since)
#   theirs = the salvaged lane version
# A blind `rsync -a` of the backup over the tree REVERTED master work: the 09-15/09-19
# backups carried a pre-#1034 WordWheelChallenge.tsx and clobbered the landed version
# three nights running. A file whose merge CONFLICTS is SKIPPED and reported (left
# untouched); a file that was deleted on master since, or created on both sides with
# different content, is skipped too.
#
# A backup dir containing a `LANDED` marker file has already been landed/superseded —
# it is skipped (and `latest` never resolves to it).
#
# IT DOES NOT COMMIT. Dropped code failed the gate at least once, so review + re-gate
# (lint/test/build) before shipping — never blind-commit restored code to master.
#
# Usage:
#   scripts/nightly/restore-salvaged-code.sh            # most recent un-LANDED backup
#   scripts/nightly/restore-salvaged-code.sh 20260611-020004
#   scripts/nightly/restore-salvaged-code.sh latest
#
# Exit: 0 = all files merged (or nothing to do / LANDED) · 3 = some files skipped
#       (conflict / deleted / both-added — listed) · 1 = no backup · 2 = no baseline sha.
# Env (overridable for tests): LEXI_NIGHTLY_LOG_DIR, LEXI_REPO_DIR,
#   LEXI_RESTORE_BASE_SHA (force the merge base when the run log is gone).
set -uo pipefail

LOG_DIR="${LEXI_NIGHTLY_LOG_DIR:-$HOME/logs/lexi-nightly}"
REPO_DIR="${LEXI_REPO_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
tag="${1:-latest}"

# Backups come from TWO drop paths: docs-only salvage → salvaged-code-<tag>/,
# drop-and-re-gate peel → dropped-<tag>/. Accept either (salvaged-code wins on
# a same-tag tie; peel + salvage never share a DATE_TAG in one run anyway).
if [ "$tag" = "latest" ]; then
  src=""
  for d in $(ls -dt "$LOG_DIR"/salvaged-code-* "$LOG_DIR"/dropped-* 2>/dev/null); do
    [ -d "$d" ] && [ ! -e "$d/LANDED" ] && { src="$d"; break; }
  done
else
  src="$LOG_DIR/salvaged-code-$tag"
  [ -d "$src" ] || src="$LOG_DIR/dropped-$tag"
fi

if [ -z "${src:-}" ] || [ ! -d "$src" ]; then
  echo "restore-salvaged-code: no (un-LANDED) backup found for '$tag' under $LOG_DIR" >&2
  echo "  available:" >&2
  ls -dt "$LOG_DIR"/salvaged-code-* "$LOG_DIR"/dropped-* 2>/dev/null | sed "s#$LOG_DIR/#    #" >&2 || echo "    (none)" >&2
  exit 1
fi

if [ -e "$src/LANDED" ]; then
  echo "restore-salvaged-code: $src has a LANDED marker — already landed/superseded; skipping (nothing restored)."
  exit 0
fi

# Resolve the merge base: the baseline sha of the run that produced this backup.
real_tag="${src##*/}"; real_tag="${real_tag#salvaged-code-}"; real_tag="${real_tag#dropped-}"
base_sha="${LEXI_RESTORE_BASE_SHA:-}"
if [ -z "$base_sha" ]; then
  base_sha=$(grep -m1 -oE 'baseline sha=[0-9a-f]{7,40}' "$LOG_DIR/run-$real_tag.log" 2>/dev/null | sed 's/^baseline sha=//')
fi
if [ -z "$base_sha" ] || ! git -C "$REPO_DIR" cat-file -e "${base_sha}^{commit}" 2>/dev/null; then
  echo "restore-salvaged-code: ABORT — no usable 'baseline sha=' for $real_tag (looked in $LOG_DIR/run-$real_tag.log; got '${base_sha:-none}')." >&2
  echo "  A 3-way merge needs the base; refusing a blind copy (it reverts master work)." >&2
  echo "  Override: LEXI_RESTORE_BASE_SHA=<sha> $0 $tag" >&2
  exit 2
fi

tmpd=$(mktemp -d -t salvage-merge.XXXXXX)
trap 'rm -rf "$tmpd"' EXIT
merged=(); unchanged=(); skipped=()

echo "restore-salvaged-code: 3-way merging $src → $REPO_DIR (base $base_sha)"
while IFS= read -r f; do
  rel="${f#"$src"/}"
  [ "$rel" = "LANDED" ] && continue
  cur="$REPO_DIR/$rel"
  if git -C "$REPO_DIR" cat-file -e "$base_sha:$rel" 2>/dev/null; then
    git -C "$REPO_DIR" show "$base_sha:$rel" > "$tmpd/base" 2>/dev/null
    if cmp -s "$f" "$tmpd/base"; then unchanged+=("$rel (lane version == baseline)"); continue; fi
    if [ ! -e "$cur" ]; then skipped+=("$rel — DELETED on master since the run"); continue; fi
    cp "$cur" "$tmpd/ours"
    git merge-file -q -L current -L "baseline-$real_tag" -L "salvage-$real_tag" \
      "$tmpd/ours" "$tmpd/base" "$f" 2>/dev/null
    mrc=$?
    if [ "$mrc" -ne 0 ]; then
      skipped+=("$rel — CONFLICT (merge rc=$mrc) vs current master; left untouched")
      continue
    fi
    if cmp -s "$tmpd/ours" "$cur"; then unchanged+=("$rel (already contains the lane change)"); continue; fi
    cat "$tmpd/ours" > "$cur"
    merged+=("$rel")
  else
    # Lane-CREATED file (absent at base).
    if [ ! -e "$cur" ]; then
      mkdir -p "$(dirname "$cur")"; cp -p "$f" "$cur"; merged+=("$rel (new file)")
    elif cmp -s "$f" "$cur"; then
      unchanged+=("$rel (identical file already present)")
    else
      skipped+=("$rel — created on BOTH sides with different content; left untouched")
    fi
  fi
done < <(find "$src" -type f | sort)

echo
echo "merged (${#merged[@]}):";      for x in "${merged[@]:-}";    do [ -n "$x" ] && echo "  + $x"; done
echo "unchanged (${#unchanged[@]}):"; for x in "${unchanged[@]:-}"; do [ -n "$x" ] && echo "  = $x"; done
echo "SKIPPED (${#skipped[@]}):";     for x in "${skipped[@]:-}";   do [ -n "$x" ] && echo "  ! $x"; done
echo
echo "Restored files failed the gate at least once — review + re-gate (lint/test/build)"
echo "and fix the real break before committing. Do NOT blind-commit to master."
[ "${#skipped[@]}" -eq 0 ] || exit 3
exit 0
