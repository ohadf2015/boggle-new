#!/bin/bash
# enrich-brief.sh — render $INTEL_DIR/brief.json into a human-readable brief.md.
#
# The deterministic markdown render runs ALWAYS and FIRST, so brief.md exists no
# matter what. Optional LLM enrichment (NIGHTLY_ENRICH_BRIEF=1) layers a narrative
# on top, but is best-effort and timeout-guarded: a hung/empty `claude` is
# discarded and the deterministic render stands. This mirrors run.sh's
# manager-summary fallback — the brief is NEVER blocked by an LLM hang (spec §2.4).
# Tested by test/enrich-brief.test.sh.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "$HERE/intel-lib.sh"

INTEL_DIR="${INTEL_DIR:?INTEL_DIR must be set}"
BJSON="$INTEL_DIR/brief.json"
BMD="$INTEL_DIR/brief.md"
[ -f "$BJSON" ] || { echo "enrich-brief: no brief.json — nothing to render"; exit 0; }

render_deterministic() {
  {
    echo "# Nightly Intelligence Brief — $(jq -r '._meta.generated_at' "$BJSON")"
    echo
    local stale; stale=$(jq -rc '(._meta.sources_stale // []) | if length==0 then "none" else join(", ") end' "$BJSON")
    echo "_$(jq -r '._meta.n_signals' "$BJSON") ranked signals. Sources OK: $(jq -rc '(._meta.sources_ok // []) | join(", ")' "$BJSON"). Stale: ${stale}._"
    echo
    echo "## Top opportunities (by score)"
    jq -r '.items[]? | "- **[\(.lane)]** \(.title) — score \(.score), reach \(.reach), severity \(.severity), effort \(.effort) (\(.source))"' "$BJSON"
    echo
    echo "## By lane"
    local lane
    for lane in $(jq -r '.by_lane // {} | keys[]' "$BJSON"); do
      echo "### $lane"
      jq -r --arg l "$lane" '.by_lane[$l][]? | "- \(.title) (score \(.score))"' "$BJSON"
    done
  } > "$BMD"
}

# 1) Always produce the deterministic render first.
render_deterministic

# 2) Optional, best-effort LLM enrichment. Off by default. If on and it produces
#    non-empty output within the timeout, prepend it as a "Synthesis" section;
#    otherwise the deterministic render stands untouched.
if [ "${NIGHTLY_ENRICH_BRIEF:-0}" = "1" ] && command -v claude >/dev/null 2>&1; then
  local_to=${NIGHTLY_ENRICH_TIMEOUT:-60}
  prompt="You are the nightly intelligence editor. Below is brief.json (ranked product-improvement signals from all data sources). Write a tight 5–10 line narrative: the single highest-leverage thing to fix tonight, any cross-source theme, and what to ignore. No preamble.

$(cat "$BJSON")"
  narrative=$(with_timeout "$local_to" claude -p "$prompt" 2>/dev/null || true)
  if [ -n "${narrative//[[:space:]]/}" ]; then
    tmp="$BMD.tmp"
    { echo "## Synthesis"; echo; echo "$narrative"; echo; cat "$BMD"; } > "$tmp" && mv "$tmp" "$BMD"
    echo "enrich-brief: LLM synthesis prepended"
  else
    echo "enrich-brief: LLM enrichment empty/timed out — deterministic render stands"
  fi
fi

echo "enrich-brief: wrote $BMD"
