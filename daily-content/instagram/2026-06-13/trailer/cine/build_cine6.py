#!/usr/bin/env python3
# v6: v5 + Minions-style gag button + color-grade polish + fixed (source-clamped) durations.
import os, subprocess, shlex, sys
ROOT=os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
os.makedirs("norm6",exist_ok=True); os.makedirs("out",exist_ok=True)
W,H,FPS=1080,1920,30; ENC="-c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium -r 30"; XF=0.2
MUSIC = sys.argv[1] if len(sys.argv)>1 else "gamemusic/combined_styles3.m4a"
OUT   = sys.argv[2] if len(sys.argv)>2 else "out/lexiclash_trailer_v6.mp4"
GRADE = "eq=contrast=1.05:saturation=1.10:gamma=0.98,vignette=PI/4.6,unsharp=5:5:0.4:5:5:0.0"

# src, ss, dur, spd, desat, flash, [(overlay,a,b)]
SHOTS=[
 ("clips/a1_boring.mp4", 0.0, 6.0, 0.62, True,  False, [("overlays/cap1.png",0.6,3.6),("overlays/cap2.png",3.9,6.0)]),
 ("clips/a2_switch.mp4", 0.0, 1.8, 1.0,  False, True,  []),
 ("clips/bridge.mp4",    0.1, 3.4, 1.0,  False, False, [("overlays/cap3.png",0.8,3.3)]),
 ("clips/s2_hero.mp4",   0.3, 2.2, 1.0,  False, False, []),
 ("clips/board.mp4",     0.1, 3.7, 1.0,  False, False, [("overlays/cap4.png",0.3,3.7)]),
 ("clips/s3_rival.mp4",  0.2, 2.2, 1.0,  False, False, []),
 ("clips/cry.mp4",       0.1, 2.4, 1.0,  False, False, []),
 ("clips/dance.mp4",     0.1, 2.7, 1.0,  False, False, [("overlays/cap5.png",0.2,2.7)]),
 ("clips/s6_triumph.mp4",0.2, 2.2, 1.0,  False, False, []),
 ("clips/end_beckon.mp4",0.1, 3.8, 1.0,  False, False, [("overlays/cta_ov.png",0.7,3.8)]),
 ("clips/gag.mp4",       0.1, 2.8, 1.0,  False, False, []),
]
VO=[("vo/g1.wav",0.4,1.06),("vo/g3.wav",6.4,1.06),("vo/g4.wav",12.8,1.10),("vo/g6.wav",22.6,1.06)]
GAG_SFX=("vo/gag_sfx.wav", None)  # start set to gag start at runtime

def run(c): subprocess.run(c,shell=True,check=True)
def dur(p): return float(subprocess.check_output(f'ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 {shlex.quote(p)}',shell=True).decode().strip())

norm=[]
for i,(src,ss,d,spd,desat,flash,ovs) in enumerate(SHOTS):
    out=f"norm6/{i:02d}.mp4"
    chain=f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setpts=PTS/{spd},fps={FPS}"
    if desat: chain+=",hue=s=0.22,eq=brightness=-0.05:contrast=1.03"
    if flash: chain+=",fade=t=in:st=0:d=0.16:color=0xFFFFFF"
    chain+=",format=yuv420p,setsar=1"
    fc=f"[0:v]{chain}[v0]"; last="v0"; inp=f"-ss {ss} -t {d*spd:.3f} -i {shlex.quote(src)}"
    for j,(ov,a,b) in enumerate(ovs):
        inp+=f" -i {shlex.quote(ov)}"; nl=f"v{j+1}"
        fc+=f";[{last}][{j+1}:v]overlay=0:0:enable='between(t,{a},{b})'[{nl}]"; last=nl
    run(f'ffmpeg -y -loglevel error {inp} -filter_complex "{fc}" -map "[{last}]" -t {d:.3f} {ENC} -an {out}')
    norm.append(out)

durs=[dur(f) for f in norm]; inputs=" ".join(f"-i {f}" for f in norm)
# gag starts at cumulative start of last shot
starts=[0.0]
for k in range(1,len(durs)): starts.append(starts[-1]+durs[k-1]-XF)
GAG_START=starts[-1]
fc=[]; prev="0:v"; cum=durs[0]
for k in range(1,len(norm)):
    off=cum-XF; lbl=f"x{k}"
    fc.append(f"[{prev}][{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}[{lbl}]"); prev=lbl; cum=cum+durs[k]-XF
TOTAL=cum
# grade on final
fc.append(f"[{prev}]{GRADE}[vout]")
run(f'ffmpeg -y -loglevel error {inputs} -filter_complex "{";".join(fc)}" -map "[vout]" {ENC} -an out/_v6.mp4')
print(f"video {TOTAL:.2f}s  gag@{GAG_START:.2f}")

ai=" ".join(f"-i {shlex.quote(f)}" for f,_,_ in VO)+f" -i {shlex.quote(GAG_SFX[0])}"
af=[f"[{i}:a]atempo={t},adelay={int(st*1000)}|{int(st*1000)},volume=1.55[a{i}]" for i,(f,st,t) in enumerate(VO)]
sfx_i=len(VO)
af.append(f"[{sfx_i}:a]adelay={int((GAG_START+0.3)*1000)}|{int((GAG_START+0.3)*1000)},volume=1.2[sfx]")
mixvo="".join(f"[a{i}]" for i in range(len(VO)))+"[sfx]"+f"amix=inputs={len(VO)+1}:normalize=0[vo]"
midx=len(VO)+1; fade=round(TOTAL-0.8,2)
music=f"[{midx}:a]atrim=0:{TOTAL:.3f},asetpts=PTS-STARTPTS,volume=0.5,afade=t=in:st=0:d=0.3,afade=t=out:st={fade}:d=0.8[mu]"
final=f"[mu][vo]amix=inputs=2:normalize=0,alimiter=limit=0.97,loudnorm=I=-13:TP=-1.2:LRA=11[aout]"
run(f'ffmpeg -y -loglevel error {ai} -i {shlex.quote(MUSIC)} -filter_complex "{";".join(af+[mixvo,music,final])}" -map "[aout]" -ac 2 -ar 44100 out/_a6.m4a')
run(f'ffmpeg -y -loglevel error -i out/_v6.mp4 -i out/_a6.m4a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart {shlex.quote(OUT)}')
print(f"DONE -> {OUT} ({TOTAL:.2f}s)")
