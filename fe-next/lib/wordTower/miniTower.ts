/**
 * Word Tower — minimap geometry (pure, renderer-agnostic).
 *
 * Founder: "the tower minimap should actually show a mini tower with an
 * indication of the current height." This maps altitudes onto a 0..1 vertical
 * scale and splits that scale into the biome bands, so the minimap can draw a
 * stacked mini-tower (zone-coloured) with a marker at the climber's height.
 */
import { WORD_TOWER_BIOMES, type WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/** Top of the mini scale (m): headroom above the climber + their best, with a
 *  floor so a 5 m tower doesn't render as a single sliver. */
export function miniTowerScaleMax(heightM: number, personalBestM = 0): number {
  const peak = Math.max(heightM, personalBestM);
  return Math.max(120, peak * 1.15);
}

/** Climb height (m) at which the minimap starts earning its screen space.
 *  Below this the whole rail is one flat `city` band with the marker parked at
 *  the bottom — a grey stripe down the side of the play field that says nothing
 *  the altitude readout doesn't already say, and there is nothing to pan to. */
export const MINI_TOWER_REVEAL_M = 30;

/** Whether the minimap is worth drawing yet. */
export function shouldShowMiniTower(heightM: number, personalBestM = 0): boolean {
  return Math.max(heightM, personalBestM) >= MINI_TOWER_REVEAL_M;
}

/** Fraction (0..1) of the scale an altitude sits at (0 = base, 1 = top). */
export function altToFraction(m: number, scaleMax: number): number {
  if (scaleMax <= 0) return 0;
  return Math.min(1, Math.max(0, m / scaleMax));
}

export interface MiniZone {
  id: WordTowerBiomeId;
  fromFrac: number;
  toFrac: number;
}

/** Biome bands across the mini scale, bottom→top, clamped to [0,1]. Zones whose
 *  floor is above the visible scale are dropped; the top visible zone reaches 1. */
export function miniTowerZones(scaleMax: number): MiniZone[] {
  const out: MiniZone[] = [];
  for (let i = 0; i < WORD_TOWER_BIOMES.length; i++) {
    const from = WORD_TOWER_BIOMES[i].minM;
    if (from >= scaleMax && i > 0) break; // beyond the visible scale
    const nextMin = i + 1 < WORD_TOWER_BIOMES.length ? WORD_TOWER_BIOMES[i + 1].minM : scaleMax;
    const to = Math.min(nextMin, scaleMax);
    out.push({ id: WORD_TOWER_BIOMES[i].id, fromFrac: altToFraction(from, scaleMax), toFrac: altToFraction(to, scaleMax) });
    if (nextMin >= scaleMax) break; // this zone already fills the rest of the scale
  }
  return out;
}
