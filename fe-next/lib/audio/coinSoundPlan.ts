/**
 * Pure planner for the "coins earned" reward moment.
 *
 * Turns an earned amount + an injected RNG into a deterministic plan that the
 * orchestrator (GlobalCoinEarnFx) turns into side effects: an ascending-pitch
 * coin-chime arpeggio (the casino "ding-ding-ding"), a flying-coin count, and a
 * tier flourish on the HUD counter. RNG is injected so the "feels random every
 * time" feel is fully testable. Cosmetic only — NO leaderboard-seed constraint,
 * so Math.random is a fine default.
 */

export type CoinRewardTier = 'normal' | 'big' | 'jackpot';

export interface CoinChime {
  /** When to play this chime, ms after the moment starts. First is 0. */
  delayMs: number;
  /** Howler playback rate (pitch). Climbs each step; capped at MAX_COIN_RATE. */
  rate: number;
  /** Per-chime volume. */
  volume: number;
}

export interface CoinRewardPlan {
  tier: CoinRewardTier;
  /** How many coins to fling toward the counter. */
  coinCount: number;
  /** The ascending arpeggio of chimes. */
  chimes: CoinChime[];
  /** Layer the heavier `coinCascade` sound (jackpot only). */
  cascade: boolean;
}

export const BIG_AMOUNT = 25;
export const JACKPOT_AMOUNT = 100;
/** Small chance any reward surprises with a jackpot, regardless of size. */
export const JACKPOT_SURPRISE_CHANCE = 0.08;

export const MIN_COINS_PER_BURST = 4;
export const MAX_COINS_PER_BURST = 10;
/** Extra coins a jackpot may fling beyond the normal cap. */
export const JACKPOT_COIN_CAP = 16;

export const MAX_COIN_RATE = 2.0;

/** Chimes per tier — more notes = bigger celebration. */
const CHIME_COUNT: Record<CoinRewardTier, number> = {
  normal: 3,
  big: 5,
  jackpot: 7,
};

/** Pitch step between arpeggio notes (musical-ish, ~minor third). */
const RATE_STEP = 0.12;
/** Base pitch jitters within this band so each moment sounds a little different. */
const RATE_BASE_MIN = 0.92;
const RATE_BASE_SPAN = 0.16;

const EMPTY_PLAN: CoinRewardPlan = {
  tier: 'normal',
  coinCount: 0,
  chimes: [],
  cascade: false,
};

function selectTier(amount: number, surpriseRoll: number): CoinRewardTier {
  if (amount >= JACKPOT_AMOUNT) return 'jackpot';
  if (surpriseRoll < JACKPOT_SURPRISE_CHANCE) return 'jackpot';
  if (amount >= BIG_AMOUNT) return 'big';
  return 'normal';
}

function buildChimes(tier: CoinRewardTier, baseJitter: number): CoinChime[] {
  const count = CHIME_COUNT[tier];
  const baseRate = RATE_BASE_MIN + baseJitter * RATE_BASE_SPAN;
  const spacingMs = tier === 'jackpot' ? 55 : 75;
  const baseVolume = tier === 'jackpot' ? 0.55 : 0.45;

  const chimes: CoinChime[] = [];
  for (let i = 0; i < count; i++) {
    chimes.push({
      delayMs: i * spacingMs,
      rate: Math.min(MAX_COIN_RATE, baseRate + i * RATE_STEP),
      volume: Math.min(0.7, baseVolume + i * 0.03),
    });
  }
  return chimes;
}

function buildCoinCount(amount: number, tier: CoinRewardTier, jitterRoll: number): number {
  const base = Math.ceil(amount / 25);
  // jitter ∈ {-1, 0, +1} for a slightly different scatter each time.
  const jitter = Math.floor(jitterRoll * 3) - 1;
  const cap = tier === 'jackpot' ? JACKPOT_COIN_CAP : MAX_COINS_PER_BURST;
  const floor = tier === 'jackpot' ? MIN_COINS_PER_BURST + 4 : MIN_COINS_PER_BURST;
  return Math.max(floor, Math.min(cap, base + jitter));
}

/**
 * Plan the reward moment for `amount` coins.
 *
 * RNG is consumed in a fixed order so tests are deterministic:
 *   1. jackpot-surprise roll
 *   2. base-pitch jitter
 *   3. coin-count jitter
 */
export function planCoinReward(
  amount: number,
  rand: () => number = Math.random,
): CoinRewardPlan {
  if (!(amount > 0)) return EMPTY_PLAN;

  const surpriseRoll = rand();
  const baseJitter = rand();
  const jitterRoll = rand();

  const tier = selectTier(amount, surpriseRoll);

  return {
    tier,
    coinCount: buildCoinCount(amount, tier, jitterRoll),
    chimes: buildChimes(tier, baseJitter),
    cascade: tier === 'jackpot',
  };
}
