#!/bin/bash
# Movie-trailer captions: clean white, uppercase, tracked, thin edge -> transparent PNG (chroma-key).
# Scrim added separately via ffmpeg drawbox at edit time. Text band centered ~72% height.
set -e
cd "$(dirname "$0")"; ROOT="$(pwd)"; mkdir -p overlays
R="file:///Users/ohadfisher/git/boggle-new/fe-next/public/fonts/rubik-latin.woff2"

cap () { # id text
  cat > "overlays/$1.html" <<EOF
<!doctype html><html><head><meta charset="utf8"><style>
@font-face{font-family:Rubik;src:url('$R') format('woff2');font-weight:300 900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}html{width:1280px;height:1920px;background:#FF00FF}
body{width:1280px;height:1920px;overflow:hidden;background:#FF00FF;font-family:Rubik,sans-serif;
display:flex;align-items:flex-end;justify-content:center;padding:0 80px 480px}
.t{font-weight:600;font-size:58px;letter-spacing:14px;text-transform:uppercase;color:#FFFEF0;text-align:center;
white-space:nowrap;-webkit-text-stroke:2px #000;paint-order:stroke fill;text-shadow:0 3px 10px rgba(0,0,0,.9)}
</style></head><body><div class="t">$2</div></body></html>
EOF
  agent-browser open "file://$ROOT/overlays/$1.html" >/dev/null 2>&1; sleep 1.0
  agent-browser screenshot --full "$ROOT/overlays/$1_full.png" >/dev/null 2>&1
  ffmpeg -y -loglevel error -i "overlays/$1_full.png" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" "overlays/$1_solid.png"
  ffmpeg -y -loglevel error -i "overlays/$1_solid.png" -vf "colorkey=0xFF00FF:0.30:0.12,format=rgba" "overlays/$1.png"
}

cap cap1 "The Old Way"
cap cap2 "Everyone Plays At Once"
cap cap3 "One Board. Eight Rivals."
cap cap4 "Five Languages. One Crown."
agent-browser close --all >/dev/null 2>&1
echo "captions done"
