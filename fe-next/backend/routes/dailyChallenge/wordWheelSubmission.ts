import type { Language } from '../../../types';
import {
  generateWordWheelPuzzle, isValidWordWheelWord, type WordWheelPuzzle,
} from '../../../utils/dailyChallenge/wordWheelGeneration';
import { goldLetterFor, maxWheelScore } from '../../../utils/dailyChallenge/wordWheelScoring';
import { isCatchUpDate } from '../../../utils/dailyChallenge/catchUp';

// The daily runs 120s; the finish beat and a slow submit never push a real run near this.
export const WHEEL_MAX_TIME_SECONDS = 180;
const MAX_WORDS = 400;
const MIDNIGHT_GRACE_MS = 10 * 60 * 1000;

interface SubmissionInput {
  puzzleDate: string;
  language: string;
  claimedScore: unknown;
  claimedWords: unknown;
  claimedTime: unknown;
}

export interface SanitizedWheelSubmission {
  puzzle: WordWheelPuzzle;
  goldLetter: string | null;
  wordsFound: string[];
  score: number;
  timeSeconds: number;
  longestWord: string | null;
}

export function sanitizeWheelSubmission(input: SubmissionInput): SanitizedWheelSubmission | null {
  let puzzle: WordWheelPuzzle;
  try {
    puzzle = generateWordWheelPuzzle(input.puzzleDate, input.language as Language);
  } catch {
    return null;
  }
  const goldLetter = goldLetterFor(puzzle);

  const seen = new Set<string>();
  const wordsFound: string[] = [];
  const raw = Array.isArray(input.claimedWords) ? input.claimedWords.slice(0, MAX_WORDS) : [];
  for (const w of raw) {
    if (typeof w !== 'string') continue;
    const word = w.toUpperCase();
    if (word.length < 3 || seen.has(word)) continue;
    if (!isValidWordWheelWord(word, puzzle.centerLetter, puzzle.allLetters)) continue;
    seen.add(word);
    wordsFound.push(word);
  }

  const claimed = Number(input.claimedScore);
  const ceiling = maxWheelScore(wordsFound, goldLetter, input.puzzleDate);
  const score = Math.min(ceiling, Number.isFinite(claimed) ? Math.max(0, Math.floor(claimed)) : 0);

  const time = Number(input.claimedTime);
  const timeSeconds = Number.isFinite(time) ? Math.min(WHEEL_MAX_TIME_SECONDS, Math.max(0, Math.round(time))) : 0;

  const longestWord = wordsFound.reduce<string | null>((a, b) => (!a || b.length > a.length ? b : a), null);
  return { puzzle, goldLetter, wordsFound, score, timeSeconds, longestWord };
}

/** Catch-up is a past date, except a run that started before midnight UTC and lands just after it. */
export function isWheelCatchup(serverDate: string, puzzleDate: string, clientCatchup: boolean, now: Date): boolean {
  if (!isCatchUpDate(serverDate, puzzleDate)) return false;
  if (clientCatchup) return true;
  const midnight = Date.parse(`${serverDate}T00:00:00Z`);
  const straddled = now.getTime() - midnight < MIDNIGHT_GRACE_MS;
  const yesterday = new Date(midnight - 1).toISOString().split('T')[0];
  return !(straddled && puzzleDate === yesterday);
}
