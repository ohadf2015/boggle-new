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
import { type ChestRoll, type ChestTier, type RunSummary, runCoins, runQuality } from './estate';
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
/**
 * Every Nth perfect in a row is a GUARANTEED rare crate (and, in run.ts, a
 * wrecking ball). Exported because the streak meter draws a marker there — the
 * bar may only promise a reward the run actually pays.
 */
export const RARE_COMBOS = 3;

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

// ── Variable rewards the player can SEE: streak meter, coins, chest reveal ───

/** Pips in the perfect-streak meter; the multiplier pins here (run.ts COMBO_CAP). */
export const STREAK_PIPS = 8;

export type StreakBand = 'idle' | 'warm' | 'hot' | 'max';

export interface StreakMeter {
  /**
   * Score multiplier this streak is paying (1 = no streak). Real: run.ts pays
   * `PERFECT_BONUS * min(combo, COMBO_CAP)` on a perfect landing.
   */
  mult: number;
  /** Pips lit, 0..STREAK_PIPS. */
  filled: number;
  atMax: boolean;
  /** Copy for the streak's name, or null below a double. */
  tierKey: string | null;
  /** Continuous fill of the bar, 0..1. */
  ratio: number;
  /** The streak length that pays the next guaranteed rare crate. */
  markerAt: number;
  /** Perfect landings still needed to reach that marker. */
  toMarker: number;
  /**
   * The run's best streak so far, as pips (never below `filled`). Drawn dim
   * behind the live fill so the meter still reads as a meter in the frames
   * where the streak has just broken — and so there is something to chase.
   */
  ghost: number;
  band: StreakBand;
}

export function streakMeter(combo: number, bestCombo = 0): StreakMeter {
  const n = Math.max(0, Math.floor(combo));
  const filled = Math.min(STREAK_PIPS, n);
  const tier =
    combo >= 8 ? 'legendary' : combo >= 5 ? 'unstoppable' : combo >= 4 ? 'quad' : combo >= 3 ? 'triple' : combo >= 2 ? 'double' : null;
  const markerAt = (Math.floor(n / RARE_COMBOS) + 1) * RARE_COMBOS;
  return {
    mult: combo <= 1 ? 1 : filled,
    filled,
    atMax: combo >= STREAK_PIPS,
    tierKey: tier ? `wordTowerV2.call.combo.${tier}` : null,
    ratio: filled / STREAK_PIPS,
    markerAt,
    toMarker: markerAt - n,
    ghost: Math.min(STREAK_PIPS, Math.max(filled, Math.floor(Math.max(0, bestCombo)))),
    band: n >= STREAK_PIPS ? 'max' : n >= 5 ? 'hot' : n >= 2 ? 'warm' : 'idle',
  };
}

/**
 * Coins a beat just earned — always the DIFFERENCE of the server's own
 * `runCoins`, never a second formula. Class 3 in the pitfalls list: two sides
 * computing "the same" number drift, so there is only one here.
 */
export function coinDelta(before: RunSummary, after: RunSummary, opts: { district?: number; coinMult?: number } = {}): number {
  return Math.max(0, runCoins(after, opts) - runCoins(before, opts));
}

/** Floors between milestone bursts. */
export const MILESTONE_EVERY = 5;

/** The milestone just crossed (the highest one, on a jump), or null. */
export function milestoneFor(prevFloors: number, floors: number): number | null {
  if (floors < MILESTONE_EVERY) return null;
  const reached = Math.floor(floors / MILESTONE_EVERY) * MILESTONE_EVERY;
  return reached > Math.floor(Math.max(0, prevFloors) / MILESTONE_EVERY) * MILESTONE_EVERY ? reached : null;
}

export interface ChestTease {
  /** What to do more of next run. */
  kind: 'perfects' | 'floors';
  n: number;
  /** The tier the odds are being chased toward. */
  tier: 'rare' | 'epic';
}

/** How much better the run quality has to get before the tease is worth showing. */
const TEASE_STEP = 0.12;
const TEASE_MAX = 6;
/** Copy has no plural forms, so a tease always asks for more than one. */
const TEASE_MIN = 2;

/**
 * The near miss: the smallest push that visibly lifts the next chest's odds.
 * Honest — the quality it names really does raise `chestOdds`.
 */
export function chestTease(summary: RunSummary): ChestTease | null {
  const q = runQuality(summary);
  if (q >= 0.999) return null;
  const tier: ChestTease['tier'] = q >= 0.5 ? 'epic' : 'rare';
  const target = q + TEASE_STEP;
  const missed = Math.max(0, summary.floors - summary.perfects);
  for (let n = 1; n <= Math.min(missed, TEASE_MAX); n += 1) {
    if (runQuality({ ...summary, perfects: summary.perfects + n }) >= target) {
      return { kind: 'perfects', n: Math.max(TEASE_MIN, n), tier };
    }
  }
  for (let n = 1; n <= TEASE_MAX; n += 1) {
    if (runQuality({ ...summary, floors: summary.floors + n, perfects: summary.perfects + n }) >= target) {
      return { kind: 'floors', n: Math.max(TEASE_MIN, n), tier };
    }
  }
  return null;
}

export type ChestItem = 'blueprint' | 'brick' | 'shield';

export type RevealBeat =
  | { kind: 'chest'; tier: ChestTier; ms: number }
  | { kind: 'coins'; coins: number; ms: number }
  | { kind: 'item'; item: ChestItem; n: number; ms: number };

const CHEST_BEAT_MS = 1400;
const COINS_BEAT_MS = 1400;
const ITEM_BEAT_MS = 900;

/**
 * The end-of-run reveal, beat by beat: the chest, the coins counting up, then
 * one card per item. Rarest first, so the best news lands while the player is
 * still watching. `runCoins` is the server's number for the run itself.
 */
export function revealBeats(chest: ChestRoll, runCoinsPaid: number): RevealBeat[] {
  const beats: RevealBeat[] = [
    { kind: 'chest', tier: chest.tier, ms: CHEST_BEAT_MS },
    { kind: 'coins', coins: Math.max(0, Math.round(runCoinsPaid + chest.coins)), ms: COINS_BEAT_MS },
  ];
  const items: Array<[ChestItem, number]> = [
    ['blueprint', chest.blueprints],
    ['brick', chest.bricks],
    ['shield', chest.shields],
  ];
  for (const [item, n] of items) if (n > 0) beats.push({ kind: 'item', item, n, ms: ITEM_BEAT_MS });
  return beats;
}

/** Keep-out from the play box's edges for the payout chip, in CSS px. */
const CHIP_INSET_X = 72;
const CHIP_INSET_Y = 110;

/**
 * Where the payout chip is drawn for an impact at `p`, inside a play box of
 * `box`. A slab that misses the tower lands on the GROUND, which the camera has
 * long since pushed off-screen (measured live: x=569, y=1255 in a 390x844
 * viewport) — the burst was then perfectly correct and perfectly invisible.
 * The ring and the shards stay at the true contact point; only the number is
 * pulled back inside, so a drop always pays where the player can see it.
 */
export function chipAnchor(p: { x: number; y: number }, box: { w: number; h: number }): { x: number; y: number } {
  if (box.w <= 0 || box.h <= 0) return { x: p.x, y: p.y };
  const clamp = (v: number, lo: number, hi: number) => (lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, v)));
  return {
    x: clamp(p.x, CHIP_INSET_X, box.w - CHIP_INSET_X),
    y: clamp(p.y, CHIP_INSET_Y, box.h - CHIP_INSET_Y),
  };
}
