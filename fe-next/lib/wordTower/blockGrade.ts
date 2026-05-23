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
import { hexToHsl, hslToHex } from './towerColumn';

/** Surface decoration style for a tile, by zone. Built once per tile. */
export type BlockSurface = 'windows' | 'glass' | 'panels' | 'greebles' | 'facets' | 'energy';

interface BiomeGrade {
  /** Material colour the zone pulls every tile toward (packed RGB). */
  anchor: number;
  /** How far the word hue rotates toward the material hue (≈1 → take it whole). */
  tint: number;
  /** How strongly saturation/lightness snap to the material (0..1). */
  mix: number;
}

// Mature building-material anchors (NOT the old vibrant per-word palette). Each is
// a desaturated, real-material tone; `tint`/`mix` are high so a tile reads as that
// material with only a whisper of word-hue variance left over.
const GRADE: Record<WordTowerBiomeId, BiomeGrade> = {
  city: { anchor: 0x7c8a99, tint: 0.96, mix: 0.9 }, // weathered concrete / steel
  sky: { anchor: 0x5d7d9c, tint: 0.96, mix: 0.9 }, // steel-glass curtain wall (a shade below the city → clean light→dark climb)
  stratosphere: { anchor: 0x6e6a7c, tint: 0.96, mix: 0.9 }, // titanium dusk
  orbit: { anchor: 0x39505a, tint: 0.96, mix: 0.9 }, // gunmetal teal hull
  nebula: { anchor: 0x5a3146, tint: 0.96, mix: 0.9 }, // dark alloy magenta
  galaxy: { anchor: 0x1b1428, tint: 0.96, mix: 0.9 }, // obsidian + neon edge
};

/** Grade a word's base colour into the building material of a given altitude zone. */
export function gradeBlockColor(base: number, biome: WordTowerBiomeId): number {
  const g = GRADE[biome];
  const target = hexToHsl(g.anchor);
  const { h, s, l } = hexToHsl(base);
  // Rotate the word hue toward the material hue along the shorter arc.
  let dh = target.h - h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const hue = h + dh * g.tint;
  const sat = s + (target.s - s) * g.mix;
  const light = l + (target.l - l) * g.mix;
  return hslToHex(hue, sat, light);
}

/** The zone's raw building-material colour (packed RGB) — the anchor every tile
 *  in that zone is graded toward. Lets the minimap render the same materials. */
export function blockMaterial(biome: WordTowerBiomeId): number {
  return GRADE[biome].anchor;
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
