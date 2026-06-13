#!/bin/bash
# Build LexiClash IG trailer: pre-render each beat to a normalized 1080x1920/30fps seg, concat, lay music.
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"
CUBES="/Users/ohadfisher/git/boggle-new/fe-next/public/modes/cubes"
SEG="$ROOT/clips/seg"; mkdir -p "$SEG"
ENC="-c:v libx264 -pix_fmt yuv420p -r 30 -profile:v high -preset medium -movflags +faststart"
W=1080; H=1920

# --- helper: still image -> clip with gentle push-in (Ken Burns), readable ---
still () { # in out dur zmax
  local img="$1" out="$2" dur="$3" zmax="${4:-1.05}"
  local frames=$(python3 -c "print(int($dur*30))")
  ffmpeg -y -loglevel error -i "$img" -vf \
   "scale=2160:3840:force_original_aspect_ratio=increase,crop=2160:3840,zoompan=z='min(zoom+0.0008,$zmax)':d=$frames:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=30,format=yuv420p" \
   -t "$dur" $ENC -an "$out"
}

# --- helper: cube punch-zoom on navy ---
cube () { # name out dur
  local img="$CUBES/$1.png" out="$2" dur="$3"
  local frames=$(python3 -c "print(int($dur*30))")
  ffmpeg -y -loglevel error -f lavfi -i "color=c=0x1a1a2e:s=${W}x${H}:d=$dur:r=30" -i "$img" -filter_complex \
   "[1]scale=920:920:force_original_aspect_ratio=decrease[c];[0][c]overlay=(W-w)/2:(H-h)/2:format=auto,zoompan=z='min(zoom+0.004,1.16)':d=$frames:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=30,format=yuv420p" \
   -t "$dur" $ENC -an "$out"
}

# --- helper: AI clip -> normalized, optional speed ---
clip () { # in out start dur speed
  local in="$1" out="$2" ss="$3" dur="$4" spd="${5:-1.0}"
  ffmpeg -y -loglevel error -ss "$ss" -i "$in" -vf \
   "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setpts=PTS/${spd},format=yuv420p" \
   -t "$dur" $ENC -an "$out"
}

echo "building segments..."
clip clips/hook.mp4 "$SEG/01_hook.mp4" 0.15 2.7 1.05
still cards/card_a.png "$SEG/02_carda.mp4" 0.85 1.05
clip clips/duel.mp4 "$SEG/03_duel.mp4" 0.30 3.0 1.05
still cards/card_b.png "$SEG/04_cardb.mp4" 0.75 1.05
cube blast    "$SEG/05a.mp4" 0.50
cube wordcraft "$SEG/05b.mp4" 0.50
cube adventure "$SEG/05c.mp4" 0.50
cube braingym "$SEG/05d.mp4" 0.50
cube daily    "$SEG/05e.mp4" 0.50
still cards/card_c.png "$SEG/06_cardc.mp4" 0.95 1.05
still cards/card_end.png "$SEG/07_end.mp4" 2.7 1.04

echo "concat..."
ls "$SEG"/*.mp4 | sort | sed "s/^/file '/;s/$/'/" > "$SEG/list.txt"
cat "$SEG/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$SEG/list.txt" -c copy "$ROOT/out/video_noaudio.mp4"
VDUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$ROOT/out/video_noaudio.mp4")
echo "video dur: $VDUR"

echo "mux music (trim+fadeout)..."
FADE=$(python3 -c "print(round($VDUR-0.5,2))")
ffmpeg -y -loglevel error -i "$ROOT/out/video_noaudio.mp4" -i audio/music.m4a -filter_complex \
 "[1:a]atrim=0:${VDUR},afade=t=out:st=${FADE}:d=0.5,aresample=44100[a]" \
 -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest "$ROOT/out/lexiclash_trailer.mp4"
echo "DONE -> out/lexiclash_trailer.mp4"
ffprobe -v error -show_entries format=duration:stream=width,height,codec_name -of default=nw=1 "$ROOT/out/lexiclash_trailer.mp4"
