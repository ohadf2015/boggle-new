# Word Tower — biome-native props v1

Generated ambient creatures that give each biome its OWN identity (beyond the CSS
sky gradient). Proof-of-direction batch.

## Shipped
- **wt-nebula-jelly.png** — sleek bioluminescent cosmic jellyfish (NO kawaii face, per feedback) for the **Nebula** band (500–800m). v1 raw `nebula-jelly-raw.png` was the cute first pass; `nebula-jelly-v2-raw.png` is the shipped sleeker take.
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

## Full set shipped
All 6 biomes now have a sleek native creature wired into `parallaxProps.ts`:
- city `wt-city-bird` (38m, faceted lime/cyan origami crane)
- sky `wt-sky-manta` (90m, cyan manta ray)
- stratosphere `wt-strat-serpent` (235m, purple/amber sky-serpent)
- orbit `wt-orbit-jelly` (430m, chrome ice-cyan crystal jelly)
- nebula `wt-nebula-jelly` (580m, bioluminescent jellyfish)
- galaxy `wt-galaxy-whale` (1050m, gold/purple cosmic star-whale)
