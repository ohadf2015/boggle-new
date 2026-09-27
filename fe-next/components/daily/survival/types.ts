/**
 * Daily Word Hunt Survival Mode Types
 */

import type { LetterGrid, Language } from '@/types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import type { WordHuntRescueMethod } from '../analytics/wordHuntCompletePayload';

/**
 * Props for the main DailyWordHuntSurvival component
 */
export interface DailyWordHuntSurvivalProps {
  grid: LetterGrid;
  puzzleNumber: number;
  language: Language;
  targetWord: string;
  onComplete: (result: SurvivalGameResult, rescueMethod?: WordHuntRescueMethod) => void;
  onQuit: () => void;
  /** Puzzle date string for desktop leaderboard sidebar (e.g. '2026-02-07') */
  puzzleDate?: string;
  /** Authenticated player ID for highlighting in leaderboard */
  currentPlayerId?: string | null;
  /** Guest fingerprint for highlighting in leaderboard */
  currentGuestFingerprint?: string | null;
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
  /**
   * If true, this is a "discovery feedback" from a different-length word.
   * Discovery attempts don't count toward the "tries left" counter and
   * don't apply the wrong-guess penalty (they have their own discovery rewards/penalties).
   */
  isDiscovery?: boolean;
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

/**
 * Score event for tracking score changes
 */
export interface ScoreEvent {
  timestamp: number;
  delta: number;
  reason: 'word_discovered' | 'life_bonus' | 'target_attempt' | 'initial';
  metadata?: Record<string, unknown>;
}

/**
 * Auto-clue notification data
 */
export interface AutoClueNotificationData {
  id: string;
  clueType: 'reveal_letter' | 'reveal_category' | 'example_sentence';
  timestamp: number;
}
