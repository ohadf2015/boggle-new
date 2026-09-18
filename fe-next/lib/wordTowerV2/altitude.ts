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
 *
 * Tuned to OBSERVED runs, not guessed: at x10 real runs (6-10m) never left the
 * sky and 4 of 6 biomes were dead art. At x26 a ~6-block run reaches the
 * stratosphere and a great 30-block run the galaxy — a new sky every ~5 blocks.
 * ponytail: linear; the ceiling is parallax speed (v1 scrolls 5.2px per visual
 * m), so a bigger multiplier needs v1's scroll rate scaled down with it.
 */
export const VISUAL_ALT_PER_M = 26;

export function visualAltitudeM(heightM: number): number {
  return Math.max(0, heightM) * VISUAL_ALT_PER_M;
}

export function biomeAtHeight(heightM: number): WordTowerBiomeId {
  const alt = visualAltitudeM(heightM);
  let id: WordTowerBiomeId = WORD_TOWER_BIOMES[0].id;
  for (const biome of WORD_TOWER_BIOMES) if (alt >= biome.minM) id = biome.id;
  return id;
}
