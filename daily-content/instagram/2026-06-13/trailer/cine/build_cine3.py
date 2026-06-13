#!/usr/bin/env python3
# v3 witty cinematic trailer: boring->switch(flash+drop)->BRIDGE reveal->arena montage->beckon CTA.
# Continuity: bridge interpolation seam + same-arena shots + continuous music + VO spine.
import os, subprocess, shlex, sys
ROOT=os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
os.makedirs("norm3",exist_ok=True); os.makedirs("out",exist_ok=True)
W,H,FPS=1080,1920,30
ENC="-c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium -r 30"
XF=0.2
MUSIC = sys.argv[1] if len(sys.argv)>1 else "music_options/A_electronic.m4a"
OUT   = sys.argv[2] if len(sys.argv)>2 else "out/lexiclash_trailer_v3.mp4"

# src, ss, dur, spd, desat, flashwhite, [(overlay,a,b)]
SHOTS=[
 ("clips/a1_boring.mp4", 0.0, 5.0, 0.82, True,  False, [("overlays/o1.png",0.5,5.0)]),
 ("clips/a2_switch.mp4", 0.0, 1.8, 1.0,  False, True,  [("overlays/o2.png",0.10,1.8)]),
 ("clips/bridge.mp4",    0.1, 4.2, 1.0,  False, False, []),
 ("clips/s2_hero.mp4",   0.3, 2.9, 1.0,  False, False, [("overlays/o6.png",0.5,2.9)]),
 ("clips/s3_rival.mp4",  0.2, 2.6, 1.0,  False, False, []),
 ("clips/s4_slam.mp4",   0.0, 2.2, 1.05, False, False, [("overlays/o3.png",0.10,2.2)]),
 ("clips/s5_leap.mp4",   0.15,2.2, 1.05, False, False, [("overlays/o4.png",0.15,2.2)]),
 ("clips/s6_triumph.mp4",0.2, 3.0, 1.0,  False, False, [("overlays/o5.png",0.3,2.7)]),
 ("clips/end_beckon.mp4",0.2, 5.0, 1.0,  False, False, [("overlays/cta.png",0.8,5.0)]),
]
# VO (file, start_seconds)
VO=[("vo/n1.wav",0.5),("vo/n2.wav",4.8),("vo/n3.wav",8.5),("vo/n4.wav",16.9),("vo/n5.wav",22.7)]

def run(c): subprocess.run(c,shell=True,check=True)
def dur(p): return float(subprocess.check_output(f'ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 {shlex.quote(p)}',shell=True).decode().strip())

# Stage 1
norm=[]
for i,(src,ss,d,spd,desat,flash,ov) in enumerate(SHOTS):
    out=f"norm3/{i:02d}.mp4"
    chain=f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setpts=PTS/{spd},fps={FPS}"
    if desat: chain+=",hue=s=0.25,eq=brightness=-0.05:contrast=1.03"
    if flash: chain+=",fade=t=in:st=0:d=0.14:color=0xFFFFFF"
    chain+=",format=yuv420p,setsar=1"
    fc=f"[0:v]{chain}[v0]"; last="v0"; inp=f"-ss {ss} -t {d*spd:.3f} -i {shlex.quote(src)}"
    for j,(o,a,b) in enumerate(ov):
        inp+=f" -i {shlex.quote(o)}"; nl=f"v{j+1}"
        fc+=f";[{last}][{j+1}:v]overlay=0:0:enable='between(t,{a},{b})'[{nl}]"; last=nl
    run(f'ffmpeg -y -loglevel error {inp} -filter_complex "{fc}" -map "[{last}]" -t {d:.3f} {ENC} -an {out}')
    norm.append(out)

# Stage 2 xfade chain
durs=[dur(f) for f in norm]
inputs=" ".join(f"-i {f}" for f in norm)
fc=[]; prev="0:v"; cum=durs[0]
for k in range(1,len(norm)):
    off=cum-XF; lbl="vout" if k==len(norm)-1 else f"x{k}"
    fc.append(f"[{prev}][{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}[{lbl}]")
    prev=lbl; cum=cum+durs[k]-XF
TOTAL=cum
run(f'ffmpeg -y -loglevel error {inputs} -filter_complex "{";".join(fc)}" -map "[vout]" {ENC} -an out/_v3.mp4')
print(f"video {TOTAL:.2f}s")

# Stage 3 audio: VO bed + continuous ducked music
ai=" ".join(f"-i {shlex.quote(f)}" for f,_ in VO)
af=[f"[{i}:a]adelay={int(st*1000)}|{int(st*1000)},volume=1.5[a{i}]" for i,(f,st) in enumerate(VO)]
mixvo="".join(f"[a{i}]" for i in range(len(VO)))+f"amix=inputs={len(VO)}:normalize=0[vo]"
midx=len(VO); fade=round(TOTAL-0.7,2)
music=f"[{midx}:a]atrim=0:{TOTAL:.3f},asetpts=PTS-STARTPTS,volume=1.0,afade=t=out:st={fade}:d=0.7[mu]"
duck=f"[mu][vo]sidechaincompress=threshold=0.05:ratio=7:attack=15:release=300[md]"
final=f"[md][vo]amix=inputs=2:normalize=0,loudnorm=I=-13:TP=-1.2:LRA=11[aout]"
run(f'ffmpeg -y -loglevel error {ai} -i {shlex.quote(MUSIC)} -filter_complex "{";".join(af+[mixvo,music,duck,final])}" -map "[aout]" -ac 2 -ar 44100 out/_a3.m4a')

# Stage 4 mux
run(f'ffmpeg -y -loglevel error -i out/_v3.mp4 -i out/_a3.m4a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart {shlex.quote(OUT)}')
print(f"DONE -> {OUT} ({TOTAL:.2f}s)")
