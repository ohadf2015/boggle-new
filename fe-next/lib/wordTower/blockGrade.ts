/**
 * Word Tower — per-altitude block grading (pure, renderer-agnostic).
 *
 * Founder: "the building blocks shouldn't be colourful but each milestone should
 * be a different colour (more related to building colours, not childish) and a
 * different structure — in space it should be more spacy." So a tile is graded to
 * the ONE building material of the zone at *its own* altitude: weathered concrete
 * at the city, steel-glass in the sky, titanium dusk in the stratosphere, gunmetal
 * in orbit, dark alloy in the nebula, obsidian in the galaxy. The chain's golden-
 * angle word hue is suppressed almost entirely (it survives only as faint material
 * variance) — the zone material dominates, which is what kills the candy look and
 * sells "I climbed into a new place". A tower spans city→space at once, so the base
 * reads bright-and-built while the top reads dark-and-spacy.
 */
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/** Surface decoration style for a tile, by zone. Built once per tile. */
export type BlockSurface = 'windows' | 'glass' | 'panels' | 'greebles' | 'facets' | 'energy';

// ONE mature building-material colour per zone (founder: "stick to one colour for
// each surface"). The word's chain hue is ignored entirely — every tile in a zone
// is the identical flat material, so a zone never reads as "colourful". Per-tile
// life comes only from the isometric bevel + the faint monochrome tone jitter in
// the renderer (same hue, ±brightness), not from colour variety. Climb darkens
// monotonically: bright concrete city → obsidian deep space.
/** A full per-zone building-material palette. A tower SKIN is exactly this — an
 *  alternate set of six mature materials (see {@link file://./skins.ts}). */
export type ZoneMaterialPalette = Record<WordTowerBiomeId, number>;

/** The default ("classic") materials. Exported so the skin system can reuse it
 *  as the baseline and so callers can pass an alternate palette without drift. */
export const ZONE_MATERIAL: ZoneMaterialPalette = {
  city: 0x7c8a99, // weathered concrete / steel
  sky: 0x5d7d9c, // steel-glass curtain wall (a shade below the city → clean light→dark climb)
  stratosphere: 0x6e6a7c, // titanium dusk
  orbit: 0x39505a, // gunmetal teal hull
  nebula: 0x5a3146, // dark alloy magenta
  galaxy: 0x1b1428, // obsidian + neon edge
};

/** The single building-material colour of an altitude zone (packed RGB). `base`
 *  (the chain word colour) is intentionally ignored — one colour per surface. An
 *  optional `palette` (a tower skin) swaps the whole material set. */
export function gradeBlockColor(_base: number, biome: WordTowerBiomeId, palette: ZoneMaterialPalette = ZONE_MATERIAL): number {
  return palette[biome] ?? ZONE_MATERIAL[biome];
}

/** The zone's building-material colour — same value the tiles use. Lets the
 *  minimap render the identical materials. Honours the active skin `palette`. */
export function blockMaterial(biome: WordTowerBiomeId, palette: ZoneMaterialPalette = ZONE_MATERIAL): number {
  return palette[biome] ?? ZONE_MATERIAL[biome];
}

/**
 * Structure for a zone — a distinct built look per altitude so each milestone reads
 * as its own place: lit window grid in the city, a glass curtain wall in the sky,
 * riveted hull panels in the stratosphere, sci-fi greebles in orbit, crystalline
 * facets in the nebula, and a star-field energy skin in the deep-space galaxy.
 */
export function blockSurface(biome: WordTowerBiomeId): BlockSurface {
  switch (biome) {
    case 'city': return 'windows';
    case 'sky': return 'glass';
    case 'stratosphere': return 'panels';
    case 'orbit': return 'greebles';
    case 'nebula': return 'facets';
    case 'galaxy': return 'energy';
  }
}
