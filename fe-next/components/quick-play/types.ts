/**
 * Quick Play shared client types. Server-side counterparts live in
 * backend/modules/quickPlayRound.ts / quickPlaySubmit.ts — keep in sync.
 */
export type QuickMode = 'classic' | 'blast' | 'word-hunt' | 'wheel-rush';

export const QUICK_MODES: QuickMode[] = ['classic', 'blast', 'word-hunt', 'wheel-rush'];

export interface QuickWheelPuzzle {
  centerLetter: string;
  outerLetters: string[];
  allLetters: string[];
  puzzleDate: string;
  language: string;
  puzzleNumber: number;
}

export interface QuickRoundConfig {
  mode: QuickMode;
  seed: string;
  language: string;
  durationSec: number;
  grid: string[][];
  wheel?: QuickWheelPuzzle;
  /** Present only for wheel-rush (client-side validation needs it); stripped for grid modes */
  words?: string[];
  /** Seeded target word for word-hunt only */
  targetWord?: string;
  totalWords: number;
  perfectScore: number;
}

export interface QuickRoundResult {
  mode: QuickMode;
  seed: string;
  score: number;
  perfectScore: number;
  /** score/perfectScore as 0-100, capped at 100 */
  scorePct: number;
  wordsFound: number;
  totalWords: number;
  durationMs: number;
}

export interface QuickSubmitOutcome {
  scorePct: number;
  coins: number;
  xp: number;
  percentileToday: number;
  history: number[];
  /** All-time Quick Rank points (sum of score_pct) */
  totalPoints: number;
}
