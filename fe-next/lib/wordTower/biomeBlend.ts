import { WORD_TOWER_BIOMES, type WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

/**
 * Word Tower — continuous biome blend (pure).
 *
 * The six biomes change the sky in discrete jumps at fixed altitude thresholds,
 * so the colour only shifts once every ~50–300 m (founder: "the bg color should
 * change more frequently"). This resolves an altitude into the current biome,
 * the next biome up, and a 0→1 progress `t` through the band between them — so
 * the renderer can cross-fade the two gradients and the sky shifts continuously
 * as you climb instead of snapping at a handful of thresholds.
 *
 * At/above the top biome there is no "next", so `to === from` and `t = 0`.
 */
export interface BiomeBlend {
  fromId: WordTowerBiomeId;
  toId: WordTowerBiomeId;
  /** Progress through the band [fromId.minM, toId.minM], clamped 0..1. */
  t: number;
}

export function biomeBlendAt(heightM: number): BiomeBlend {
  let i = 0;
  for (let k = 0; k < WORD_TOWER_BIOMES.length; k++) {
    if (heightM >= WORD_TOWER_BIOMES[k].minM) i = k;
  }
  const from = WORD_TOWER_BIOMES[i];
  const next = WORD_TOWER_BIOMES[i + 1];
  if (!next) return { fromId: from.id, toId: from.id, t: 0 };
  const span = next.minM - from.minM;
  const t = span > 0 ? Math.max(0, Math.min(1, (heightM - from.minM) / span)) : 0;
  return { fromId: from.id, toId: next.id, t };
}
