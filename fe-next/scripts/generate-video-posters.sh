#!/bin/bash

# Script to generate poster images (first frame) from videos
# These posters are used to show something while the video loads
#
# Requirements:
# - ffmpeg (install via: brew install ffmpeg)
#
# Usage:
#   ./scripts/generate-video-posters.sh

set -e

VIDEO_DIR="public/mascot/video"
POSTER_DIR="public/mascot/posters"

# Create poster directory
mkdir -p "$POSTER_DIR"

echo "📸 Generating poster images from videos..."

# List of videos to process
VIDEOS=(
  "main-nobg"
  "play-nobg"
  "study-nobg"
  "oops-nobg"
  "celebration-nobg"
  "dj-nobg"
  "trophy-nobg"
)

for video in "${VIDEOS[@]}"; do
  webm_file="$VIDEO_DIR/${video}.webm"
  poster_file="$POSTER_DIR/${video}.jpg"

  if [ ! -f "$webm_file" ]; then
    echo "⚠️  Skipping $video - video file not found"
    continue
  fi

  echo "📸 Generating poster for ${video}..."

  # Extract first frame as JPEG
  # -ss 0 = Seek to 0 seconds (first frame)
  # -vframes 1 = Extract 1 frame
  # -q:v 2 = Quality (2 is high quality for JPEG)
  ffmpeg -i "$webm_file" \
    -ss 0 \
    -vframes 1 \
    -q:v 2 \
    -y \
    "$poster_file" \
    2>&1 | grep -v "frame=" || true

  poster_size=$(du -h "$poster_file" | awk '{print $1}')
  echo "  ✅ ${video}.jpg ($poster_size)"
done

echo ""
echo "🎉 Poster generation complete! Images saved to $POSTER_DIR/"
echo ""
echo "📊 Total poster size:"
du -sh "$POSTER_DIR"/*.jpg 2>/dev/null | awk '{sum+=$1} END {print "  " sum}'
