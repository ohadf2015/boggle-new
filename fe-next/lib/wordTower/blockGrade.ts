/**
 * Word Tower — per-altitude block grading (pure, renderer-agnostic).
 *
 * Founder: "blocks should look like building blocks … their colour should shift
 * when the player reaches a new area (in space they should look more spacy),
 * multiple gradual changes." The chain still colours each WORD by golden-angle
 * hue (so neighbours stay distinct), but every tile is then GRADED toward the
 * palette of the biome at *its own* altitude — a tower spans city→space at once,
 * so the base reads bright-and-built while the top reads dark-and-neon. The
 * grade keeps most of the word's hue (variety survives) but pulls saturation +
 * lightness firmly into the zone, which is what carries the "spacy" feel.
 */
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';
import { hexToHsl, hslToHex } from './towerColumn';

/** Surface decoration style for a tile, by zone. Built once per tile. */
export type BlockSurface = 'windows' | 'panels' | 'facets';

interface BiomeGrade {
  /** Signature hue (deg) the zone pulls colours toward. */
  hue: number;
  /** How far the word hue rotates toward `hue` (0 = keep word hue, 1 = take zone hue). */
  tint: number;
  /** Target saturation for the zone. */
  sat: number;
  /** Target lightness for the zone (drops with altitude → space goes dim). */
  light: number;
  /** How strongly saturation/lightness snap to the zone targets (0..1). */
  mix: number;
}

// Tuned for clear zone identity: bright/airy city → dim/neon deep space, with a
// continuous darkening of `light` and a rising `mix` so each new area is felt.
const GRADE: Record<WordTowerBiomeId, BiomeGrade> = {
  city: { hue: 95, tint: 0.16, sat: 0.78, light: 0.57, mix: 0.45 },
  sky: { hue: 196, tint: 0.3, sat: 0.74, light: 0.55, mix: 0.55 },
  stratosphere: { hue: 282, tint: 0.34, sat: 0.74, light: 0.5, mix: 0.6 },
  orbit: { hue: 190, tint: 0.4, sat: 0.85, light: 0.43, mix: 0.66 },
  nebula: { hue: 322, tint: 0.46, sat: 0.9, light: 0.4, mix: 0.7 },
  galaxy: { hue: 270, tint: 0.5, sat: 0.92, light: 0.41, mix: 0.76 },
};

/** Grade a word's base colour into the look of a given altitude zone. */
export function gradeBlockColor(base: number, biome: WordTowerBiomeId): number {
  const g = GRADE[biome];
  const { h, s, l } = hexToHsl(base);
  // Rotate the word hue toward the zone signature along the shorter arc.
  let dh = g.hue - h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  const hue = h + dh * g.tint;
  const sat = s + (g.sat - s) * g.mix;
  const light = l + (g.light - l) * g.mix;
  return hslToHex(hue, sat, light);
}

/** Decoration style for a zone: built skyline windows low, hull panels mid,
 *  crystalline facets in deep space. */
export function blockSurface(biome: WordTowerBiomeId): BlockSurface {
  if (biome === 'city' || biome === 'sky') return 'windows';
  if (biome === 'stratosphere' || biome === 'orbit') return 'panels';
  return 'facets';
}
