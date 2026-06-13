#!/bin/bash
# v3 witty lower-third overlays + inviting CTA overlay (magenta chroma-key + black stroke).
set -e
cd "$(dirname "$0")"; ROOT="$(pwd)"; mkdir -p overlays
F="file:///Users/ohadfisher/git/boggle-new/fe-next/public/fonts/fredoka-latin.woff2"
R="file:///Users/ohadfisher/git/boggle-new/fe-next/public/fonts/rubik-latin.woff2"
FACE="@font-face{font-family:Fredoka;src:url('$F') format('woff2');font-weight:300 700;font-display:block}@font-face{font-family:Rubik;src:url('$R') format('woff2');font-weight:300 900;font-display:block}"

render () { # id  bodycss  htmlbody
  cat > "overlays/$1.html" <<EOF
<!doctype html><html><head><meta charset="utf8"><style>$FACE
*{margin:0;padding:0;box-sizing:border-box}html{width:1280px;height:1920px;background:#FF00FF}
body{width:1280px;height:1920px;overflow:hidden;background:#FF00FF;font-family:Fredoka,sans-serif;$2}
</style></head><body>$3</body></html>
EOF
  agent-browser open "file://$ROOT/overlays/$1.html" >/dev/null 2>&1; sleep 1.1
  agent-browser screenshot --full "$ROOT/overlays/$1_full.png" >/dev/null 2>&1
  ffmpeg -y -loglevel error -i "overlays/$1_full.png" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" "overlays/$1_solid.png"
  ffmpeg -y -loglevel error -i "overlays/$1_solid.png" -vf "colorkey=0xFF00FF:0.32:0.10,format=rgba" "overlays/$1.png"
}

lower () { # id size color text
  render "$1" "display:flex;align-items:flex-end;justify-content:center;padding:0 70px 410px" \
  "<div style='font-weight:700;font-size:$2px;line-height:.98;text-align:center;color:$3;letter-spacing:-2px;-webkit-text-stroke:9px #000;paint-order:stroke fill;text-shadow:11px 11px 0 #000;max-width:1080px'>$4</div>"
}
lower o1 86  "#FFFEF0" "word games used to be relaxing"
lower o2 112 "#BFFF00" "so we ruined that 😈"
lower o3 100 "#FFFEF0" "five letters. one winner."
lower o4 100 "#FF1493" "&hellip;several ruined friendships 💀"
lower o5 112 "#00FFFF" "Scrabble could never."
lower o6 92  "#BFFF00" "the pink one is undefeated 😏"

render cta "display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:0 60px 250px" \
"<div style='font-family:Fredoka;font-weight:700;font-size:150px;color:#FFFEF0;-webkit-text-stroke:10px #000;paint-order:stroke fill;text-shadow:12px 12px 0 #000;letter-spacing:-3px;margin-bottom:34px'>your move 👉</div>
<div style='font-family:Fredoka;font-weight:700;font-size:104px;color:#0b0b14;background:#BFFF00;border:8px solid #000;box-shadow:14px 14px 0 #000;padding:26px 80px;border-radius:18px;margin-bottom:34px'>PLAY FREE</div>
<div style='font-family:Rubik;font-weight:900;font-size:60px;color:#00FFFF;-webkit-text-stroke:6px #000;paint-order:stroke fill;letter-spacing:2px'>lexiclash.live</div>"

agent-browser close --all >/dev/null 2>&1
echo "done"
