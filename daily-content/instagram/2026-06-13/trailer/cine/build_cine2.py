#!/usr/bin/env python3
# Witty cinematic contrast trailer: boring->switch->energetic, with text overlays, VO, ducked score.
import os, subprocess, shlex
ROOT = os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
os.makedirs("norm2", exist_ok=True); os.makedirs("out", exist_ok=True)
W,H,FPS = 1080,1920,30
ENC = "-c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium -r 30"
XF = 0.18

SHOTS = [
 dict(src="clips/a1_boring.mp4", ss=0.0, dur=4.6, spd=0.82, desat=True,
      ov=[("overlays/t1.png",0.4,2.45),("overlays/t2.png",2.55,4.6)]),
 dict(src="clips/a2_switch.mp4", ss=0.0, dur=1.9, spd=1.0, desat=False,
      ov=[("overlays/t3.png",0.12,1.9)]),
 dict(src="clips/s2_hero.mp4",   ss=0.3, dur=1.9, spd=1.0, desat=False, ov=[]),
 dict(src="clips/s3_rival.mp4",  ss=0.2, dur=2.1, spd=1.0, desat=False,
      ov=[("overlays/t5.png",0.15,2.1)]),
 dict(src="clips/s4_slam.mp4",   ss=0.0, dur=1.8, spd=1.1, desat=False,
      ov=[("overlays/t4.png",0.10,1.8)]),
 dict(src="clips/s5_leap.mp4",   ss=0.15,dur=1.8, spd=1.1, desat=False,
      ov=[("overlays/t6.png",0.15,1.8)]),
 dict(src="clips/s6_triumph.mp4",ss=0.2, dur=2.8, spd=1.0, desat=False, ov=[]),
]
END = dict(img="cards/cine_end.png", dur=4.2)
MUSIC = "audio/cine_music2.m4a"
# VO: (file, start_seconds)
VO = [("vo/vo1.wav",0.3),("vo/vo2.wav",4.30),("vo/vo3.wav",6.0),("vo/vo4s.wav",15.7)]

def run(c): subprocess.run(c, shell=True, check=True)
def dur(p): return float(subprocess.check_output(
    f'ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 {shlex.quote(p)}',shell=True).decode().strip())

# Stage 1: per-shot normalize + desat + overlay burn
norm=[]
for i,s in enumerate(SHOTS):
    out=f"norm2/{i:02d}.mp4"
    chain=f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setpts=PTS/{s['spd']},fps={FPS}"
    if s['desat']: chain+=",hue=s=0.28,eq=brightness=-0.04:contrast=1.02"
    chain+=",format=yuv420p,setsar=1"
    fc=f"[0:v]{chain}[v0]"; last="v0"; inputs=f"-ss {s['ss']} -t {s['dur']*s['spd']:.3f} -i {shlex.quote(s['src'])}"
    for j,(ov,a,b) in enumerate(s['ov']):
        inputs+=f" -i {shlex.quote(ov)}"
        nl=f"v{j+1}"
        fc+=f";[{last}][{j+1}:v]overlay=0:0:enable='between(t,{a},{b})'[{nl}]"
        last=nl
    run(f'ffmpeg -y -loglevel error {inputs} -filter_complex "{fc}" -map "[{last}]" -t {s["dur"]:.3f} {ENC} -an {out}')
    norm.append(out)
# end card -> slow push clip
ef=int(END['dur']*FPS)
out=f"norm2/{len(SHOTS):02d}.mp4"
vf=(f"scale={int(W*1.12)}:{int(H*1.12)},zoompan=z='min(zoom+0.0006,1.10)':d={ef}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS},format=yuv420p,setsar=1")
run(f'ffmpeg -y -loglevel error -loop 1 -i {shlex.quote(END["img"])} -t {END["dur"]} -vf "{vf}" {ENC} -an {out}')
norm.append(out)

# Stage 2: xfade chain
durs=[dur(f) for f in norm]
inputs=" ".join(f"-i {f}" for f in norm)
fc=[]; prev="0:v"; cum=durs[0]
for k in range(1,len(norm)):
    off=cum-XF
    lbl="vout" if k==len(norm)-1 else f"x{k}"
    fc.append(f"[{prev}][{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}[{lbl}]")
    prev=lbl; cum=cum+durs[k]-XF
TOTAL=cum
run(f'ffmpeg -y -loglevel error {inputs} -filter_complex "{";".join(fc)}" -map "[vout]" {ENC} -an out/_v.mp4')
print(f"video {TOTAL:.2f}s")

# Stage 3: audio (VO bed + ducked music)
ai=" ".join(f"-i {shlex.quote(f)}" for f,_ in VO)
af=[]
for idx,(f,st) in enumerate(VO):
    af.append(f"[{idx}:a]adelay={int(st*1000)}|{int(st*1000)},volume=1.45[a{idx}]")
mixvo="".join(f"[a{idx}]" for idx in range(len(VO)))+f"amix=inputs={len(VO)}:normalize=0[vo]"
# music: trim to TOTAL, fade out, duck under VO
midx=len(VO)
fade=round(TOTAL-0.6,2)
music_chain=f"[{midx}:a]atrim=0:{TOTAL:.3f},asetpts=PTS-STARTPTS,volume=0.95,afade=t=out:st={fade}:d=0.6[mu]"
duck=f"[mu][vo]sidechaincompress=threshold=0.04:ratio=8:attack=15:release=300[md]"
final=f"[md][vo]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[aout]"
fc_a=";".join(af+[mixvo,music_chain,duck,final])
run(f'ffmpeg -y -loglevel error {ai} -i {shlex.quote(MUSIC)} -filter_complex "{fc_a}" -map "[aout]" -ac 2 -ar 44100 out/_a.m4a')

# Stage 4: mux
run('ffmpeg -y -loglevel error -i out/_v.mp4 -i out/_a.m4a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/lexiclash_trailer_v2.mp4')
print(f"DONE -> out/lexiclash_trailer_v2.mp4  ({TOTAL:.2f}s)")
