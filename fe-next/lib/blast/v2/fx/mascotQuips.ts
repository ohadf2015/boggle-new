import type { OvationTier } from '../engine/ovation';

/**
 * Picks a translation-key path for a short mascot quip that fires on cascade
 * "big" / "mega" ovations. Returns null for `none` / `small` (those already
 * have FX + sound; layering text on every chain makes the screen busy).
 *
 * Uses a deterministic seeded index so the same run is reproducible in
 * playtests, but the seed mixes chainDepth + a level salt so consecutive
 * mega-chains within one level don't repeat the exact same line.
 */

const BIG_KEYS = ['blast.quip.big.0', 'blast.quip.big.1', 'blast.quip.big.2'] as const;
const MEGA_KEYS = ['blast.quip.mega.0', 'blast.quip.mega.1', 'blast.quip.mega.2'] as const;

export function pickQuipKey(
  tier: OvationTier,
  chainDepth: number,
  levelSalt: number,
): string | null {
  if (tier === 'none' || tier === 'small') return null;
  const pool = tier === 'mega' ? MEGA_KEYS : BIG_KEYS;
  // Mix levelSalt and chainDepth so depth=3,4,5 each rotate within the pool.
  const idx = Math.abs((levelSalt * 73856093) ^ (chainDepth * 19349663)) % pool.length;
  return pool[idx]!;
}
