/**
 * Word Tower — per-word "surprise" events: the variable-reward layer.
 *
 * Base tower scoring is fully deterministic (length + combo + crane-drop
 * quality), so a player can in principle predict every floor's height before
 * the drop. That is satisfying but not *compulsive* — there's no can't-predict
 * payoff. Surprises fire DURING a climb, on an accepted word, on an
 * unpredictable schedule. That intermittent, can't-call-the-next-one cadence is
 * variable-ratio reinforcement — the same schedule behind slot machines and
 * loot drops — and it's what turns a good loop into one you can't put down.
 *
 * Two guards keep it feeling fair, not like noise:
 *   - COOLDOWN: never twice within a few words, so back-to-back pops don't
 *     cheapen the moment.
 *   - PITY: guaranteed within PITY words of the last one, so a cold streak can't
 *     silently kill the loop (a pure coin-flip both clusters AND droughts).
 * Chance also tilts up with longer words and higher combos, so skilful play
 * earns more luck — the gamble leans your way, never pure chance.
 *
 * LEADERBOARD INTEGRITY: Word Tower's daily mode feeds a shared leaderboard, so
 * per-word height MUST be reproducible — reload the same run, get the same
 * score. This layer therefore uses a deterministic LCG seeded from the run's
 * gameCode and advanced once per submit. NO Math.random. Same play → same pops
 * → same final height, on every device and every reload.
 *
 * Mirrors lib/blast/v2/surprise.ts (coins/chest) but re-themed to a vertical
 * climb: the rewards are height, scrambles, and a banked next-word boost.
 */

import { fnv1aHash } from '@/lib/rng/seededRandom';

export type TowerSurpriseEvent =
  | 'surge' // a burst of bonus height, right now (bread-and-butter)
  | 'windfall' // a cache of free scrambles (the resource economy)
  | 'updraft' // charges the NEXT word with a height multiplier (anticipation)
  | 'crystal' // bonus height + a scramble (mid-tier mixed payout)
  | 'golden_floor' // rare jackpot: a big height surge AND a scramble
  | 'echo' // double-tap: modest height now + a small next-word mult (surprise loop)
  | 'meteor_strike' // flash of bonus height (spectacle payout)
  | 'phantom_floor'; // free scramble + a thin height bump (ghost floor)

/** Floors placed before surprises arm. The opening climb teaches the core
 *  chain/build loop; a reward pop on word #1 would muddy that first lesson. */
export const TOWER_SURPRISE_UNLOCK_FLOOR = 2;
/** Minimum words between surprises. Fewer than this since the last → no roll.
 *  Keeps pops from clumping (which cheapens them). */
export const TOWER_SURPRISE_COOLDOWN = 3;
/** Words since the last surprise that force a guaranteed fire. Tower runs are
 *  LONG (you climb for dozens of words), unlike Blast's 3-5-word levels, so the
 *  pity window can be generous without ever becoming dead code. */
export const TOWER_SURPRISE_PITY = 7;

const BASE_CHANCE = 0.18;
const MAX_SCALED_CHANCE = 0.85; // scaling never reaches a guaranteed 1
const LEN_STEP = 0.03;
const LEN_CAP = 0.15;
const COMBO_STEP = 0.02;
const COMBO_CAP = 0.16;

export type TowerSurpriseContext = {
  /** Floors placed so far this run — gates the unlock. */
  floorCount: number;
  /** Words accepted since the last surprise (or since the run start). */
  wordsSinceLast: number;
  wordLen: number;
  combo: number;
  /** The word's base height before any surprise — bonuses scale off this so a
   *  payout deep in the tower is proportionally bigger than an early one. */
  baseMeters: number;
};

export function towerSurpriseChance(ctx: TowerSurpriseContext): number {
  if (ctx.floorCount < TOWER_SURPRISE_UNLOCK_FLOOR) return 0;
  if (ctx.wordsSinceLast < TOWER_SURPRISE_COOLDOWN) return 0;
  if (ctx.wordsSinceLast >= TOWER_SURPRISE_PITY) return 1; // pity guarantee
  const lenBoost = Math.min(LEN_CAP, Math.max(0, ctx.wordLen - 3) * LEN_STEP);
  const comboBoost = Math.min(COMBO_CAP, Math.max(0, ctx.combo) * COMBO_STEP);
  return Math.min(MAX_SCALED_CHANCE, BASE_CHANCE + lenBoost + comboBoost);
}

