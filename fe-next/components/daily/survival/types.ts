/**
 * Daily Word Hunt Survival Mode Types
 */

import type { LetterGrid, Language } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';

/**
 * Props for the main DailyWordHuntSurvival component
 */
export interface DailyWordHuntSurvivalProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult) => void;
  onQuit: () => void;
}

/**
 * Represents a discovered word during gameplay
 */
export interface WordDiscovery {
  word: string;
  timestamp: number;
  lifeGained: number;
  tokensGained: number;
}

/**
 * Represents an attempt at guessing the target word
 */
export interface TargetAttempt {
  word: string;
  feedback: LetterFeedback[];
  timestamp: number;
}

/**
 * Result of a survival mode game
 */
export interface SurvivalGameResult {
  solved: boolean;
  attemptsUsed: number;
  targetWord: string;
  attempts: TargetAttempt[];
  wordsDiscovered: WordDiscovery[];
  lifeRemaining: number;
  clueTokensEarned: number;
  clueTokensSpent: number;
  hintsUnlocked: number;
  efficiencyScore: number;
}

/**
 * Clue state for hint boxes
 */
export interface AccumulatedClue {
  letter: string;
  type: 'green' | 'yellow';
}
