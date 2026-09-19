/**
 * Adventure run scoring — the ONE formula both client HUD and server use.
 * No combo/time bonuses: the server can only trust the word list, so the
 * client shows exactly what the server will credit.
 */
import { calculateWordScore } from '@/shared/utils/scoring';
import { isWordOnBoard } from '@/utils/clientWordValidator';

const MAX_WORDS = 300;

export function wordPoints(word: string): number {
  return calculateWordScore(word);
}

export interface ScoreRunInput {
  grid: string[][];
  words: string[];
  language: string;
  minLength: number;
  isWord: (word: string) => boolean;
  /** Test seam; defaults to wordPoints. */
  pointsFor?: (word: string) => number;
}

export function scoreRun({ grid, words, language, minLength, isWord, pointsFor = wordPoints }: ScoreRunInput) {
  const board = grid.map((row) => row.map((c) => c.toLowerCase()));
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const raw of words.slice(0, MAX_WORDS * 4)) {
    if (typeof raw !== 'string') continue;
    const w = raw.toLowerCase().trim();
    if (w.length < minLength || w.length > 16 || seen.has(w)) continue;
    seen.add(w);
    if (!isWordOnBoard(w, board, language) || !isWord(w)) continue;
    valid.push(w);
    if (valid.length >= MAX_WORDS) break;
  }
  const score = valid.reduce((sum, w) => sum + pointsFor(w), 0);
  return { valid, score };
}