// Weighted table — surge is the everyday pop, golden_floor is the rare jackpot.
// Extra kinds (echo / meteor / phantom) keep climbs surprising without drowning
// the classic set. Jackpot ~5%; new kinds collectively ~16%.
const WEIGHTS: ReadonlyArray<readonly [TowerSurpriseEvent, number]> = [
  ['surge', 30],
  ['windfall', 18],
  ['updraft', 14],
  ['crystal', 15],
  ['echo', 8],
  ['meteor_strike', 5],
  ['phantom_floor', 5],
  ['golden_floor', 5],
] as const;

const TOTAL_WEIGHT = WEIGHTS.reduce((s, [, w]) => s + w, 0);

export function pickTowerSurprise(roll01: number): TowerSurpriseEvent {
  const target = roll01 * TOTAL_WEIGHT;
  let acc = 0;
  for (const [event, w] of WEIGHTS) {
    acc += w;
    if (target < acc) return event;
  }
  return WEIGHTS[WEIGHTS.length - 1]![0];
}

export type TowerSurpriseRoll = TowerSurpriseEvent | null;

/**
 * Roll a surprise for an accepted word. `rng` returns values in [0,1). Draws
 * once to decide whether to fire, then (only on a fire) once more to pick the
 * event — so the seed advances by exactly the draws consumed.
 */
export function rollTowerSurprise(rng: () => number, ctx: TowerSurpriseContext): TowerSurpriseRoll {
  const chance = towerSurpriseChance(ctx);
  if (chance <= 0) return null;
  if (rng() >= chance) return null;
  return pickTowerSurprise(rng());
}

export type TowerSurpriseReward = {
  /** Extra height granted immediately. */
  bonusMeters: number;
  /** Free scrambles added to the bank. */
  bonusScrambles: number;
  /** Multiplier banked for the NEXT word's height (1 = none). */
  nextWordHeightMult: number;
};

/** The height multiplier a banked updraft applies to the NEXT word. Exported so
 *  the HUD can SURFACE the promise ("next ×1.5") at roll time — otherwise an
 *  updraft pop shows no number (its payout lands a word later) and reads as a
 *  hollow reward. */
export const UPDRAFT_MULT = 1.5;

export function towerSurpriseReward(
  event: TowerSurpriseEvent,
  ctx: TowerSurpriseContext,
): TowerSurpriseReward {
  // Payouts ride the base scoring so a surprise stays proportional at any depth.
  const base = Math.max(1, ctx.baseMeters);
  switch (event) {
    case 'surge':
      return { bonusMeters: Math.round(base * 0.6), bonusScrambles: 0, nextWordHeightMult: 1 };
    case 'windfall':
      return { bonusMeters: 0, bonusScrambles: 1, nextWordHeightMult: 1 };
    case 'updraft':
      return { bonusMeters: 0, bonusScrambles: 0, nextWordHeightMult: UPDRAFT_MULT };
    case 'crystal':
      return { bonusMeters: Math.round(base * 0.4), bonusScrambles: 1, nextWordHeightMult: 1 };
    case 'echo':
      return { bonusMeters: Math.round(base * 0.35), bonusScrambles: 0, nextWordHeightMult: 1.25 };
    case 'meteor_strike':
      return { bonusMeters: Math.round(base * 0.95), bonusScrambles: 0, nextWordHeightMult: 1 };
    case 'phantom_floor':
      return { bonusMeters: Math.round(base * 0.25), bonusScrambles: 1, nextWordHeightMult: 1 };
    case 'golden_floor':
      return { bonusMeters: Math.round(base * 1.6), bonusScrambles: 1, nextWordHeightMult: 1 };
  }
}

// Deterministic LCG (same constants as the chain-builder rng) so the reducer can
// advance a seed purely, with no Math.random — keeping every submit reproducible
// for the daily leaderboard.
export function advanceTowerSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

export function towerSeedUnit(seed: number): number {
  return seed / 0x100000000;
}

/** Initial per-run seed, derived from the run's gameCode. Stable + never zero. */
export function initialTowerSurpriseSeed(gameCode: string): number {
  return (fnv1aHash(`word-tower-surprise-${gameCode}`) >>> 0) || 1;
}

export type ActiveTowerSurprise = {
  event: TowerSurpriseEvent;
  bonusMeters: number;
  bonusScrambles: number;
  /** Bumps every fire so the HUD re-animates even on a repeat event. */
  key: number;
};

/** The slice of player state the surprise layer owns. Kept as its own type so
 *  the resolver is unit-testable in isolation and folds cleanly into the bigger
 *  WordTowerPlayerState. */
