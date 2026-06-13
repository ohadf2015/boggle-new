#!/bin/bash
# Render witty lower-third text overlays as transparent PNGs (magenta chroma-key + black stroke).
set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"; mkdir -p overlays
F="file:///Users/ohadfisher/git/boggle-new/fe-next/public/fonts/fredoka-latin.woff2"
R="file:///Users/ohadfisher/git/boggle-new/fe-next/public/fonts/rubik-latin.woff2"

emit () { # id  size  color  html
  local id="$1" size="$2" color="$3" html="$4"
  cat > "overlays/$id.html" <<EOF
<!doctype html><html><head><meta charset="utf8"><style>
@font-face{font-family:Fredoka;src:url('$F') format('woff2');font-weight:300 700;font-display:block}
@font-face{font-family:Rubik;src:url('$R') format('woff2');font-weight:300 900;font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html{width:1280px;height:1920px;background:#FF00FF}
body{width:1280px;height:1920px;overflow:hidden;background:#FF00FF;font-family:Fredoka,sans-serif;
display:flex;align-items:flex-end;justify-content:center;padding:0 70px 430px}
.t{font-weight:700;font-size:${size}px;line-height:.98;text-align:center;color:${color};letter-spacing:-2px;
-webkit-text-stroke:9px #000;paint-order:stroke fill;text-shadow:11px 11px 0 #000;max-width:1080px}
</style></head><body><div class="t">$html</div></body></html>
EOF
  agent-browser open "file://$ROOT/overlays/$id.html" >/dev/null 2>&1
  sleep 1.2
  agent-browser screenshot --full "$ROOT/overlays/${id}_full.png" >/dev/null 2>&1
  # normalize 1080x1920 then chroma-key magenta -> transparent
  ffmpeg -y -loglevel error -i "overlays/${id}_full.png" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" "overlays/${id}_solid.png"
  ffmpeg -y -loglevel error -i "overlays/${id}_solid.png" -vf "colorkey=0xFF00FF:0.32:0.10,format=rgba" "overlays/${id}.png"
}

emit t1 92  "#FFFEF0" "word games used to be&hellip;"
emit t2 96  "#BFFF00" "a nap with extra steps 😴"
emit t3 116 "#FFFEF0" "so we fixed that."
emit t4 96  "#00FFFF" "REAL-TIME WORD BATTLES"
emit t5 104 "#FFFEF0" "you vs <span style=\"color:#FF1493\">your friends</span>"
emit t6 108 "#BFFF00" "same board.<br>no mercy."
agent-browser close --all >/dev/null 2>&1
echo "overlays done:"; ls overlays/*.png | grep -v full | grep -v solid
