#!/usr/bin/env bash
# Build the "Real-Time Word Battle" hero feature card for the App/Play store set.
#
#   scripts/make-multiplayer-promo.sh
#     -> screenshots/store-final/store-multiplayer-promo.png   (1080x1920)
#
# WHY THIS EXISTS: the set had promos for home / gameplay / adventure / daily / languages and none
# for multiplayer, which is the newest feature and the one worth selling. It is built from the raw
# 06-multiplayer.png rather than from scratch so the UI on the card is the real app.
#
# It also REPAIRS that screenshot: the secondary CTA's label ("CREATE PRIVATE") wrapped to two lines
# and the second line was clipped straight through the button's bottom border. The cause was
# `whitespace-nowrap` on a 21-23 character translated label inside a flex-1 button
# (components/multiplayer/ArenaCTAStrip.tsx, fixed 2026-08-12) — a broken-looking button in a store
# screenshot costs installs. The button is redrawn here with the label on one line; once the
# screenshot is regenerated from the running app, drop the BUTTON REDRAW block below.
#
# Colours are the app's own tokens from app/globals.css, not eyeballed:
#   --neo-pink #ff1493 · --neo-navy-light #16213e · page ground #1a0d2d
#
# Every rectangle below was MEASURED off the source at full resolution (a pixel-row profile of the
# top band), not estimated — the first version guessed and left a clipped descender and an orphaned
# accent bar on the card.
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root; screenshots/ is gitignored, this script is not

SRC="screenshots/store-final/06-multiplayer.png"
OUT="screenshots/store-final/store-multiplayer-promo.png"
[[ -s "$SRC" ]] || { echo "ERROR: missing $SRC"; exit 1; }

PINK='#ff1493'; NAVY='#16213e'; GROUND='#1a0d2d'; WHITE='#ffffff'
FONT="${FONT:-Avenir-Black}"
L1="${L1:-Real-time word battle.}"
L2="${L2:-Same board. One winner.}"

# Measured source geometry.
BX=578; BY=634; BW=302; BH=102     # the secondary CTA's rect
HEAD_TOP=180; HEAD_BOT=360         # headline text (195-275) + accent bar (340-348)
BAR_W=120; BAR_H=9; BAR_Y=348      # accent bar, same size as the source's

magick "$SRC" -depth 8 \
  `# --- BUTTON REDRAW: one line, inside its border -----------------------------` \
  \( -size ${BW}x${BH} xc:none \
     -fill "$NAVY" -stroke "$PINK" -strokewidth 6 \
     -draw "roundrectangle 3,3 $((BW-4)),$((BH-4)) 16,16" \
     -stroke none -fill "$PINK" -font "$FONT" -pointsize 30 -kerning 1.5 \
     -gravity center -annotate +0+0 "CREATE PRIVATE" \
  \) -gravity None -geometry +${BX}+${BY} -composite -geometry +0+0 \
  `# --- HEADLINE: cover the single-line original, set the two-line promo one ---` \
  -fill "$GROUND" -stroke none -draw "rectangle 0,${HEAD_TOP} 1080,${HEAD_BOT}" \
  -font "$FONT" -fill "$WHITE" -kerning 0.5 -pointsize 58 \
  -gravity North -annotate +0+196 "$L1" -annotate +0+266 "$L2" \
  \( -size ${BAR_W}x${BAR_H} xc:"$PINK" \) \
    -gravity North -geometry +0+${BAR_Y} -composite \
  "$OUT"

magick "$OUT" -resize 320x screenshots/store-final/.promo-preview.png
printf '%s  %s\n' "$OUT" "$(magick identify -format '%wx%h' "$OUT")"
