/**
 * Blast V2 in-game "surprise" events — the variable-reward layer.
 *
 * The legacy modifier system (level-modifiers.ts) rolls ONCE at board-gen time
 * and shows a banner in the intro card, so the whole level is pre-determined
 * the moment you start. That is not a variable reward — the player knows what
 * they're getting before the first move.
 *
 * Surprises fire DURING play, on a successful word, on an unpredictable
 * schedule. That intermittent, can't-predict-the-next-one cadence is the
 * variable-ratio reinforcement that makes a loop compulsive (the same schedule
 * behind slot machines and loot drops). Two guards keep it feeling fair rather
 * than random-noise:
 *   - COOLDOWN: never twice within a couple words, so back-to-back pops don't
 *     cheapen the moment.
 *   - PITY: guaranteed within PITY words of the last one, so a cold streak
 *     can't silently kill the loop (a pure coin-flip clusters AND droughts).
 * Chance also tilts up with longer words and deeper cascades so skilful play is
 * rewarded — the gamble leans your way, it's never purely luck.
 *
 * Pure + deterministic: the reducer seeds a small LCG from the level number and
 * advances it per submit, so runs are reproducible (undo-safe, unit-testable)
 * while staying unpredictable to the player.
 */

export type SurpriseEvent =
  | 'coin_burst' // a pile of coins, right now
  | 'gem_shower' // a big jump on the chest bar
  | 'chain_charge' // cascade-scaled coin payout
  | 'lucky_double' // charges the NEXT word for ×2 coins
  | 'golden_word'; // rare jackpot: coins + chest together

// Surprises stay quiet on level 1 — the FTUE is teaching the core trace/clear
// loop and a reward pop would muddy the first lesson.
export const SURPRISE_UNLOCK_LEVEL = 2;
// Minimum words between surprises. < this since the last one → no roll. Keeps
// pops from clumping back-to-back (which cheapens the moment).
export const SURPRISE_COOLDOWN = 2;
// Words since the last surprise that force a guaranteed fire. CRITICAL: Blast
// V2 levels are SHORT — 3 words (L1-5) / 4-5 words (L6-30) — so a player makes
// only ~3-5 submits per level. A pity > 5 is unreachable and the guarantee
// becomes dead code, leaving ~40% of levels with zero surprises. 4 guarantees
// a pop by the 4th submit on every 4+ word level (the whole L6+ range).
export const SURPRISE_PITY = 4;

// Higher base than the first pass (0.16): with so few submits per level we want
// surprises to land EARLY and often-ish, not only via the pity backstop.
const BASE_CHANCE = 0.24;
const MAX_SCALED_CHANCE = 0.9; // scaling never reaches a guaranteed 1
const LEN_STEP = 0.03;
const LEN_CAP = 0.15;
const CHAIN_STEP = 0.1;
const CHAIN_CAP = 0.2;

export type SurpriseContext = {
  levelNumber: number;
  /** Words found since the last surprise (or since level start). */
  wordsSinceLast: number;
  wordLen: number;
  chainDepth: number;
};

export function surpriseChance(ctx: SurpriseContext): number {
  if (ctx.levelNumber < SURPRISE_UNLOCK_LEVEL) return 0;
  if (ctx.wordsSinceLast < SURPRISE_COOLDOWN) return 0;
  if (ctx.wordsSinceLast >= SURPRISE_PITY) return 1; // pity guarantee
  const lenBoost = Math.min(LEN_CAP, Math.max(0, ctx.wordLen - 3) * LEN_STEP);
  const chainBoost = Math.min(CHAIN_CAP, Math.max(0, ctx.chainDepth) * CHAIN_STEP);
  return Math.min(MAX_SCALED_CHANCE, BASE_CHANCE + lenBoost + chainBoost);
}

// Weighted table — coin_burst is the bread-and-butter, golden_word is the rare
// jackpot that makes players hope for it. Tuned so the rare event lands often
// enough to feel reachable (~5%) but not so often it stops feeling special.
const WEIGHTS: ReadonlyArray<readonly [SurpriseEvent, number]> = [
  ['coin_burst', 34],
  ['gem_shower', 24],
  ['chain_charge', 18],
  ['lucky_double', 16],
  ['golden_word', 8],
] as const;

const TOTAL_WEIGHT = WEIGHTS.reduce((s, [, w]) => s + w, 0);

export function pickSurprise(roll01: number): SurpriseEvent {
  const target = roll01 * TOTAL_WEIGHT;
  let acc = 0;
  for (const [event, w] of WEIGHTS) {
    acc += w;
    if (target < acc) return event;
  }
  return WEIGHTS[WEIGHTS.length - 1]![0];
}

export type SurpriseRoll = SurpriseEvent | null;

/**
 * Roll a surprise for a successful word. `rng` returns values in [0,1). Draws
 * once to decide whether to fire, then (only on a fire) once more to pick the
 * event — so the seed advances by exactly the draws consumed.
 */
export function rollSurprise(rng: () => number, ctx: SurpriseContext): SurpriseRoll {
  const chance = surpriseChance(ctx);
  if (chance <= 0) return null;
  if (rng() >= chance) return null;
  return pickSurprise(rng());
}

export type SurpriseReward = {
  coins: number;
  chestProgress: number;
  /** lucky_double charges the NEXT word; every other event leaves it at 1. */
  nextWordMultiplier: 1 | 2;
};

