#!/bin/bash
# Batch render script for LexiClash video cutscenes
# Generates all video variants (24 total) for static delivery
set -e

# Configuration
FPS=30
WIDTH=1920
HEIGHT=1080
CRF=23
OUTPUT_DIR="public/videos/cutscenes"
ENTRY_POINT="remotion/index.ts"

# Video variants
WORLDS=("meadows" "springs" "caverns")
LOCALES=("en" "he" "sv" "ja")
TRANSITIONS=("meadows:springs" "springs:caverns")

# Counters
TOTAL_VIDEOS=$((${#WORLDS[@]} * ${#LOCALES[@]} + ${#TRANSITIONS[@]} * ${#LOCALES[@]} + ${#LOCALES[@]}))
CURRENT=0

echo "======================================"
echo "LexiClash Video Cutscene Renderer"
echo "======================================"
echo "Output directory: $OUTPUT_DIR"
echo "Total videos to render: $TOTAL_VIDEOS"
echo ""

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Function to render a video
render_video() {
    local composition="$1"
    local output_file="$2"
    local props="$3"

    CURRENT=$((CURRENT + 1))
    echo "[$CURRENT/$TOTAL_VIDEOS] Rendering: $output_file"

    npx remotion render "$ENTRY_POINT" "$composition" "$OUTPUT_DIR/$output_file" \
        --props="$props" \
        --codec=h264 \
        --crf=$CRF \
        --log=error
}

# 1. Level Intros: 3 worlds x 4 locales = 12 videos
echo ""
echo "--- Rendering Level Intros (12 videos) ---"
for world in "${WORLDS[@]}"; do
    for locale in "${LOCALES[@]}"; do
        output_file="level-intro-${world}-${locale}.mp4"
        props="{\"worldId\":\"${world}\",\"locale\":\"${locale}\"}"
        render_video "LevelIntro" "$output_file" "$props"
    done
done

# 2. World Transitions: 2 transitions x 4 locales = 8 videos
echo ""
echo "--- Rendering World Transitions (8 videos) ---"
for transition in "${TRANSITIONS[@]}"; do
    from_world="${transition%%:*}"
    to_world="${transition##*:}"
    for locale in "${LOCALES[@]}"; do
        output_file="transition-${from_world}-${to_world}-${locale}.mp4"
        props="{\"fromWorldId\":\"${from_world}\",\"toWorldId\":\"${to_world}\",\"locale\":\"${locale}\"}"
        render_video "WorldTransition" "$output_file" "$props"
    done
done

# 3. Tutorials: 4 locales = 4 videos
echo ""
echo "--- Rendering Tutorials (4 videos) ---"
for locale in "${LOCALES[@]}"; do
    output_file="tutorial-${locale}.mp4"
    props="{\"locale\":\"${locale}\"}"
    render_video "Tutorial" "$output_file" "$props"
done

# Summary
echo ""
echo "======================================"
echo "Rendering Complete!"
echo "======================================"
echo ""

# Count files and size
FILE_COUNT=$(find "$OUTPUT_DIR" -name "*.mp4" -type f | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$OUTPUT_DIR" 2>/dev/null | cut -f1)

echo "Total files: $FILE_COUNT"
echo "Total size: $TOTAL_SIZE"
echo ""
echo "Generated files:"
ls -lh "$OUTPUT_DIR"/*.mp4 2>/dev/null || echo "No mp4 files found"
