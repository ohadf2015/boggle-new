/**
 * Word Tower — next-zone "tease" (pure, renderer-agnostic).
 *
 * Near-miss anticipation: in the last stretch before a new biome, surface a quiet
 * "Next: Aurora · 18m" chip so the climber pushes for the threshold (the zone-entry
 * banner then pays it off). Anticipation, not celebration — the UI keeps it small.
 */
import { WORD_TOWER_BIOMES, type WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/** How close (m) to the next threshold the tease appears. */
export const ZONE_TEASE_WINDOW_M = 30;

export interface ZoneTease {
  nextBiomeId: WordTowerBiomeId;
  /** Metres still to climb to reach the next zone. */
  metersToNext: number;
}

/**
 * The upcoming zone + distance, but only within {@link ZONE_TEASE_WINDOW_M} of its
 * threshold. `null` mid-zone (next is far) and at the top (galaxy has no next).
 * `WORD_TOWER_BIOMES` is ascending by `minM`, so the first threshold above the
 * current height is the next zone.
 */
export function zoneTeaseAt(heightM: number): ZoneTease | null {
  for (const b of WORD_TOWER_BIOMES) {
    if (b.minM > heightM) {
      const metersToNext = b.minM - heightM;
      return metersToNext <= ZONE_TEASE_WINDOW_M ? { nextBiomeId: b.id, metersToNext } : null;
    }
  }
  return null; // already in the top biome
}
