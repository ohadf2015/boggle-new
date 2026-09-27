/** Boss fight rules — pure. Damage = word points; HP from the level table. */

export type BossPhase = 'idle' | 'enraged' | 'defeated';

export const ENRAGE_AT = 0.35;
export const FREEZE_MS = 4000;
export const FROZEN_TILES = 2;

export function bossPhase(hpLeft: number, hpMax: number): BossPhase {
  if (hpLeft <= 0) return 'defeated';
  return hpLeft / hpMax <= ENRAGE_AT ? 'enraged' : 'idle';
}

export function bossAttackIntervalMs(world: number, enraged: boolean): number {
  const base = Math.max(8000, 15000 - (world - 1) * 700);
  return Math.round(enraged ? base * 0.6 : base);
}
