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

/**
 * Every beat carries its `tier`. The coins and the cards are payout sounds as
 * much as the pop is, so they have to be able to get louder with the chest —
 * and a beat that had to be told its tier separately is exactly the two-sources
 * split that drifts (Class 1 in the pitfalls list).
 */
export type RevealBeat =
  /** Lid rattling, light seeping out — the held breath before the pop. */
  | { kind: 'anticipation'; tier: ChestTier; ms: number }
  /** The lid blows: colour flood, sparks, screen shake — all sized by tier. */
  | { kind: 'burst'; tier: ChestTier; ms: number }
  | { kind: 'coins'; tier: ChestTier; coins: number; ms: number; countMs: number }
  | { kind: 'item'; tier: ChestTier; item: ChestItem; n: number; ms: number };

/**
 * The whole reveal is seen EVERY run, so it is on a hard budget. 2.5s is the
 * outside edge: past that the player is waiting rather than winning.
 */
export const REVEAL_BUDGET_MS = 2500;

/**
 * How loud each rarity gets. Every field rises with the tier, so the frame the
 * lid pops on already says "rare" before a single word is drawn: more light,
 * a wider burst, more sparks, a harder shake. The component maps these to
 * Tailwind tokens; the magnitudes live here so they can be tested.
 */
export interface TierFx {
  tier: ChestTier;
  /** Lid-rattle beat, ms. */
  anticipationMs: number;
  /** Shake cycles packed into that beat — more shakes read as more tension. */
  rattles: number;
  /** The pop itself, ms. */
  burstMs: number;
  /** fx-star sparks thrown outward. */
  sparks: number;
  /** Burst radius as a fraction of the overlay's short side. */
  spread: number;
  /** A held, slowed first frame of the pop — epic only. */
  slowmoMs: number;
  /**
   * Spokes in the god-ray fan that wheels out from behind the chest. Zero for
   * a common: the rays ARE the rarity, and a common that threw them would
   * spend the signal the rare needs.
   */
  rays: number;
  /** Coin sprites thrown out of the lid — the "gold shower", sized by tier. */
  coinBurst: number;
  /** A rarity banner sweeps in (rare and up). */
  banner: boolean;
  /** Alpha of the tier-coloured flood behind the chest, 0..1. */
  flood: number;
  /** Screen shake amplitude, px. */
  shakePx: number;
  /** Pop volume, 0..1. */
  volume: number;
  /** How long the coins take to count up, ms. */
  coinCountMs: number;
}

const TIER_FX: Record<ChestTier, TierFx> = {
  common: {
    tier: 'common',
    anticipationMs: 380,
    rattles: 2,
    burstMs: 300,
    sparks: 8,
    spread: 0.34,
    slowmoMs: 0,
    rays: 0,
    coinBurst: 5,
    banner: false,
    flood: 0.18,
    shakePx: 4,
    volume: 0.5,
    coinCountMs: 520,
  },
  rare: {
    tier: 'rare',
    anticipationMs: 480,
    rattles: 3,
    burstMs: 400,
    sparks: 18,
    spread: 0.58,
    slowmoMs: 0,
    rays: 10,
    coinBurst: 12,
    banner: true,
    flood: 0.38,
    shakePx: 9,
    volume: 0.75,
    coinCountMs: 620,
  },
  epic: {
    tier: 'epic',
    anticipationMs: 560,
    rattles: 4,
    burstMs: 480,
    sparks: 30,
    spread: 0.86,
    slowmoMs: 260,
    rays: 16,
    coinBurst: 18,
    banner: true,
    flood: 0.6,
    shakePx: 15,
    volume: 1,
    coinCountMs: 700,
  },
};

export function tierFx(tier: ChestTier): TierFx {
  return TIER_FX[tier];
}

/** The coins chip holds for a moment after the number lands. */
const COIN_HOLD_MS = 80;
const ITEM_BEAT_MS = 180;

/**
 * The end-of-run reveal, beat by beat: the lid rattling, the pop, the coins
 * counting up, then one card per item. Rarest first, so the best news lands
 * while the player is still watching. `runCoinsPaid` is the server's number for
 * the run itself. Every tier's whole sequence fits `REVEAL_BUDGET_MS`.
 */
export function revealBeats(chest: ChestRoll, runCoinsPaid: number): RevealBeat[] {
  const fx = tierFx(chest.tier);
  const beats: RevealBeat[] = [
    { kind: 'anticipation', tier: chest.tier, ms: fx.anticipationMs },
    { kind: 'burst', tier: chest.tier, ms: fx.burstMs },
    {
      kind: 'coins',
      tier: chest.tier,
      coins: Math.max(0, Math.round(runCoinsPaid + chest.coins)),
      ms: fx.coinCountMs + COIN_HOLD_MS,
      countMs: fx.coinCountMs,
    },
  ];
  const items: Array<[ChestItem, number]> = [
    ['blueprint', chest.blueprints],
    ['brick', chest.bricks],
    ['shield', chest.shields],
  ];
  for (const [item, n] of items) if (n > 0) beats.push({ kind: 'item', tier: chest.tier, item, n, ms: ITEM_BEAT_MS });
  return beats;
}

/** How long the whole reveal runs if nobody taps to skip. */
export function revealTotalMs(beats: RevealBeat[]): number {
  return beats.reduce((s, b) => s + b.ms, 0);
}

/** Ticks played while the coins count up. */
export const COIN_TICKS = 7;

/**
 * Playback rate for the i-th count-up tick — a rising ladder, so the number
 * climbing is HEARD climbing. Clamped so a stray index can never detune.
 */
export function coinTickRate(i: number, ticks = COIN_TICKS): number {
  const span = Math.max(1, ticks - 1);
  const k = Math.min(1, Math.max(0, i / span));
  return Number((0.92 + 0.62 * k).toFixed(3));
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
