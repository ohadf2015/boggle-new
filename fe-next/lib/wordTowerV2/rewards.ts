/**
 * Word Tower v2 reward crates — v2's own table, paying GAMEPLAY, not just points.
 *
 * v1's surprise table paid "bonus metres" that flashed and vanished. Each crate
 * here changes how the next drops play, so the reward stays on the screen:
 *
 *   steady   — the crane swings slower and narrower for a few drops
 *   plumb    — the next drops fall dead straight (no sideways throw)
 *   wide     — the next floor is built wider (a better platform)
 *   rebar    — welds every floor but the top two: the base can no longer topple
 *   scramble — fresh letters in the bank
 *   jackpot  — a points haul that grows with the tower
 *
 * Variable ratio with a pity timer: chance rises with landing quality, a dry
 * spell guarantees a crate, and perfect-combo milestones guarantee a rare one.
 */
import type { CraneSwing } from './crane';
import type { LandingQuality } from './landing';

export type RewardId = 'steady' | 'plumb' | 'wide' | 'rebar' | 'scramble' | 'jackpot';

interface RewardDef {
  id: RewardId;
  weight: number;
  rare: boolean;
  /** Fewest floors before this can drop. */
  minFloors: number;
}

export const REWARDS: RewardDef[] = [
  { id: 'steady', weight: 24, rare: false, minFloors: 0 },
  { id: 'plumb', weight: 20, rare: false, minFloors: 0 },
  { id: 'wide', weight: 20, rare: false, minFloors: 0 },
  { id: 'scramble', weight: 14, rare: false, minFloors: 0 },
  { id: 'jackpot', weight: 12, rare: true, minFloors: 0 },
  { id: 'rebar', weight: 10, rare: true, minFloors: 4 },
];

const CHANCE: Record<LandingQuality, number> = { perfect: 0.4, good: 0.22, sloppy: 0.08, miss: 0 };
/** Landings without a crate after which the next decent one always pays. */
export const PITY_AFTER = 4;
const RARE_COMBOS = 3;

export interface RollContext {
  quality: LandingQuality;
  /** Perfect streak INCLUDING this landing. */
  combo: number;
  /** Landings since the last crate, before this one. */
  sinceLast: number;
  /** Floors in the tower including this one. */
  floors: number;
}

function pick(rng: () => number, pool: RewardDef[]): RewardId {
  const total = pool.reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total;
  for (const r of pool) {
    roll -= r.weight;
    if (roll < 0) return r.id;
  }
  return pool[pool.length - 1].id;
}

export function rollReward(rng: () => number, ctx: RollContext): RewardId | null {
  if (ctx.quality === 'miss') return null;
  const eligible = REWARDS.filter((r) => ctx.floors >= r.minFloors);
  const milestone = ctx.quality === 'perfect' && ctx.combo > 0 && ctx.combo % RARE_COMBOS === 0;
  const chance = rng();
  if (milestone) return pick(rng, eligible.filter((r) => r.rare));
  if (ctx.sinceLast < PITY_AFTER && chance >= CHANCE[ctx.quality]) return null;
  return pick(rng, eligible);
}

export interface RewardPayout {
  id: RewardId;
  points: number;
  scrambles: number;
  /** Width multiplier for the NEXT floor; 1 = none. */
  widthMult: number;
  steadyDrops: number;
  plumbDrops: number;
  rebar: boolean;
}

const WIDE_MULT = 1.3;

export function payoutFor(id: RewardId, floors: number): RewardPayout {
  const base: RewardPayout = { id, points: 0, scrambles: 0, widthMult: 1, steadyDrops: 0, plumbDrops: 0, rebar: false };
  switch (id) {
    case 'steady':
      return { ...base, steadyDrops: 3 };
    case 'plumb':
      return { ...base, plumbDrops: 2 };
    case 'wide':
      return { ...base, widthMult: WIDE_MULT };
    case 'rebar':
      return { ...base, rebar: true };
    case 'scramble':
      return { ...base, scrambles: 2 };
    case 'jackpot':
      return { ...base, points: 250 + 50 * floors };
  }
}

/** The steady crane: a slower, narrower swing — easier to time. */
export function steadySwing(swing: CraneSwing): CraneSwing {
  return { ...swing, amplitudeRad: swing.amplitudeRad * 0.72, periodMs: swing.periodMs * 1.45 };
}
