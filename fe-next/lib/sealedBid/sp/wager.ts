import { letterScore, canFormFromRack, BidOutcome } from './sbEngine';

/**
 * Compute the odds multiplier for a word based on its length and rarity (letter score).
 * Bounded [1.5, 6], roughly monotonic in length and letter score.
 * Rounded to 1 decimal place.
 */
export function oddsMultiplier(word: string): number {
  const length = word.length;
  const score = letterScore(word);
  const raw = 1.5 + length * 0.4 + score * 0.12;
  const clamped = Math.max(1.5, Math.min(6, raw));
  return Math.round(clamped * 10) / 10;
}

export interface Settlement {
  outcome: BidOutcome;
  stake: number;
  multiplier: number;
  delta: number;
}

/**
 * Settle a single bid. Determines outcome (unique/clash/none) and chip delta.
 *
 * Rules:
 * - null word (deliberate pass) → none, delta 0
 * - Invalid word (not in dict or not formable) → none, delta -min(stake, 5)
 * - Valid word matching a bot pick → clash, delta -stake
 * - Valid unique word → unique, delta +round(stake*(mult-1))
 */
export function settleBid(args: {
  playerWord: string | null;
  botWords: string[];
  dictOk: boolean;
  rack: string;
  stake: number;
}): Settlement {
  const { playerWord, botWords, dictOk, rack, stake } = args;

  // Deliberate pass (null word) → no risk
  if (playerWord === null) {
    return {
      outcome: 'none',
      stake,
      multiplier: 0,
      delta: 0,
    };
  }

  const word = playerWord.toUpperCase();

  // Invalid word (failed dict check or not formable from rack)
  if (!dictOk || !canFormFromRack(word, rack)) {
    return {
      outcome: 'none',
      stake,
      multiplier: 0,
      delta: -Math.min(stake, 5),
    };
  }

  // Valid word: check for clash against bot picks
  const botWordsUpper = botWords.map((w) => w.toUpperCase());
  const mult = oddsMultiplier(word);

  if (botWordsUpper.includes(word)) {
    // Clash: loses entire stake
    return {
      outcome: 'clash',
      stake,
      multiplier: mult,
      delta: -stake,
    };
  }

  // Unique: wins stake * (multiplier - 1)
  const delta = Math.round(stake * (mult - 1));
  return {
    outcome: 'unique',
    stake,
    multiplier: mult,
    delta,
  };
}
