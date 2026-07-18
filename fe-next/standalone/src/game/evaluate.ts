/**
 * Pure "should this submitted word be accepted, and for how many points" rule.
 * Kept separate from the React hook so the accept/reject/scoring logic is unit
 * testable without a DOM or timers.
 */
import { isWordOnBoard, type LetterGrid } from '../core/validate';
import { isRealWord } from '../core/dict';
import { calculateWordScore } from '../core/scoring';

export const MIN_WORD_LEN = 3;

export type Rejection = 'short' | 'duplicate' | 'not-a-path' | 'not-a-word';

export interface EvalResult {
  accepted: boolean;
  score: number;
  reason?: Rejection;
}

export interface EvalContext {
  board: LetterGrid;
  positionsMap: Map<string, [number, number][]>;
  dict: Set<string>;
  found: Set<string>; // lowercased words already scored
  comboLevel: number; // consecutive accepted words BEFORE this one
}

export function evaluateWord(word: string, ctx: EvalContext): EvalResult {
  const w = word.trim().toLowerCase();
  if (w.length < MIN_WORD_LEN) return { accepted: false, score: 0, reason: 'short' };
  if (ctx.found.has(w)) return { accepted: false, score: 0, reason: 'duplicate' };
  if (!isWordOnBoard(word, ctx.board, ctx.positionsMap)) {
    return { accepted: false, score: 0, reason: 'not-a-path' };
  }
  if (!isRealWord(ctx.dict, w)) return { accepted: false, score: 0, reason: 'not-a-word' };
  const score = calculateWordScore(w, ctx.comboLevel);
  return { accepted: true, score };
}
