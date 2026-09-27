# K-Pop player style — asset provenance (v1, 2026-06-21)

Source assets for the **k_pop** player music style (the cube mascot as a K-pop idol).
Shipped assets live in `fe-next/public/mascots/styles/k_pop.{png,webp}` and the music
in `fe-next/public/music/styles/k_pop.mp3` (track supplied by the user).

## Pipeline (how to regenerate / make another style)

1. **Master image** — Higgsfield Nano Banana 2, anchored on an existing style PNG
   so the character stays identical, with *subtractive* prompting (explicitly
   REMOVE the reference's costume, or it keeps it):
   ```
   higgsfield generate create nano_banana_2 \
     --image fe-next/public/mascots/styles/japanese.png --aspect_ratio 1:1 \
     --prompt "<keep character; REMOVE kimono/fan/petals; redress as K-pop idol…>" --wait
   ```
   → `kpop_master_2048.png`. Downscaled to 512×512 → `k_pop.png` (the picker/badge
   cover; keeps the navy radial-glow background like every other static style PNG).

2. **Dance loop video** — Seedance 2.0, start==end frame for a seamless loop:
   ```
   higgsfield generate create seedance_2_0 \
     --start-image kpop_master_2048.png --end-image kpop_master_2048.png \
     --duration 5 --aspect_ratio 1:1 --prompt "<idol dance, locked camera, loop>" --wait
   ```
   → `kpop_dance_source.mp4` (960×960, 24fps, 5s).

3. **Transparent animated WebP** — frames → matte → assemble:
   ```
   ffmpeg -i kpop_dance_source.mp4 -vf "fps=12,scale=512:512:flags=lanczos" kpf/f_%03d.png
   rembg p -m birefnet-general kpf kpf_out      # birefnet drops the disco-ball/glow
   img2webp -loop 0 -lossy -q 72 -m 6 -d 83 kpf_out/f_*.png -o k_pop.webp
   ```
   **Use `birefnet-general`, not the default `u2net`** — u2net kept the bright disco
   ball + radial glow as a grey ghost halo; birefnet cuts the sticker cleanly.

## Wiring (code)
- Registered in `lib/playerStyle/styles.ts` (accent `#b14bff`, 🎤), `animatedMascots.ts`,
  `styleDance.ts` (`hero-dance-kpop` keyframe in `app/globals.css`), i18n ×5.
- The same dancing WebP loops now also play on loading surfaces via
  `components/ui/DancingMascot.tsx` + `lib/playerStyle/danceLoops.ts`.
