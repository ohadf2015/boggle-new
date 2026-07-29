#!/bin/bash
# Lane 9 — Monetization / Revenue. Earning money is a MAIN nightly goal. This lane
# owns the DEDICATED revenue work: ad-UX / placement optimization (behind flags),
# education-institution upsell (lead-capture / contact-sales scaffolding), IAP /
# subscription experiments, and acting on the revenue intelligence brief.
#
# Boundary vs Lane 08: 08 = AdSense-approval content depth on informational pages;
# 09 = ad-UX + education upsell + IAP/sub experiments + revenue data. 09 must NOT
# edit the informational pages 08 owns (no file races).
#
# HARD GUARDRAIL (in the prompt): never touch coin-award amounts, ad-reward values,
# the coin economy, or payment/billing logic → human queue only. Ad changes ship
# behind flags, retention-safe.
#
# Sonnet · 10 min cap. DELIBERATELY shorter than 08's 15 min + LAST in the LANES array:
# the run's hard wall clock is 60 min (launchd TimeOut 3600) and per-lane caps already
# sum well over that, so the tail lane is the one sacrificed under pressure. Lane 09 is
# research-first / small-diff (1–2 flagged changes or a ranked backlog), so 600s fits the
# tail without endangering the commit/push. If revenue work consistently needs more,
# raise launchd TimeOut or move 09 earlier (founder ops decision).
set -uo pipefail
LIB_DIR="$(dirname "$0")/../lib"
# shellcheck disable=SC1091
. "$LIB_DIR/headless.sh"

LOG="${RUN_LOG:-/tmp/lane-09.log}"
PROMPT="$(dirname "$0")/../prompts/09-monetization.md"

headless_run "09-monetization" "$PROMPT" "sonnet" 600 "$LOG"
