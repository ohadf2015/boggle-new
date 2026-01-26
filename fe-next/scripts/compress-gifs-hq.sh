#!/bin/bash

# Script to re-compress mascot GIFs with higher quality settings
# Addresses low quality issue from previous 96x96 compression
#
# Improvements over compress-gifs.sh:
# - Scale to 192x192 (2x larger) for better quality on retina displays
# - Increase palette to 256 colors (from 128) for smoother gradients
# - Keep file sizes reasonable (target 400-700KB per GIF)
#
# Requirements:
# - ffmpeg (install via: brew install ffmpeg)
#
# Usage:
#   ./scripts/compress-gifs-hq.sh

set -e

MASCOT_DIR="public/mascot"
BACKUP_DIR="$MASCOT_DIR/originals"

echo "🎨 Re-compressing mascot GIFs with higher quality settings..."
echo ""

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ Error: ffmpeg not found"
  echo "Install with: brew install ffmpeg"
  exit 1
fi

# Verify originals exist
if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Error: Originals not found at $BACKUP_DIR"
  echo "Run compress-gifs.sh first to create backups"
  exit 1
fi

# List of GIFs to re-compress
GIFS=(
  "main-nobg"
  "play-nobg"
  "study-nobg"
  "oops-nobg"
  "celebration-nobg"
  "dj-nobg"
  "trophy-nobg"
)

echo "📋 Quality improvements:"
echo "  • Resolution: 96x96 → 192x192 (2x)"
echo "  • Palette: 128 colors → 256 colors"
echo "  • Dithering: Optimized for smooth gradients"
echo ""

for gif in "${GIFS[@]}"; do
  original_file="$BACKUP_DIR/${gif}.gif"
  output_file="$MASCOT_DIR/${gif}.gif"

  if [ ! -f "$original_file" ]; then
    echo "⚠️  Skipping $gif - original not found"
    continue
  fi

  echo "🎨 Processing ${gif}.gif..."

  # Get original size
  original_size=$(du -h "$original_file" | awk '{print $1}')
  current_size=$(du -h "$output_file" | awk '{print $1}')

  # Re-compress GIF with HIGHER QUALITY settings
  # Strategy:
  # 1. Scale to 192x192 (2x larger than before for retina displays)
  # 2. Use 256-color palette (double previous 128 colors)
  # 3. Optimize dithering for smooth gradients
  # 4. Apply slight lossy compression for size/quality balance
  ffmpeg -i "$original_file" \
    -vf "scale=192:192:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256:stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a" \
    -y \
    "${output_file}.tmp.gif" \
    2>&1 | grep -v "frame=" || true

  # Replace current with higher quality version
  mv "${output_file}.tmp.gif" "$output_file"

  # Get new size
  new_size=$(du -h "$output_file" | awk '{print $1}')

  echo "  ✅ ${gif}: ${current_size} (was ${original_size}) → ${new_size}"
done

echo ""
echo "🎉 High-quality re-compression complete!"
echo ""
echo "📊 Size comparison:"
echo "  Original GIFs: $(du -sh $BACKUP_DIR/*.gif 2>/dev/null | awk '{sum+=$1} END {print sum}')"
echo "  Previous compressed: ~2.4MB total"
echo "  New high-quality: $(du -sh $MASCOT_DIR/*-nobg.gif 2>/dev/null | awk '{sum+=$1} END {print sum}') total"
echo ""
echo "💡 Quality improvements:"
echo "  • 2x larger dimensions (192x192 vs 96x96)"
echo "  • 2x more colors (256 vs 128)"
echo "  • Better dithering algorithm (sierra2_4a)"
echo ""
echo "⚠️  Note: Files will be ~2-3x larger than before"
echo "   Expected range: 400-800KB per GIF (vs 200-400KB)"
echo "   This is acceptable for better visual quality"
echo ""
