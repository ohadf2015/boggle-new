/**
 * Daily Challenge Types
 *
 * All interfaces and types for daily challenge functionality
 */

import type { Language, LetterGrid } from '@/types';
import type { LetterFeedback } from '../wordHuntFeedback';

// ==========================================
// Puzzle Types
// ==========================================

/**
 * Result of word-first grid generation
 * Contains both the grid AND the guaranteed target word
 */
export interface DailyPuzzle {
  grid: LetterGrid;
  targetWord: string;
  puzzleDate: string;
  language: Language;
  puzzleNumber: number;
  meaning?: string | null;
}

/**
 * Data returned from the database for a daily puzzle
 */
export interface DailyPuzzleData {
  targetWord: string;
  grid: LetterGrid | null;
  gridGeneratedAt: string | null;
}

/**
 * Interface for daily target word result
 */
export interface DailyTargetWord {
  word: string;
  puzzleDate: string;
  language: Language;
  puzzleNumber: number;
}

// ==========================================
// Result Types
// ==========================================

/**
 * Result for Word Hunt daily challenge
 * Replaces the old scoring-based DailyChallengeResult
 */
export interface WordHuntResult {
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;

  /** True when this was a catch-up play of a past daily (last-3-days window).
   *  Persisted so a queued/offline submission keeps the flag. */
  isCatchup?: boolean;

  // Game outcome
  solved: boolean;                // Did player find the target word?
  attemptsUsed: number;          // 1-10 attempts
  targetWord: string;            // The word they were hunting for
  meaning?: string | null;        // Short definition of the target word

  // Attempt history
  attempts: Array<{
    word: string;
    feedback: LetterFeedback[];
    timestamp: number;
  }>;

  // Survival mode fields (optional for backward compatibility)
  wordsDiscovered?: Array<{
    word: string;
    timestamp: number;
    lifeGained: number;
    tokensGained: number;
  }>;
  lifeRemaining?: number;
  clueTokensEarned?: number;
  clueTokensSpent?: number;
  hintsUnlocked?: number;
  efficiencyScore?: number;

  // Retry tracking
  extraTries?: number;          // Number of coin-paid retries (penalty: -150 each)

  // Metadata
  streakDays: number;
  completedAt: string;
}

/**
 * Result for Word Wheel daily challenge
 */
export interface WordWheelResult {
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  centerLetter: string;
  wordsFound: string[];
  totalPossible: number;
  score: number;
  timeSeconds: number;
  streakDays: number;
  completedAt: string;
}

/**
 * Stored Word Wheel result interface
 */
export interface StoredWordWheelResult {
  date: string;
  puzzleNumber: number;
  result: WordWheelResult;
  completedAt: string;
  submittedToServer?: boolean;
}

// Legacy interface for backward compatibility
export interface DailyChallengeResult {
  puzzleNumber: number;
  puzzleDate: string;
  score: number;
  wordCount: number;
  wordsByLength: Record<number, number>; // { 3: 2, 4: 5, ... }
  timeSeconds: number;
  streakDays: number;
  language: Language;
}

// ==========================================
// Storage Types
// ==========================================

// Legacy stored result interface
export interface StoredDailyResult {
  date: string;
  puzzleNumber: number;
  result: DailyChallengeResult;
  completedAt: string;
}

// New Word Hunt stored result interface
export interface StoredWordHuntResult {
  date: string;
  puzzleNumber: number;
  result: WordHuntResult;
  completedAt: string;
  /** Whether this result has been successfully submitted to the server */
  submittedToServer?: boolean;
}

export interface DailyStreak {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null;
  totalDailiesCompleted: number;
}

// ==========================================
// Guest Player Types
// ==========================================

export interface GuestDailyPlayer {
  displayName: string;
  avatarEmoji: string;
  avatarColor: string;
}

// ==========================================
// Conversion Types
// ==========================================

/**
 * Conversion trigger types for daily challenge signup prompts
 */
export type ConversionTrigger =
  | 'firstCompletion'   // First time completing a daily challenge
  | 'streakAtRisk'      // Streak of 3+ days (loss aversion)
  | 'topPercentile'     // Scored in top 10%
  | 'quickSolve';       // Solved in 3 or fewer attempts

/**
 * Pending result structure for auto-save after OAuth
 */
export interface PendingDailyResult {
  result: WordHuntResult;
  puzzleNumber: number;
  puzzleDate: string;
  language: Language;
  trigger?: ConversionTrigger; // What prompted the signup (for onboarding UX)
  savedAt: number;
}

/**
 * Winner onboarding data stored after signup with pending result
 */
export interface WinnerOnboardingData {
  needsOnboarding: boolean;
  trigger: ConversionTrigger;
  initialName: string;
  initialAvatarId: string;
  savedAt: number;
}

// ==========================================
// Translation Types
// ==========================================

/**
 * Translation function type for share messages
 */
export type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * Translation function type for share messages (simplified)
 */
export type ShareTranslationFn = (key: string) => string;
