# Word Tower — mature per-zone blocks + richer, never-blank climb

**Date:** 2026-05-23 · **Status:** spec → implement (autonomous, commit per phase)

## Founder ask (verbatim)
> "the scrolling down the tower still have these blank bg, we need more interesting
> milestones and elements on the way. in addition the building blocks shouldnt be
> colorful but each milestone should be different color (more related to building
> colors not childish) and different structure - in space it should be more spacy etc"

## Interpretation
Two threads:

1. **Blocks**: stop the golden-angle rainbow. Each *zone* (= biome) gets ONE mature
   **building-material** colour (concrete → glass → titanium → gunmetal → alloy →
   obsidian), and a **distinct surface structure** per zone — space reads "spacy".
   - "milestone" is read as **biome/zone** (the 6 visual zones in `WORD_TOWER_BIOMES`:
     city 0m, sky 50m, stratosphere 150m, orbit 300m, nebula 500m, galaxy 800m).
     The celebration `milestones.ts` path (`milestoneCrossed`) is a SEPARATE system and
     is left untouched.

2. **Climb never blank**: scrolling down reveals empty sky because the two densest
   altitude layers — `WordTowerLandmarkRail` + `WordTowerRivalRail` — are siblings of
   `WordTowerScene` fed the frozen live `game.heightM`, while only the scene's own
   sparse, big-gap parallax props track the panned `viewAlt`. Reconnect them to the
   viewed altitude, and add more reference points so one is always near.

## Changes

### Phase 1 — Mature, zone-dominant block palette (pure, TDD)
`lib/wordTower/blockGrade.ts`
- Re-key `GRADE` to a per-biome **material anchor** (hex) + strong `tint`/`mix` so the
  zone material dominates and the per-word hue collapses to negligible variance
  (per-tile texture still comes from `tileVariation` + the isometric bevel).
- Anchors (read as building, not childish):
  - city `#7c8a99` weathered concrete · sky `#7d9bb8` pale steel-glass ·
    stratosphere `#6e6a7c` titanium dusk · orbit `#39505a` gunmetal teal ·
    nebula `#5a3146` dark alloy magenta · galaxy `#1b1428` obsidian.
- Invariant test: `gradeBlockColor(0xff0000,'orbit')` ≈ `gradeBlockColor(0x00ff00,'orbit')`
  (same material regardless of word hue) — channel distance below a small threshold.

### Phase 2 — Distinct structure per zone (TDD pure map + Pixi draw)
`lib/wordTower/blockGrade.ts` + `components/wordTower/towerSprites.ts`
- Expand `BlockSurface` 3 → 6: `windows | glass | panels | greebles | facets | energy`.
- `blockSurface(biome)`: city→windows, sky→glass, stratosphere→panels, orbit→greebles,
  nebula→facets, galaxy→energy.
- Add `glass` (thin vertical mullions + single glint), `greebles` (sci-fi ports + a
  circuit trace), `energy` (scattered hard-pixel stars + a diagonal seam) to
  `drawBlockSurface`. Neo-brutalist: **no blur, hard pixels, alpha-stamped**.
- Existing tiles keep their built-once `detail` (acceptable; only new tiles get new
  surfaces — mid-game biome crossings briefly mix, no redraw pass added).

### Phase 3 — Climb follows the viewed altitude + denser references (TDD)
`components/wordTower/WordTowerScene.tsx` → `WordTowerPlay.tsx`
- `WordTowerScene` gains `onViewAltChange?(alt: number)`; fires it from the same rAF
  that updates `panAltitude` (and on `scrollToTop` / reset).
- `WordTowerPlay` caches `viewAlt` in state and passes it to BOTH
  `WordTowerLandmarkRail` and `WordTowerRivalRail` (replacing `game.heightM`).
- `lib/wordTower/landmarks.ts`: add intermediate reference points so the gaps between
  marks shrink (always one near on the way up).

## Out of scope
Celebration milestones, prop art, animated webp, tile surface live-redraw on crossing.

## Test plan
- `blockGrade.test.ts`: zone-dominant invariant + per-zone desaturation + monotone
  light→dark materials + each biome → expected surface.
- `landmarks.test.ts`: new marks ordered + unique ids + no >300m gap below 1200m.
- Rail viewAlt wiring: scene-level prop-drill (callback fires, rails receive viewAlt).
- `npm run lint` + targeted vitest + `tsc --noEmit` (full `next build` OOMs).

## Notes / deliberate decisions (for founder live-verify)
- **TDD-strict exception (rule 22)**: Phase 3 callback glue (`onViewAltChange`) has no
  unit test — the Pixi scene that owns the pan gesture can't run headless. Verified by
  `tsc` (typed prop) + the pure `viewAltitudeFor` tests + founder live-verify, matching
  the established Word-Tower "math-verify + founder live" pattern.
- **`WordTowerVersus` not wired**: it mounts no landmark/rival rails, so the
  sibling-desync bug doesn't exist there — `onViewAltChange` is intentionally omitted.
- **`tile.detail` built once**: existing tiles keep their surface; mid-game biome
  crossings briefly mix old/new surfaces. A fresh session renders correctly. No
  redraw pass added.
- **i18n**: 4 new landmark keys × 5 locales — HE/SV/JA/ES are machine-drafted and need
  native review (esp. HE `stormTops`/`earthCurve` length, JA `meteorBelt` 流星帯).
