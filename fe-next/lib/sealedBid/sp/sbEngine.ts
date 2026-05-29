/**
 * Sealed Bid single-player pure engine — no IO. The page component owns the
 * dictionary check, timers, and FX; this module owns the scoring rules and the
 * round-to-round state machine, so it's deterministic and unit-testable.
 *
 * Game theory: every round shows a 7-letter rack. The player secretly "bids" a
 * word; the bot bids the OBVIOUS high-value word for that rack (curated). If the
 * player's word is UNIQUE (differs from the bot's) it scores DOUBLE; a CLASH
 * (same word) scores HALF; a pass / invalid bid scores nothing. Reward comes
 * from out-thinking the obvious pick, not just finding the longest word.
 */

/** Minimum length for a scoring bid. */
export const MIN_WORD_LEN = 3;

const LETTER_VALUES: Record<string, number> = {
  A: 1, E: 1, I: 1, O: 1, U: 1, L: 1, N: 1, S: 1, T: 1, R: 1,
  D: 2, G: 2,
  B: 3, C: 3, M: 3, P: 3,
  F: 4, H: 4, V: 4, W: 4, Y: 4,
  K: 5,
  J: 8, X: 8,
  Q: 10, Z: 10,
};

/** Scrabble letter-value sum (A–Z only, case-insensitive). */
export function letterScore(word: string): number {
  let total = 0;
  for (const ch of word.toUpperCase()) {
    total += LETTER_VALUES[ch] ?? 0;
  }
  return total;
}

/** True when `word` can be spelled using `rack`'s letters (multiset). */
export function canFormFromRack(word: string, rack: string): boolean {
  const pool: Record<string, number> = {};
  for (const ch of rack.toUpperCase()) {
    if (LETTER_VALUES[ch] !== undefined) pool[ch] = (pool[ch] ?? 0) + 1;
  }
  for (const ch of word.toUpperCase()) {
    if (LETTER_VALUES[ch] === undefined) continue; // ignore stray non-letters
    if (!pool[ch]) return false;
    pool[ch] -= 1;
  }
  return true;
}

export type BidOutcome = 'unique' | 'clash' | 'none';

export interface RoundResult {
  outcome: BidOutcome;
  /** Letter-value sum before the unique/clash multiplier. */
  basePoints: number;
  /** Points actually awarded (double for unique, half-floored for clash, 0 for none). */
  points: number;
  /** Normalized player word, or null for a pass. */
  playerWord: string | null;
  botWord: string;
}

export interface SbRound {
  /** 7-letter rack (uppercase by convention). */
  rack: string;
  /** The "obvious" word the bot bids — a clash if the player picks it too. */
  botPick: string;
}

export interface SbState {
  rounds: SbRound[];
  /** Current round index (0-based). */
  index: number;
  totalScore: number;
  phase: 'bidding' | 'revealed' | 'done';
  /** Set after commitBid; cleared on advanceRound. */
  lastResult?: RoundResult;
}

/**
 * Resolve a single bid. The page validates formable+dict before locking in, but
 * we re-check here so the engine is the source of truth (and tests don't need a
 * dictionary): a pass, a failed dict check, an unformable word, or a too-short
 * word all score NONE.
 */
export function resolveRound(
  playerWord: string | null,
  botWord: string,
  opts: { dictOk: boolean; rack: string },
): RoundResult {
  const bot = botWord.toUpperCase();
  if (!playerWord) {
    return { outcome: 'none', basePoints: 0, points: 0, playerWord: null, botWord: bot };
  }
  const word = playerWord.trim().toUpperCase();
  const valid =
    opts.dictOk && word.length >= MIN_WORD_LEN && canFormFromRack(word, opts.rack);
  if (!valid) {
    return { outcome: 'none', basePoints: 0, points: 0, playerWord: word, botWord: bot };
  }
  const basePoints = letterScore(word);
  if (word === bot) {
    return { outcome: 'clash', basePoints, points: Math.floor(basePoints / 2), playerWord: word, botWord: bot };
  }
  return { outcome: 'unique', basePoints, points: basePoints * 2, playerWord: word, botWord: bot };
}

export function initialSbState(rounds: SbRound[]): SbState {
  return { rounds, index: 0, totalScore: 0, phase: 'bidding' };
}

/** Lock in a bid (word, or null to pass) → reveal the round and bank points. */
export function commitBid(s: SbState, playerWord: string | null, dictOk: boolean): SbState {
  if (s.phase !== 'bidding') return s;
  const round = s.rounds[s.index];
  const result = resolveRound(playerWord, round.botPick, { dictOk, rack: round.rack });
  return {
    ...s,
    phase: 'revealed',
    totalScore: s.totalScore + result.points,
    lastResult: result,
  };
}

/** Advance from a revealed round to the next bid, or end the game. */
export function advanceRound(s: SbState): SbState {
  if (s.phase !== 'revealed') return s;
  const next = s.index + 1;
  if (next >= s.rounds.length) {
    return { ...s, phase: 'done', lastResult: undefined };
  }
  return { ...s, index: next, phase: 'bidding', lastResult: undefined };
}
