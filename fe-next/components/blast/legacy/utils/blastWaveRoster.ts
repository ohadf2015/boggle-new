/**
 * Featured-specials roster — each wave spawns the 4 CORE specials the player
 * learned in waves 1-2 plus AT MOST 2 "featured" specials. Uniqueness per wave
 * comes from WHICH specials are featured, while the number of concurrent tile
 * kinds the player must remember goes DOWN, not up.
 *
 * Applied inside getWaveDistribution, which both the client and the MP server
 * call — single lever, no divergence.
 */
import type { BlastTileType } from '@/shared/types/blast';

export const CORE_SPECIALS: ReadonlySet<BlastTileType> = new Set<BlastTileType>([
  'bomb', 'ice', 'gold', 'rainbow',
]);

/** Featured tiles spawn often enough to actually be learned. */
export const FEATURED_MIN_SHARE = 0.10;

/** Rotation pool — only currently-active (non-retired) exotic specials. */
const ROTATION: readonly (readonly BlastTileType[])[] = [
  ['prism'],                 // W3  — first exotic, solo spotlight
  ['lightning'],             // W4
  ['mystery'],               // W5  — the surprise tile (Task 4)
  ['prism', 'lightning'],    // W6
  ['anchor'],                // W7
  ['lightning', 'anchor'],   // W8
  ['prism', 'mystery'],      // W9
  ['anchor', 'mystery'],     // W10
  ['prism', 'anchor'],       // W11
  ['lightning', 'mystery'],  // W12
];

export function getFeaturedSpecialsForWave(wave: number): readonly BlastTileType[] {
  if (wave <= 2) return [];
  return ROTATION[(wave - 3) % ROTATION.length];
}

export function applyFeaturedRoster(
  dist: Record<string, number>,
  featured: readonly BlastTileType[] | undefined,
): Record<string, number> {
  if (!featured) return dist;
  const featuredSet = new Set<string>(featured);
  const out: Record<string, number> = { ...dist };
  for (const key of Object.keys(out)) {
    if (key === 'standard' || CORE_SPECIALS.has(key as BlastTileType)) continue;
    if (!featuredSet.has(key)) out[key] = 0;
  }
  // Boost featured shares so the spotlighted tile is actually met. The freed
  // weight comes from the caller's re-normalization pass.
  for (const f of featured) {
    if ((out[f] ?? 0) < FEATURED_MIN_SHARE) out[f] = FEATURED_MIN_SHARE;
  }
  return out;
}