export type TowerSurpriseState = {
  surpriseSeed: number;
  wordsSinceSurprise: number;
  nextWordHeightMult: number;
  activeSurprise: ActiveTowerSurprise | null;
};

/** Defaults for a run that predates the surprise layer (restored old save). */
export function defaultTowerSurpriseState(gameCode: string): TowerSurpriseState {
  return {
    surpriseSeed: initialTowerSurpriseSeed(gameCode),
    wordsSinceSurprise: 0,
    nextWordHeightMult: 1,
    activeSurprise: null,
  };
}

export type TowerSubmitSurpriseInput = {
  floorCount: number;
  wordLen: number;
  combo: number;
  baseMeters: number;
};

export type TowerSubmitSurpriseResult = {
  /** Extra height to add to this submit. */
  bonusMeters: number;
  /** Free scrambles to add to this submit. */
  bonusScrambles: number;
  /** Multiplier to apply to THIS word's height — a charge banked by a prior
   *  updraft. Consumed here whether or not a new surprise fires. */
  appliedHeightMult: number;
  /** Updated surprise slice for the caller to fold back into player state. */
  next: TowerSurpriseState;
};

/**
 * Resolve the surprise layer for one accepted word. Pure + deterministic given
 * `prev` (it advances the embedded LCG seed). Call once per accepted submit,
 * AFTER computing the word's base height, then apply the returned deltas.
 */
export function resolveTowerSubmitSurprise(
  prev: TowerSurpriseState,
  input: TowerSubmitSurpriseInput,
): TowerSubmitSurpriseResult {
  // An updraft banked on a previous word pays out on THIS one.
  const appliedHeightMult = prev.nextWordHeightMult || 1;

  let seed = prev.surpriseSeed;
  const rng = () => {
    seed = advanceTowerSeed(seed);
    return towerSeedUnit(seed);
  };
  const wordsSinceLast = prev.wordsSinceSurprise + 1;
  const ctx: TowerSurpriseContext = {
    floorCount: input.floorCount,
    wordsSinceLast,
    wordLen: input.wordLen,
    combo: input.combo,
    baseMeters: input.baseMeters,
  };
  const event = rollTowerSurprise(rng, ctx);

  if (!event) {
    return {
      bonusMeters: 0,
      bonusScrambles: 0,
      appliedHeightMult,
      next: {
        surpriseSeed: seed,
        wordsSinceSurprise: wordsSinceLast,
        nextWordHeightMult: 1, // any prior charge consumed, not renewed
        activeSurprise: null,
      },
    };
  }

  const reward = towerSurpriseReward(event, ctx);
  const key = (prev.activeSurprise?.key ?? 0) + 1;
  return {
    bonusMeters: reward.bonusMeters,
    bonusScrambles: reward.bonusScrambles,
    appliedHeightMult,
    next: {
      surpriseSeed: seed,
      wordsSinceSurprise: 0,
      nextWordHeightMult: reward.nextWordHeightMult,
      activeSurprise: {
        event,
        bonusMeters: reward.bonusMeters,
        bonusScrambles: reward.bonusScrambles,
        key,
      },
    },
  };
}

/** Semantic sound key per event — the component maps this to a play*Sound fn.
 *  Kept as a string union (not the fn itself) so this module stays React-free
 *  and unit-testable. */
export type TowerSurpriseSound = 'powerUp' | 'gift' | 'timeBonus' | 'rare' | 'chest';

// Emoji + i18n key + sound per event for the HUD pop. Co-located so adding an
// event forces all of its display + audio metadata in the same edit.
export const TOWER_SURPRISE_META: Record<
  TowerSurpriseEvent,
  { emoji: string; key: string; sound: TowerSurpriseSound }
> = {
  surge: { emoji: '⚡', key: 'surge', sound: 'powerUp' },
  windfall: { emoji: '🪂', key: 'windfall', sound: 'gift' },
  updraft: { emoji: '🌬️', key: 'updraft', sound: 'timeBonus' },
  crystal: { emoji: '💎', key: 'crystal', sound: 'rare' },
  echo: { emoji: '🔁', key: 'echo', sound: 'timeBonus' },
  meteor_strike: { emoji: '☄️', key: 'meteorStrike', sound: 'rare' },
  phantom_floor: { emoji: '👻', key: 'phantomFloor', sound: 'gift' },
  golden_floor: { emoji: '🌟', key: 'goldenFloor', sound: 'chest' },
};
