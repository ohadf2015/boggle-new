/**
 * Blast "treasure roll" — ethical variable reward.
 *
 * A small, UPSIDE-ONLY bonus rolled on top of a word's deterministic base score
 * so two identical words don't always feel identical. Designed against the
 * council's guardrails:
 *   - Floor rule: bonus >= 0, total >= base (randomness never punishes).
 *   - Capped: bonus <= base * maxBonusRatio (anti-cheat ceiling).
 *   - Deterministic: seeded → same input yields same result (server-verifiable;
 *     can't be re-rolled by retrying the same word).
 *   - Skill-biased: deeper combos / cascades / special tiles raise jackpot odds,
 *     so good play is what unlocks the big surprises — not luck alone.
 *
 * Pure + framework-free so it can run client-side (solo) and, if ever needed,
 * be verified server-side.
 */
import { createSeededRandom } from '@/lib/adventure/gridRandom';

export type TreasureTier = 'common' | 'lucky' | 'jackpot';

export interface TreasureRoll {
  tier: TreasureTier;
  /** Integer points added on top of base (>= 0). */
  bonus: number;
  /** base + bonus. */
  total: number;
  /** total / base, rounded to 2dp — for "×1.3 LUCKY!" display (1 when base is 0). */
  multiplier: number;
}

export interface TreasureInput {
  /** Stable seed — e.g. `${levelId}:${wordIndex}` or a numeric hash. */
  seed: number | string;
  /** Deterministic base score for the word (the floor). */
  base: number;
  /** Current combo level (0+). Higher → more jackpots. */
  comboLevel?: number;
  /** Cascade chain depth (0+). Deeper → more jackpots. */
  cascadeDepth?: number;
  /** Word included a special tile (gem/gold/etc) → boost. */
  hasSpecial?: boolean;
  /** Cap bonus at base * this ratio. Default 1.0 (bonus can't exceed base). */
  maxBonusRatio?: number;
}

const BASE_LUCKY = 0.22;
const BASE_JACKPOT = 0.05;

/** Stable string/number → 32-bit seed for the PRNG. */
function hashSeed(seed: number | string): number {
  if (typeof seed === 'number') return seed | 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

export function rollTreasure(input: TreasureInput): TreasureRoll {
  const { seed, base, comboLevel = 0, cascadeDepth = 0, hasSpecial = false, maxBonusRatio = 1 } = input;

  // Nothing to amplify — no reward, no fake "lucky" on an empty word.
  if (base <= 0) return { tier: 'common', bonus: 0, total: base, multiplier: 1 };

  const rng = createSeededRandom(hashSeed(seed));

  // Skill bias: combo + cascade + special raise the odds (capped so it stays a
  // surprise, never a guarantee).
  const skill = comboLevel * 0.012 + cascadeDepth * 0.02 + (hasSpecial ? 0.05 : 0);
  const jackpotChance = Math.min(BASE_JACKPOT + skill, 0.3);
  const luckyChance = Math.min(BASE_LUCKY + skill * 1.5, 0.45);

  const roll = rng();
  let tier: TreasureTier;
  if (roll < jackpotChance) tier = 'jackpot';
  else if (roll < jackpotChance + luckyChance) tier = 'lucky';
  else tier = 'common';

  let bonus = 0;
  if (tier === 'lucky') {
    // 15–35% of base.
    bonus = Math.max(1, Math.round(base * (0.15 + rng() * 0.20)));
  } else if (tier === 'jackpot') {
    // 50–85% of base.
    bonus = Math.max(1, Math.round(base * (0.5 + rng() * 0.35)));
  }

  const cap = Math.floor(base * maxBonusRatio);
  bonus = Math.min(bonus, cap);

  const total = base + bonus;
  const multiplier = base > 0 ? Math.round((total / base) * 100) / 100 : 1;
  return { tier, bonus, total, multiplier };
}
