#!/usr/bin/env python3
# v5: boring->switch->bridge->GAME board-battle->comedy(cry/dance)->beckon+CTA-on-video.
# Fixes: continuous VO, stable section-normalized music (no ducking), CTA overlaid on final footage.
import os, subprocess, shlex, sys
ROOT=os.path.dirname(os.path.abspath(__file__)); os.chdir(ROOT)
os.makedirs("norm5",exist_ok=True); os.makedirs("out",exist_ok=True)
W,H,FPS=1080,1920,30; ENC="-c:v libx264 -pix_fmt yuv420p -profile:v high -preset medium -r 30"; XF=0.2
MUSIC = sys.argv[1] if len(sys.argv)>1 else "gamemusic/combined_styles3.m4a"
OUT   = sys.argv[2] if len(sys.argv)>2 else "out/lexiclash_trailer_v5.mp4"
SCRIM = "drawbox=x=0:y=1300:w=1080:h=215:color=black@0.42:t=fill"

# src, ss, dur, spd, desat, flash, [(overlay, a, b, scrim)]
SHOTS=[
 ("clips/a1_boring.mp4", 0.0, 7.5, 0.62, True,  False, [("overlays/cap1.png",0.6,4.2,True),("overlays/cap2.png",4.5,7.5,True)]),
 ("clips/a2_switch.mp4", 0.0, 1.8, 1.0,  False, True,  []),
 ("clips/bridge.mp4",    0.1, 3.4, 1.0,  False, False, [("overlays/cap3.png",0.8,3.3,True)]),
 ("clips/s2_hero.mp4",   0.3, 2.2, 1.0,  False, False, []),
 ("clips/board.mp4",     0.2, 4.2, 1.0,  False, False, [("overlays/cap4.png",0.4,4.2,True)]),
 ("clips/s3_rival.mp4",  0.2, 2.2, 1.0,  False, False, []),
 ("clips/cry.mp4",       0.1, 2.4, 1.0,  False, False, []),
 ("clips/dance.mp4",     0.1, 2.8, 1.0,  False, False, [("overlays/cap5.png",0.3,2.8,True)]),
 ("clips/s6_triumph.mp4",0.2, 2.2, 1.0,  False, False, []),
 ("clips/end_beckon.mp4",0.2, 6.3, 1.0,  False, False, [("overlays/cta_ov.png",1.0,6.3,False)]),
]
# VO (file, start, atempo) — continuous, g2 dropped (redundant; its caption stays)
VO=[("vo/g1.wav",0.4,1.06),("vo/g3.wav",6.3,1.06),("vo/g4.wav",12.7,1.08),("vo/g5.wav",22.7,1.06),("vo/g6.wav",27.3,1.06)]

def run(c): subprocess.run(c,shell=True,check=True)
def dur(p): return float(subprocess.check_output(f'ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 {shlex.quote(p)}',shell=True).decode().strip())

norm=[]
for i,(src,ss,d,spd,desat,flash,ovs) in enumerate(SHOTS):
    out=f"norm5/{i:02d}.mp4"
    chain=f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setpts=PTS/{spd},fps={FPS}"
    if desat: chain+=",hue=s=0.22,eq=brightness=-0.05:contrast=1.03"
    if flash: chain+=",fade=t=in:st=0:d=0.16:color=0xFFFFFF"
    chain+=",format=yuv420p,setsar=1"
    fc=f"[0:v]{chain}[v0]"; last="v0"; inp=f"-ss {ss} -t {d*spd:.3f} -i {shlex.quote(src)}"
    for j,(ov,a,b,scrim) in enumerate(ovs):
        inp+=f" -i {shlex.quote(ov)}"; nl=f"v{j+1}"
        if False:  # scrim disabled per user — clean bottom subs, no black band
            s1=f"s{j}"; fc+=f";[{last}]{SCRIM}:enable='between(t,{a},{b})'[{s1}]"; src_lbl=s1
        else:
            src_lbl=last
        fc+=f";[{src_lbl}][{j+1}:v]overlay=0:0:enable='between(t,{a},{b})'[{nl}]"; last=nl
    run(f'ffmpeg -y -loglevel error {inp} -filter_complex "{fc}" -map "[{last}]" -t {d:.3f} {ENC} -an {out}')
    norm.append(out)

durs=[dur(f) for f in norm]; inputs=" ".join(f"-i {f}" for f in norm)
fc=[]; prev="0:v"; cum=durs[0]
for k in range(1,len(norm)):
    off=cum-XF; lbl="vout" if k==len(norm)-1 else f"x{k}"
    fc.append(f"[{prev}][{k}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}[{lbl}]"); prev=lbl; cum=cum+durs[k]-XF
TOTAL=cum
run(f'ffmpeg -y -loglevel error {inputs} -filter_complex "{";".join(fc)}" -map "[vout]" {ENC} -an out/_v5.mp4')
print(f"video {TOTAL:.2f}s")

# audio: continuous VO + STABLE constant music (no sidechain ducking)
ai=" ".join(f"-i {shlex.quote(f)}" for f,_,_ in VO)
af=[f"[{i}:a]atempo={t},adelay={int(st*1000)}|{int(st*1000)},volume=1.55[a{i}]" for i,(f,st,t) in enumerate(VO)]
mixvo="".join(f"[a{i}]" for i in range(len(VO)))+f"amix=inputs={len(VO)}:normalize=0[vo]"
midx=len(VO); fade=round(TOTAL-0.8,2)
music=f"[{midx}:a]atrim=0:{TOTAL:.3f},asetpts=PTS-STARTPTS,volume=0.5,afade=t=in:st=0:d=0.3,afade=t=out:st={fade}:d=0.8[mu]"
final=f"[mu][vo]amix=inputs=2:normalize=0,alimiter=limit=0.97,loudnorm=I=-13:TP=-1.2:LRA=11[aout]"
run(f'ffmpeg -y -loglevel error {ai} -i {shlex.quote(MUSIC)} -filter_complex "{";".join(af+[mixvo,music,final])}" -map "[aout]" -ac 2 -ar 44100 out/_a5.m4a')
run(f'ffmpeg -y -loglevel error -i out/_v5.mp4 -i out/_a5.m4a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart {shlex.quote(OUT)}')
print(f"DONE -> {OUT} ({TOTAL:.2f}s)")
