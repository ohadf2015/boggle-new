import { WORD_TOWER_BIOMES, type WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/**
 * Physical tower height -> the altitude the backdrop pretends you are at.
 *
 * v1's biome table (city 0 / sky 50 / stratosphere 150 / orbit 300 ...) was
 * tuned for a game where one word was worth several metres. A v2 block is ~1m of
 * real physics, so a strong run tops out around 30-50m — ported literally, every
 * run would stay in `city` and the whole parallax journey would never be seen.
 *
 * One multiplier keeps all of v1's altitude-anchored art (props, sightings,
 * milestones) usable unmodified: it all reads this number.
 */
export const VISUAL_ALT_PER_M = 10;

export function visualAltitudeM(heightM: number): number {
  return Math.max(0, heightM) * VISUAL_ALT_PER_M;
}

export function biomeAtHeight(heightM: number): WordTowerBiomeId {
  const alt = visualAltitudeM(heightM);
  let id: WordTowerBiomeId = WORD_TOWER_BIOMES[0].id;
  for (const biome of WORD_TOWER_BIOMES) if (alt >= biome.minM) id = biome.id;
  return id;
}
