#!/bin/bash

# Script to compress mascot GIFs using ffmpeg
# Reduces file size by optimizing color palette and frame delays
#
# Requirements:
# - ffmpeg (install via: brew install ffmpeg)
#
# Usage:
#   ./scripts/compress-gifs.sh

set -e

MASCOT_DIR="public/mascot"
BACKUP_DIR="$MASCOT_DIR/originals"

echo "🗜️  Compressing mascot GIFs..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# List of GIFs to compress (nobg versions only - these are used in the app)
GIFS=(
  "main-nobg"
  "play-nobg"
  "study-nobg"
  "oops-nobg"
  "celebration-nobg"
  "dj-nobg"
  "trophy-nobg"
)

for gif in "${GIFS[@]}"; do
  input_file="$MASCOT_DIR/${gif}.gif"

  if [ ! -f "$input_file" ]; then
    echo "⚠️  Skipping $gif - file not found"
    continue
  fi

  # Backup original
  if [ ! -f "$BACKUP_DIR/${gif}.gif" ]; then
    echo "💾 Backing up ${gif}.gif..."
    cp "$input_file" "$BACKUP_DIR/"
  fi

  echo "🗜️  Compressing ${gif}.gif..."

  # Get original size
  original_size=$(du -h "$input_file" | awk '{print $1}')

  # Compress GIF using ffmpeg
  # Strategy:
  # 1. Scale to 96x96 (actual display size)
  # 2. Optimize palette (reduce colors while maintaining quality)
  # 3. Use lossy compression (slight quality loss for size reduction)
  ffmpeg -i "$input_file" \
    -vf "scale=96:96:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5" \
    -y \
    "${input_file}.tmp.gif" \
    2>&1 | grep -v "frame=" || true

  # Replace original with compressed version
  mv "${input_file}.tmp.gif" "$input_file"

  # Get new size
  new_size=$(du -h "$input_file" | awk '{print $1}')

  echo "  ✅ ${gif}: ${original_size} → ${new_size}"
done

echo ""
echo "🎉 Compression complete!"
echo ""
echo "📊 Total size comparison:"
du -sh "$BACKUP_DIR"/*.gif 2>/dev/null | awk '{sum+=$1} END {print "  Original GIFs: " sum}'
du -sh "$MASCOT_DIR"/*.gif 2>/dev/null | grep -v originals | awk '{sum+=$1} END {print "  Compressed GIFs: " sum}'
echo ""
echo "💡 Originals backed up to: $BACKUP_DIR/"
