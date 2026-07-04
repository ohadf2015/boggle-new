import type { TreasureTier } from './blastTreasureRoll';

export interface GemDropInput {
  /** Length of the submitted word. */
  wordLength: number;
  /** Word used a high-value "gem letter" (see gemLetters.ts). */
  hasGemLetter?: boolean;
  /** Treasure roll tier for this word (jackpot = big gem bonus). */
  treasureTier?: TreasureTier;
  /** Number of special-tile combos detected in the word. */
  comboLevel?: number;
}

/** Long-word threshold that earns a gem. */
const LONG_WORD_LEN = 7;
/** Hard cap so a single word can't flood the wallet. */
const MAX_GEMS_PER_WORD = 5;

/**
 * Decide how many premium GEMS a submitted word drops. Pure + deterministic —
 * gems are meant to feel RARE (a typical word drops 0), so they only fall from
 * genuinely notable moments: gem-letter words, long words, jackpot rolls, combos.
 *
 * Deterministic (no RNG) so the same word+context always yields the same drop —
 * safe to run on client and reconcile on server without divergence.
 */
export function rollGemDrop({
  wordLength,
  hasGemLetter = false,
  treasureTier,
  comboLevel = 0,
}: GemDropInput): number {
  let gems = 0;
  if (hasGemLetter) gems += 1;
  if (wordLength >= LONG_WORD_LEN) gems += 1;
  if (treasureTier === 'jackpot') gems += 2;
  if (comboLevel >= 1) gems += 1;
  return Math.min(MAX_GEMS_PER_WORD, Math.max(0, Math.floor(gems)));
}
