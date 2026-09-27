/**
 * Word Tower — per-drop "flavour" (pure): a bit of seeded randomness so no two
 * landings feel identical (founder: "make the drop more satisfying and a bit
 * random, use satisfying sounds").
 *
 * VISUAL + AUDIO ONLY. This never touches height/score — Word Tower's daily run
 * feeds a shared leaderboard and must stay reproducible, so the variation is
 * seeded (same drop → same flavour) and applied purely to the landing's sound,
 * bounce and sparkle. The component maps `soundKey` to a concrete play*Sound fn.
 */

import { mulberry32 } from '@/lib/rng/seededRandom';
import type { PlacementQuality } from './cranePlacement';

export type DropSoundKey = 'landCrisp' | 'landSolid' | 'landSoft' | 'landDull';

/** All sound keys, ordered bright→dull. Component maps each to a SFX fn. */
export const DROP_SOUND_KEYS: readonly DropSoundKey[] = [
  'landCrisp',
  'landSolid',
  'landSoft',
  'landDull',
] as const;

export interface DropFlavor {
  /** Which satisfying landing sound to play. */
  soundKey: DropSoundKey;
  /** Extra dust/sparkle particles on top of the depth-based base (0..6). */
  sparkleBonus: number;
  /** Settle-bounce scale (~0.85..1.25) so the squash never feels canned. */
  bounceScale: number;
}

// Quality biases the palette: a clean drop draws from the bright/solid end, a
// fumble from the soft/dull end — so the sound always MATCHES how it landed
// while still varying drop-to-drop.
const PALETTE: Record<PlacementQuality, readonly DropSoundKey[]> = {
  perfect: ['landCrisp', 'landSolid'],
  good: ['landCrisp', 'landSolid', 'landSoft'],
  sloppy: ['landSolid', 'landSoft', 'landDull'],
  miss: ['landSoft', 'landDull'],
};

/**
 * Deterministic, varied landing flavour for one drop. `seed` should be the
 * drop's stable key (e.g. resultKey) so a replay reproduces it exactly.
 */
export function dropFlavor(seed: number, quality: PlacementQuality): DropFlavor {
  const rng = mulberry32((seed >>> 0) || 1);
  const a = rng();
  const b = rng();
  const c = rng();
  const palette = PALETTE[quality];
  const soundKey = palette[Math.floor(a * palette.length)] ?? palette[0];
  return {
    soundKey,
    sparkleBonus: Math.round(b * 6),
    bounceScale: 0.85 + c * 0.4,
  };
}
