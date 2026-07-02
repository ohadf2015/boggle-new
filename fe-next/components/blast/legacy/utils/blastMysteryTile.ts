/**
 * Mystery "?" tile — the slot-machine tile. ONE tile whose whole identity is
 * "you don't know what it does", so it adds variable-ratio reward with ZERO
 * memorization burden. Resolution uses the injected seeded rng, so multiplayer
 * boards resolve identically on client and server.
 */
import type { BlastTileType } from '@/shared/types/blast';

export type MysteryOutcome =
  | { kind: 'scoreBurst'; points: number }
  | { kind: 'spawnSpecial'; special: BlastTileType }
  | { kind: 'miniPop' }
  | { kind: 'mega'; points: number };

const SPAWNABLE: readonly BlastTileType[] = ['bomb', 'gold', 'rainbow', 'ice'];

export const MYSTERY_MEGA_POINTS = 150;

export function rollMysteryOutcome(rng: () => number): MysteryOutcome {
  const roll = rng();
  if (roll < 0.45) {
    return { kind: 'scoreBurst', points: 25 + Math.floor(rng() * 36) }; // 25-60
  }
  if (roll < 0.75) {
    return { kind: 'spawnSpecial', special: SPAWNABLE[Math.floor(rng() * SPAWNABLE.length)] };
  }
  if (roll < 0.95) {
    return { kind: 'miniPop' };
  }
  return { kind: 'mega', points: MYSTERY_MEGA_POINTS };
}
