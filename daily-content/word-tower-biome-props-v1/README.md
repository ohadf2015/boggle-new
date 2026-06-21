# Word Tower — biome-native props v1

Generated ambient creatures that give each biome its OWN identity (beyond the CSS
sky gradient). Proof-of-direction batch.

## Shipped
- **wt-nebula-jelly.png** — kawaii cosmic jellyfish for the **Nebula** band (500–800m).
  Wired into `lib/wordTower/parallaxProps.ts` at `atM: 580` and copied to
  `fe-next/public/images/word-tower/wt-nebula-jelly.png`.

## Pipeline
1. `higgsfield generate create nano_banana_2` — quirky kawaii cosmic nebula jellyfish,
   neon magenta/purple/cyan, flat-cartoon bold outlines, isolated on flat chroma-green
   `#00ff00` for keying (matches the existing `wt-*` flat-cartoon prop style + the
   Nebula palette pink/purple/cyan).
2. Chroma-key + de-spill in PIL (NOT rembg — rembg's subject-segmentation left green
   trapped in the concave gaps between tentacles; a colour-distance key removes it
   cleanly). Cropped to content, resized to 512px long edge.
3. `nebula-jelly-raw.png` = the raw 2048² generation (kept for re-keying).

## Next (per-biome, follow-up)
City / Sky / Stratosphere / Orbit / Galaxy each want one native creature on the same
pipeline so every band reads as a distinct world.
