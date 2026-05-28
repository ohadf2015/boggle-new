#!/bin/bash
# score-brief.sh — DETERMINISTIC scorer (§3.2 of the intel-suite spec). Reads every
# $INTEL_DIR/<source>.json, dedups signals by fingerprint, scores them by a
# transparent formula, and writes a ranked $INTEL_DIR/brief.json bucketed by lane.
#
# ZERO LLM. This file alone guarantees a brief always exists, even if the optional
# LLM enrichment (enrich-brief.sh) hangs. Tested by test/score-brief.test.sh.
#
# Score (all factors transparent, see spec §3.2):
#   reach_norm = log1p(reach) / log1p(maxReachInRun)        # 0–1, dampens outliers
#   base       = severity * (0.5 + 0.5*reach_norm)          # severity-led, reach modulates
#   confidence = 1.0 fresh | 0.6 stale (source._meta.stale) # penalize yesterday's data
#   effort_w   = {S:1, M:2, L:4}[effort]
#   score      = base * confidence / effort_w
# severity is normalized WITHIN each source by the collector, so magnitudes are
# never compared across sources directly.
set -uo pipefail

INTEL_DIR="${INTEL_DIR:?INTEL_DIR must be set}"
BRIEF="$INTEL_DIR/brief.json"

# Gather every source file EXCEPT brief.json itself. Each signal is stamped with
# its source's freshness (confidence + stale flag) before merging.
signals='[]'
sources_ok='[]'
sources_stale='[]'
shopt -s nullglob
for f in "$INTEL_DIR"/*.json; do
  base=$(basename "$f")
  [ "$base" = "brief.json" ] && continue
  # Skip anything that isn't a valid intel envelope (defensive).
  jq -e '._meta and (.signals|type=="array")' "$f" >/dev/null 2>&1 || continue

  sid=$(jq -r '._meta.source // "unknown"' "$f")
  is_stale=$(jq -r '._meta.stale // false' "$f")
  if [ "$is_stale" = "true" ]; then
    sources_stale=$(jq -n --argjson a "$sources_stale" --arg s "$sid" '$a + [$s]')
  else
    sources_ok=$(jq -n --argjson a "$sources_ok" --arg s "$sid" '$a + [$s]')
  fi

  # Stamp each signal with confidence + stale, then append to the running array.
  stamped=$(jq -c --argjson stale "$([ "$is_stale" = "true" ] && echo true || echo false)" \
    '[.signals[] | . + {confidence: (if $stale then 0.6 else 1.0 end), stale: $stale}]' "$f")
  signals=$(jq -n --argjson a "$signals" --argjson b "$stamped" '$a + $b')
done
shopt -u nullglob

# Dedup by fingerprint (keep the higher-magnitude duplicate), score, sort, rank.
items=$(echo "$signals" | jq -c '
  # dedup: among same-fingerprint signals keep the one with the largest magnitude
  ( group_by(.fingerprint) | map(max_by(.magnitude)) ) as $uniq
  | ($uniq | map(.reach) | max // 0) as $maxReach
  | (if $maxReach > 0 then (($maxReach + 1) | log) else 1 end) as $maxR
  | $uniq
  | map(
      (if $maxReach > 0 then (((.reach + 1) | log) / $maxR) else 0 end) as $rn
      | (.severity * (0.5 + 0.5 * $rn)) as $b
      | (.confidence // 1.0) as $conf
      | (({"S":1,"M":2,"L":4}[.effort]) // 2) as $ew
      | . + { reach_norm: (($rn*1000|round)/1000),
              score: (((($b * $conf) / $ew * 1000) | round) / 1000) }
    )
  | sort_by(-.score)
  | to_entries | map(.value + {rank: (.key + 1)})
')

# Bucket by lane for the per-lane brief slice headless.sh consumes.
by_lane=$(echo "$items" | jq -c 'group_by(.lane) | map({key: .[0].lane, value: .}) | from_entries')

mkdir -p "$INTEL_DIR"
jq -n \
  --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --argjson items "$items" \
  --argjson by_lane "$by_lane" \
  --argjson sources_ok "$sources_ok" \
  --argjson sources_stale "$sources_stale" \
  '{_meta:{generated_at:$ts, n_signals:($items|length),
           sources_ok:$sources_ok, sources_stale:$sources_stale},
    items:$items, by_lane:$by_lane}' \
  > "$BRIEF"

echo "score-brief: wrote $(echo "$items" | jq 'length') ranked items → $BRIEF"
