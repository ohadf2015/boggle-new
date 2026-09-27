#!/bin/bash
# Shared helpers for the Nightly Intelligence Suite (Phase 0 collectors + scorer).
# See docs/specs/nightly-intelligence-suite.md §3.1 (signal schema) and §5 (driver).
#
# Collectors source this, build their signals[] via emit_signal, and persist via
# intel_write. On their own timeout/failure they call stale_fallback to reuse the
# most recent prior snapshot (marked stale) so a dead source NEVER blocks the run.
#
# Env (set by run-intel.sh; tests set temp dirs):
#   INTEL_ROOT  docs/nightly/intel
#   INTEL_DIR   $INTEL_ROOT/$TODAY
#
# Pure local — no live APIs here, no claude/MCP. Tested by test/intel-lib.test.sh.

# Run a command under a hard wall-clock. macOS lacks GNU timeout; prefer gtimeout
# (brew coreutils), fall back to BSD/Linux `timeout`, then run unguarded (last
# resort — the caller's phase-level cap is the backstop). Returns the command's
# exit code, or 124 on timeout.
with_timeout() {
  local secs="$1"; shift
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout --kill-after=5s "${secs}s" "$@"
  elif command -v timeout >/dev/null 2>&1; then
    timeout --kill-after=5s "${secs}s" "$@"
  else
    "$@"
  fi
}

# Build ONE normalized signal JSON object (the §3.1 schema). All collectors emit
# the same shape so score-brief.sh never special-cases a source.
# usage: emit_signal SOURCE KIND TITLE METRIC MAGNITUDE REACH SEVERITY \
#                    LANE TARGET_METRIC [EVIDENCE] [EFFORT] FINGERPRINT
# MAGNITUDE/REACH numeric; SEVERITY 0–1 (normalized WITHIN the source by the
# collector); EFFORT one of S|M|L (defaults M); FINGERPRINT stable dedup id.
emit_signal() {
  jq -n \
    --arg  source "${1:-}" --arg kind "${2:-}" --arg title "${3:-}" --arg metric "${4:-}" \
    --argjson magnitude "${5:-0}" --argjson reach "${6:-0}" --argjson severity "${7:-0}" \
    --arg  lane "${8:-}" --arg target_metric "${9:-}" --arg evidence "${10:-}" \
    --arg  effort "${11:-M}" --arg fingerprint "${12:-}" \
    '{source:$source,kind:$kind,title:$title,metric:$metric,
      magnitude:$magnitude,reach:$reach,severity:$severity,
      lane:$lane,target_metric:$target_metric,evidence:$evidence,
      effort:$effort,fingerprint:$fingerprint}'
}

# Persist a source's collection to $INTEL_DIR/<id>.json with a _meta envelope.
# usage: intel_write SOURCE_ID SIGNALS_JSON_ARRAY [SOURCE_OK=true] [NOTE]
intel_write() {
  local id="$1" signals="${2:-[]}" ok="${3:-true}" note="${4:-}"
  mkdir -p "$INTEL_DIR"
  jq -n \
    --arg id "$id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson ok "$ok" --arg note "$note" --argjson signals "$signals" \
    '{_meta:{source:$id,collected_at:$ts,stale:false,stale_since:null,source_ok:$ok,note:$note},
      signals:$signals}' \
    > "$INTEL_DIR/$id.json"
}

# Reuse the most recent PRIOR snapshot for a source that failed/timed out today,
# marked stale (and source_ok:false) so the scorer applies a confidence penalty.
# If no prior snapshot exists anywhere, write an empty stale file (never errors —
# a dead source must not break Phase 0). usage: stale_fallback SOURCE_ID
stale_fallback() {
  local id="$1"
  mkdir -p "$INTEL_DIR"
  # Date-named dirs sort chronologically; pick the newest prior dir that has this
  # source, excluding today's (which is the one we're falling back FOR).
  local prev=""
  local d
  while IFS= read -r d; do
    [ "${d%/}" = "${INTEL_DIR%/}" ] && continue
    if [ -f "${d%/}/${id}.json" ]; then prev="${d%/}/${id}.json"; break; fi
  done < <(ls -1d "$INTEL_ROOT"/*/ 2>/dev/null | sort -r)

  if [ -n "$prev" ] && [ -f "$prev" ]; then
    jq '._meta.stale=true
        | ._meta.source_ok=false
        | ._meta.stale_since=(._meta.stale_since // ._meta.collected_at)
        | ._meta.note=((._meta.note // "") + " [stale-fallback]")' \
       "$prev" > "$INTEL_DIR/$id.json"
  else
    jq -n --arg id "$id" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{_meta:{source:$id,collected_at:$ts,stale:true,stale_since:null,source_ok:false,note:"no prior snapshot"},
        signals:[]}' \
      > "$INTEL_DIR/$id.json"
  fi
}
