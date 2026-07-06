import { letterScore, canFormFromRack, BidOutcome } from './sbEngine';

/** Calculate odds multiplier for a word based on rarity (letter score) and length.
 * Formula: clamp(1.5 + word.length*0.4 + letterScore(word)*0.12, 1.5, 6), rounded to 1 decimal.
 */
export function oddsMultiplier(word: string): number {
  const len = word.length;
  const score = letterScore(word);
  const raw = 1.5 + len * 0.4 + score * 0.12;
  const clamped = Math.max(1.5, Math.min(6, raw));
  return Math.round(clamped * 10) / 10;
}

export interface Settlement {
  outcome: BidOutcome;
  stake: number;
  multiplier: number;
  delta: number;
}

export interface SettleBidArgs {
  playerWord: string | null;
  botWords: string[];
  dictOk: boolean;
  rack: string;
  stake: number;
}

/** Settle a single wager based on the player's word, bot words, and validity.
 *
 * Rules:
 * - null word (deliberate pass) → outcome 'none', delta 0
 * - word invalid (not dictOk or can't form from rack) → outcome 'none', delta -Math.min(stake, 5)
 * - word clashes with a bot word → outcome 'clash', delta -stake
 * - word is unique → outcome 'unique', delta Math.round(stake * (multiplier - 1))
 */
export function settleBid(args: SettleBidArgs): Settlement {
  const { playerWord, botWords, dictOk, rack, stake } = args;

  // Deliberate pass (null word) risks nothing
  if (playerWord === null) {
    return {
      outcome: 'none',
      stake,
      multiplier: 0,
      delta: 0,
    };
  }

  const word = playerWord.toUpperCase();
  const mult = oddsMultiplier(word);

  // Invalid word (not in dict or can't form from rack) loses small ante
  if (!dictOk || !canFormFromRack(word, rack)) {
    return {
      outcome: 'none',
      stake,
      multiplier: mult,
      delta: -Math.min(stake, 5),
    };
  }

  // Check for clash with bot words
  const botWordsUpper = botWords.map(w => w.toUpperCase());
  if (botWordsUpper.includes(word)) {
    return {
      outcome: 'clash',
      stake,
      multiplier: mult,
      delta: -stake,
    };
  }

  // Unique word pays stake * (multiplier - 1)
  return {
    outcome: 'unique',
    stake,
    multiplier: mult,
    delta: Math.round(stake * (mult - 1)),
  };
}
