#!/usr/bin/env python3
# Cinematic trailer edit: normalize each shot, crossfade-dissolve chain, lay orchestral score.
import os, subprocess, shlex
ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)
os.makedirs("norm", exist_ok=True)
os.makedirs("out", exist_ok=True)

W, H, FPS = 1080, 1920, 30
ENC = "-c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium -r 30"

# (source, start, duration, speed) — trims tuned for trailer pacing
SHOTS = [
    ("clips/s1_open.mp4",    0.10, 2.40, 1.00),  # atmospheric open
    ("clips/s2_hero.mp4",    0.30, 3.00, 1.00),  # hero reveal
    ("clips/s3_rival.mp4",   0.20, 2.20, 1.00),  # rival / conflict
    ("clips/s4_slam.mp4",    0.00, 2.20, 1.10),  # stakes — letters slam
    ("clips/s5_leap.mp4",    0.15, 2.10, 1.12),  # climax energy (music drop)
    ("clips/s6_triumph.mp4", 0.20, 3.10, 1.00),  # triumphant finale
]
END_CARD = ("cards/cine_end.png", 3.00)  # logo + CTA, slow push
XF = 0.35  # crossfade dissolve seconds

def run(cmd):
    subprocess.run(cmd, shell=True, check=True)

def dur(path):
    out = subprocess.check_output(
        f'ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 {shlex.quote(path)}',
        shell=True).decode().strip()
    return float(out)

# --- Pass 1: normalize each shot ---
norm_files = []
for i,(src,ss,d,spd) in enumerate(SHOTS):
    out = f"norm/{i:02d}.mp4"
    vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
          f"setpts=PTS/{spd},fps={FPS},format=yuv420p,setsar=1")
    run(f'ffmpeg -y -loglevel error -ss {ss} -i {shlex.quote(src)} -t {d/spd:.3f} -vf "{vf}" {ENC} -an {out}')
    norm_files.append(out)

# end card -> slow push-in clip
img,ed = END_CARD
ef = int(ed*FPS)
out = f"norm/{len(SHOTS):02d}.mp4"
vf = (f"scale={int(W*1.12)}:{int(H*1.12)},zoompan=z='min(zoom+0.0006,1.10)':d={ef}:"
      f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},format=yuv420p,setsar=1")
run(f'ffmpeg -y -loglevel error -loop 1 -i {shlex.quote(img)} -t {ed} -vf "{vf}" {ENC} -an {out}')
norm_files.append(out)

# --- Pass 2: xfade chain ---
durs = [dur(f) for f in norm_files]
inputs = " ".join(f"-i {f}" for f in norm_files)
fc = []
prev = "0:v"
cum = durs[0]
for k in range(1, len(norm_files)):
    offset = cum - XF
    out_lbl = f"x{k}" if k < len(norm_files)-1 else "vout"
    fc.append(f"[{prev}][{k}:v]xfade=transition=fade:duration={XF}:offset={offset:.3f}[{out_lbl}]")
    prev = out_lbl
    cum = cum + durs[k] - XF
final_v = cum  # total video duration

filter_v = ";".join(fc)
# audio: trim music to video length, fade in/out
afade_out = round(final_v-0.6, 2)
filter_a = f"[{len(norm_files)}:a]atrim=0:{final_v:.3f},afade=t=in:st=0:d=0.4,afade=t=out:st={afade_out}:d=0.6,aresample=44100[aout]"

cmd = (f'ffmpeg -y -loglevel error {inputs} -i audio/cine_music.m4a '
       f'-filter_complex "{filter_v};{filter_a}" '
       f'-map "[vout]" -map "[aout]" -c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium '
       f'-c:a aac -b:a 192k -movflags +faststart out/lexiclash_cinematic_ig.mp4')
run(cmd)
print(f"DONE total ~{final_v:.2f}s -> out/lexiclash_cinematic_ig.mp4")
