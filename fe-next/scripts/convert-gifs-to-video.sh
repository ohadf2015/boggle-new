#!/bin/bash

# Script to convert mascot GIFs to optimized video formats (WebM and MP4)
# This dramatically reduces file size while maintaining animation quality
#
# Requirements:
# - ffmpeg (install via: brew install ffmpeg)
#
# Usage:
#   ./scripts/convert-gifs-to-video.sh

set -e

MASCOT_DIR="public/mascot"
OUTPUT_DIR="$MASCOT_DIR/video"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "🎬 Converting mascot GIFs to optimized video formats..."

# List of GIFs to convert (nobg versions only - these are used in the app)
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

  echo "📦 Converting ${gif}.gif..."

  # Convert to WebM (best compression, modern browsers, with transparency)
  # -c:v vp9 = VP9 codec for best quality/size ratio
  # -pix_fmt yuva420p = Enable alpha channel (transparency)
  # -b:v 0 = Constant quality mode
  # -crf 30 = Quality level (0-63, lower is better, 30 is good balance)
  # -auto-alt-ref 0 = Disable alternate reference frame (preserves alpha)
  # -an = No audio
  # -vf scale with sws_flags to preserve alpha during scaling
  ffmpeg -i "$input_file" \
    -c:v vp9 \
    -pix_fmt yuva420p \
    -b:v 0 \
    -crf 30 \
    -auto-alt-ref 0 \
    -an \
    -vf "scale=96:96:flags=lanczos" \
    -sws_flags lanczos+accurate_rnd+full_chroma_int \
    -y \
    "$OUTPUT_DIR/${gif}.webm" \
    2>&1 | grep -v "frame=" || true

  # Convert to MP4 (fallback for Safari/older browsers)
  # -c:v libx264 = H.264 codec
  # -crf 23 = Quality level (0-51, lower is better, 23 is good balance)
  # -pix_fmt yuv420p = Pixel format for compatibility
  # -movflags +faststart = Enable streaming
  ffmpeg -i "$input_file" \
    -c:v libx264 \
    -crf 23 \
    -pix_fmt yuv420p \
    -movflags +faststart \
    -an \
    -vf "scale=96:96" \
    -y \
    "$OUTPUT_DIR/${gif}.mp4" \
    2>&1 | grep -v "frame=" || true

  # Show file size comparison
  gif_size=$(du -h "$input_file" | awk '{print $1}')
  webm_size=$(du -h "$OUTPUT_DIR/${gif}.webm" | awk '{print $1}')
  mp4_size=$(du -h "$OUTPUT_DIR/${gif}.mp4" | awk '{print $1}')

  echo "  ✅ ${gif}: GIF=$gif_size → WebM=$webm_size, MP4=$mp4_size"
done

echo ""
echo "🎉 Conversion complete! Video files saved to $OUTPUT_DIR/"
echo ""
echo "📊 Total size comparison:"
du -sh "$MASCOT_DIR"/*.gif 2>/dev/null | awk '{sum+=$1} END {print "  GIFs total: " sum}'
du -sh "$OUTPUT_DIR"/*.webm "$OUTPUT_DIR"/*.mp4 2>/dev/null | awk '{sum+=$1} END {print "  Videos total: " sum}'
echo ""
echo "💡 Next steps:"
echo "  1. Update Mascot components to use <video> instead of <Image>"
echo "  2. Test in all browsers (especially Safari for MP4 fallback)"
echo "  3. Remove old GIF files after verifying video works"
