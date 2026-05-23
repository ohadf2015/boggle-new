#!/bin/bash
# gate-isolated.sh — run the lint/test/build gate against ONLY the nightly's
# authored changes, in a throwaway git worktree. Sourced by run.sh.
#
# WHY: the in-place gate runs lint/test/build over the WHOLE working tree, so a
# founder's concurrent WIP (or a half-finished edit from another session) that
# doesn't lint/type-check fails the nightly's gate even when every lane's own
# code is clean. That is exactly what aborted the 2026-05-23 daytime run.
#
# THE SAFETY PROPERTY (proven by test/gate-isolated.test.sh):
#   The founder's working tree is NEVER read for gating and NEVER written. We
#   add a worktree at HEAD (clean committed master), copy ONLY the lane-authored
#   files into it, CoW-clone node_modules, and gate there. A bug in here can
#   therefore only produce a wrong pass/fail — it can NEVER lose founder WIP.
#   And it gates exactly `clean master + authored` = what actually gets committed.
#
# Requires: $PROJECT_DIR, $RUN_LOG, log(). $NIGHTLY_GATE_CMD overridable for tests.
# Returns: 0 gate passed · 1 gate failed · 2 setup failed (caller falls back).

# Build-time files git can't see (gitignored) that `next build` needs in the
# worktree. node_modules is handled separately (CoW clone).
NIGHTLY_GATE_ENV_FILES=(
  "fe-next/.env.local"
  "fe-next/.env"
  "fe-next/.env.production.local"
)

# run_isolated_gate <authored_list_file>
run_isolated_gate() {
  local authored="$1"
  [ -n "$authored" ] && [ -s "$authored" ] || { log "isolated-gate: empty authored list — nothing to gate"; return 0; }

  local wt; wt=$(mktemp -d -t nightly-gate.XXXXXX)
  rm -rf "$wt"   # 'git worktree add' wants a non-existent path
  if ! git -C "$PROJECT_DIR" worktree add --detach --quiet "$wt" HEAD 2>>"$RUN_LOG"; then
    log "isolated-gate: 'git worktree add' failed — caller should fall back to in-place gate"
    git -C "$PROJECT_DIR" worktree prune 2>/dev/null || true
    return 2
  fi

  # Apply ONLY the lane-authored files onto the clean checkout. A path present in
  # the main working tree is copied; a path the lane DELETED (absent now) is
  # removed in the worktree so the gate sees the deletion too.
  local p
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [ -e "$PROJECT_DIR/$p" ]; then
      mkdir -p "$wt/$(dirname "$p")" 2>/dev/null || true
      cp -p "$PROJECT_DIR/$p" "$wt/$p" 2>>"$RUN_LOG" || true
    else
      rm -f "$wt/$p" 2>/dev/null || true
    fi
  done < "$authored"

  # node_modules: copy-on-write clone (instant on APFS, ~0 real disk). Fall back
  # to a plain copy if the filesystem doesn't support clonefile.
  if [ -d "$PROJECT_DIR/fe-next/node_modules" ]; then
    cp -Rc "$PROJECT_DIR/fe-next/node_modules" "$wt/fe-next/node_modules" 2>>"$RUN_LOG" \
      || cp -R "$PROJECT_DIR/fe-next/node_modules" "$wt/fe-next/node_modules" 2>>"$RUN_LOG" \
      || { log "isolated-gate: node_modules clone failed — falling back to in-place gate"; _isolated_gate_cleanup "$wt"; return 2; }
  fi
  # Build-time env (gitignored → absent from the checkout).
  local envf
  for envf in "${NIGHTLY_GATE_ENV_FILES[@]}"; do
    [ -f "$PROJECT_DIR/$envf" ] && { mkdir -p "$wt/$(dirname "$envf")"; cp -p "$PROJECT_DIR/$envf" "$wt/$envf" 2>/dev/null || true; }
  done

  log "isolated-gate: gating $(grep -c . "$authored") authored file(s) on a clean HEAD checkout (worktree $wt)"
  local rc=0
  if [ -n "${NIGHTLY_GATE_CMD:-}" ]; then
    # Test seam: a deterministic command run inside the worktree's fe-next.
    ( cd "$wt/fe-next" && eval "$NIGHTLY_GATE_CMD" ) >>"$RUN_LOG" 2>&1 || rc=1
  else
    ( cd "$wt/fe-next" \
        && npm run lint >>"$RUN_LOG" 2>&1 \
        && npm run test >>"$RUN_LOG" 2>&1 \
        && { rm -rf .next-nightly 2>/dev/null; NEXT_BUILD_DIR=.next-nightly npm run build:fast >>"$RUN_LOG" 2>&1; } ) || rc=1
  fi

  _isolated_gate_cleanup "$wt"
  [ "$rc" = "0" ] && log "isolated-gate: PASS" || log "isolated-gate: FAIL (lane code broke lint/test/build)"
  return $rc
}

_isolated_gate_cleanup() {
  local wt="$1"
  git -C "$PROJECT_DIR" worktree remove --force "$wt" 2>/dev/null || rm -rf "$wt"
  git -C "$PROJECT_DIR" worktree prune 2>/dev/null || true
}
