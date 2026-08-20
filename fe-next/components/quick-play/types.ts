/**
 * Quick Play shared client types. Server-side counterparts live in
 * backend/modules/quickPlayRound.ts / quickPlaySubmit.ts — keep in sync.
 */
import type { QuickGhostRival } from '@/lib/quickPlay/ghostRivals';

export type { QuickGhostRival };

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
  /**
   * Real players' recent results on this mode, paced across the round clock so
   * a solo round reads as a live race. Empty when nobody has played the mode
   * yet, or when the lookup failed — the round still runs.
   */
  ghosts?: QuickGhostRival[];
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
  /** word-hunt only: the seeded mystery word and whether the player found it */
  targetWord?: string;
  targetWordFound?: boolean;
  /** Words found in this round, with their per-word scores */
  words?: Array<{ word: string; score: number }>;
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