export function surpriseReward(event: SurpriseEvent, ctx: SurpriseContext): SurpriseReward {
  // Payouts grow with progression so a surprise on level 40 feels bigger than
  // on level 3 (matching the higher coin economy of deep levels).
  const tier = Math.floor(ctx.levelNumber / 5) + 1;
  switch (event) {
    case 'coin_burst':
      return { coins: 30 + tier * 15, chestProgress: 0, nextWordMultiplier: 1 };
    case 'gem_shower':
      return { coins: 0, chestProgress: 0.12, nextWordMultiplier: 1 };
    case 'chain_charge':
      return {
        coins: 20 + Math.max(0, ctx.chainDepth) * 25 + tier * 10,
        chestProgress: 0.04,
        nextWordMultiplier: 1,
      };
    case 'lucky_double':
      return { coins: 0, chestProgress: 0, nextWordMultiplier: 2 };
    case 'golden_word':
      return { coins: 80 + tier * 30, chestProgress: 0.15, nextWordMultiplier: 1 };
  }
}

// Deterministic LCG (same constants as chain-builder's rng) so the reducer can
// advance a seed purely without Math.random — keeping submits reproducible.
export function advanceSeed(seed: number): number {
  return (seed * 1664525 + 1013904223) >>> 0;
}

export function seedUnit(seed: number): number {
  return seed / 0x100000000;
}

/** Initial per-level seed. Varied per level, never zero. */
export function initialSurpriseSeed(levelNumber: number): number {
  return ((levelNumber * 2654435761) >>> 0) || 1;
}

export type ActiveSurprise = {
  event: SurpriseEvent;
  coins: number;
  chestProgress: number;
  /** Bumps every fire so the HUD re-animates even on a repeat event. */
  key: number;
};

// The slice of game state the surprise layer owns. Folded into the reducer's
// State; kept as its own type so the resolver can be unit-tested in isolation.
export type SurpriseState = {
  surpriseSeed: number;
  wordsSinceSurprise: number;
  nextWordMultiplier: 1 | 2;
  activeSurprise: ActiveSurprise | null;
};

export type SubmitSurpriseInput = {
  levelNumber: number;
  wordLen: number;
  chainDepth: number;
};

export type SubmitSurpriseResult = {
  /** Surprise coin reward to add to this submit's coins. */
  bonusCoins: number;
  /** Surprise chest-bar reward to add to this submit. */
  bonusChestProgress: number;
  /** Multiplier to apply to THIS word's coins — a charge banked by a prior
   *  lucky_double. Consumed here whether or not a new surprise fires. */
  appliedMultiplier: 1 | 2;
  /** Updated surprise slice for the reducer to spread back into State. */
  next: SurpriseState;
};

/**
 * Resolve the surprise layer for one accepted word. Pure: deterministic given
 * `prev` (it advances the embedded LCG seed). Call once per successful submit,
 * AFTER computing the word's base coins, then apply the returned deltas.
 */
export function resolveSubmitSurprise(
  prev: SurpriseState,
  input: SubmitSurpriseInput,
): SubmitSurpriseResult {
  // A lucky_double banked on a previous word pays out on THIS one.
  const appliedMultiplier = prev.nextWordMultiplier;

  let seed = prev.surpriseSeed;
  const rng = () => {
    seed = advanceSeed(seed);
    return seedUnit(seed);
  };
  const wordsSinceLast = prev.wordsSinceSurprise + 1;
  const event = rollSurprise(rng, {
    levelNumber: input.levelNumber,
    wordsSinceLast,
    wordLen: input.wordLen,
    chainDepth: input.chainDepth,
  });

  if (!event) {
    return {
      bonusCoins: 0,
      bonusChestProgress: 0,
      appliedMultiplier,
      next: {
        surpriseSeed: seed,
        wordsSinceSurprise: wordsSinceLast,
        nextWordMultiplier: 1, // charge consumed, not renewed
        activeSurprise: null,
      },
    };
  }

  const reward = surpriseReward(event, {
    levelNumber: input.levelNumber,
    wordsSinceLast,
    wordLen: input.wordLen,
    chainDepth: input.chainDepth,
  });
  const key = (prev.activeSurprise?.key ?? 0) + 1;
  return {
    bonusCoins: reward.coins,
    bonusChestProgress: reward.chestProgress,
    appliedMultiplier,
    next: {
      surpriseSeed: seed,
      wordsSinceSurprise: 0,
      nextWordMultiplier: reward.nextWordMultiplier,
      activeSurprise: { event, coins: reward.coins, chestProgress: reward.chestProgress, key },
    },
  };
}

// Icon path + i18n key per event, for the HUD banner. Co-located so adding an
// event forces the display metadata in the same edit.
export const SURPRISE_META: Record<SurpriseEvent, { icon: string; key: string }> = {
  coin_burst: { icon: '/blast/icons/coin.svg', key: 'coinBurst' },
  gem_shower: { icon: '/blast/icons/gem.svg', key: 'gemShower' },
  chain_charge: { icon: '/blast/icons/bolt.svg', key: 'chainCharge' },
  lucky_double: { icon: '/blast/icons/sparkle.svg', key: 'luckyDouble' },
  golden_word: { icon: '/blast/icons/star.svg', key: 'goldenWord' },
};
