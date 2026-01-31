/**
 * Education XP Manager
 * Handles XP calculation for education practice activities
 *
 * Design: Mastery-focused XP rewards (not speed/volume)
 * - Flashcard sessions: accuracy bonuses encourage learning
 * - Solo board: vocabulary word discovery rewards
 * - Lesson completion: mastery bonus for full completion
 * - Streak multipliers: consecutive day bonuses
 *
 * IMPORTANT: Mastery messages appear BEFORE XP amounts (research pitfall 1)
 */

import { getXpProgress, getLevelFromXp } from './xpManager';

// Re-export existing XP utilities for convenience
export { getXpProgress, getLevelFromXp };

// ============================================
// XP CONFIGURATION
// ============================================

export const EDUCATION_XP_CONFIG = {
  // Flashcard XP (accuracy-based, encourages mastery)
  FLASHCARD_CORRECT: 10, // Base XP per correct card
  FLASHCARD_ACCURACY_BONUS: {
    90: 50, // 90%+ accuracy: 50 XP bonus
    80: 30, // 80-89%: 30 XP bonus
    70: 10, // 70-79%: 10 XP bonus
  } as Record<number, number>,
  FLASHCARD_PERFECT_SESSION: 100, // All cards correct (mastery)

  // Solo Board XP (vocabulary-focused)
  VOCABULARY_WORD_FOUND: 15, // XP per vocabulary word found
  BOARD_COMPLETION: 50, // Base XP for completing session
  NEW_WORD_BONUS: 25, // First time finding a vocabulary word

  // Lesson Completion XP
  LESSON_COMPLETED: 200, // Completing entire lesson
  LESSON_MASTERY_BONUS: 100, // 80%+ mastery (from calculate_lesson_mastery())

  // Streak Bonuses (loss aversion)
  DAILY_PRACTICE_BASE: 20, // XP for practicing any day
  STREAK_MULTIPLIERS: {
    7: 1.5, // 1 week: +50% XP
    14: 1.75, // 2 weeks: +75% XP
    30: 2.0, // 1 month: +100% XP (double XP)
  } as Record<number, number>,
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PracticeSessionXp {
  type: 'flashcard' | 'solo_board' | 'lesson_completion';
  sessionData: {
    // Flashcard specific
    cardsReviewed?: number;
    cardsCorrect?: number;

    // Board specific
    vocabularyWordsFound?: string[];
    newWordsFound?: string[];

    // Lesson specific
    masteryLevel?: 'not_started' | 'started' | 'practicing' | 'mastered';
  };
  streakDays?: number;
}

export interface PracticeXpResult {
  totalXp: number;
  breakdown: Record<string, number>;
  masteryMessage: string;
}

// ============================================
// XP CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate XP for education practice activities
 * Emphasizes mastery over speed/volume
 *
 * @param session - Practice session data
 * @returns Total XP, breakdown, and mastery-focused message
 */
export function calculatePracticeXp(session: PracticeSessionXp): PracticeXpResult {
  const breakdown: Record<string, number> = {};
  let totalXp = 0;

  // Base daily practice XP (builds streaks)
  breakdown.dailyPractice = EDUCATION_XP_CONFIG.DAILY_PRACTICE_BASE;
  totalXp += breakdown.dailyPractice;

  // Type-specific XP
  if (session.type === 'flashcard') {
    totalXp += calculateFlashcardXp(session.sessionData, breakdown);
  } else if (session.type === 'solo_board') {
    totalXp += calculateBoardXp(session.sessionData, breakdown);
  } else if (session.type === 'lesson_completion') {
    totalXp += calculateLessonXp(session.sessionData, breakdown);
  }

  // Streak multiplier (loss aversion - encourage consecutive days)
  if (session.streakDays && session.streakDays >= 7) {
    const streakBonus = calculateStreakBonus(totalXp, session.streakDays);
    if (streakBonus > 0) {
      breakdown.streakBonus = streakBonus;
      totalXp += streakBonus;
    }
  }

  // Mastery-focused message (CRITICAL: not just points)
  const masteryMessage = getMasteryMessage(session);

  return { totalXp, breakdown, masteryMessage };
}

/**
 * Calculate flashcard session XP
 */
function calculateFlashcardXp(
  sessionData: PracticeSessionXp['sessionData'],
  breakdown: Record<string, number>
): number {
  const { cardsReviewed = 0, cardsCorrect = 0 } = sessionData;
  let xp = 0;

  // Base flashcard XP
  breakdown.flashcardCorrect = cardsCorrect * EDUCATION_XP_CONFIG.FLASHCARD_CORRECT;
  xp += breakdown.flashcardCorrect;

  // Accuracy bonus (encourages mastery)
  if (cardsReviewed > 0) {
    const accuracy = (cardsCorrect / cardsReviewed) * 100;

    // Check accuracy thresholds in descending order
    const thresholds = Object.entries(EDUCATION_XP_CONFIG.FLASHCARD_ACCURACY_BONUS)
      .map(([threshold, bonus]) => ({ threshold: parseInt(threshold), bonus }))
      .sort((a, b) => b.threshold - a.threshold);

    for (const { threshold, bonus } of thresholds) {
      if (accuracy >= threshold) {
        breakdown.accuracyBonus = bonus;
        xp += bonus;
        break;
      }
    }

    // Perfect session bonus
    if (cardsReviewed > 0 && cardsCorrect === cardsReviewed) {
      breakdown.perfectSession = EDUCATION_XP_CONFIG.FLASHCARD_PERFECT_SESSION;
      xp += breakdown.perfectSession;
    }
  }

  return xp;
}

/**
 * Calculate solo board session XP
 */
function calculateBoardXp(
  sessionData: PracticeSessionXp['sessionData'],
  breakdown: Record<string, number>
): number {
  const { vocabularyWordsFound = [], newWordsFound = [] } = sessionData;
  let xp = 0;

  // Vocabulary word XP
  breakdown.vocabularyWords = vocabularyWordsFound.length * EDUCATION_XP_CONFIG.VOCABULARY_WORD_FOUND;
  xp += breakdown.vocabularyWords;

  // New word discovery bonus (mastery focus)
  if (newWordsFound.length > 0) {
    breakdown.newWords = newWordsFound.length * EDUCATION_XP_CONFIG.NEW_WORD_BONUS;
    xp += breakdown.newWords;
  }

  // Board completion
  breakdown.boardCompletion = EDUCATION_XP_CONFIG.BOARD_COMPLETION;
  xp += breakdown.boardCompletion;

  return xp;
}

/**
 * Calculate lesson completion XP
 */
function calculateLessonXp(
  sessionData: PracticeSessionXp['sessionData'],
  breakdown: Record<string, number>
): number {
  let xp = 0;

  // Lesson completion base
  breakdown.lessonCompleted = EDUCATION_XP_CONFIG.LESSON_COMPLETED;
  xp += breakdown.lessonCompleted;

  // Mastery bonus (from Supabase calculate_lesson_mastery function)
  if (sessionData.masteryLevel === 'mastered') {
    breakdown.masteryBonus = EDUCATION_XP_CONFIG.LESSON_MASTERY_BONUS;
    xp += breakdown.masteryBonus;
  }

  return xp;
}

/**
 * Calculate streak bonus XP
 * Uses Math.round to avoid floating point issues (learned from 15-01)
 */
function calculateStreakBonus(baseXp: number, streakDays: number): number {
  // Find highest applicable multiplier
  const thresholds = Object.entries(EDUCATION_XP_CONFIG.STREAK_MULTIPLIERS)
    .map(([threshold, multiplier]) => ({ threshold: parseInt(threshold), multiplier }))
    .sort((a, b) => b.threshold - a.threshold);

  for (const { threshold, multiplier } of thresholds) {
    if (streakDays >= threshold) {
      // Use Math.round to handle floating point precision
      return Math.round(baseXp * (multiplier - 1));
    }
  }

  return 0;
}

// ============================================
// MASTERY MESSAGE GENERATION
// ============================================

/**
 * Generate mastery-focused message (avoid pure points)
 * CRITICAL: Messages emphasize WHAT was learned, not HOW MANY POINTS
 *
 * @param session - Practice session data
 * @returns Mastery-focused message string
 */
export function getMasteryMessage(session: PracticeSessionXp): string {
  if (session.type === 'flashcard') {
    const { cardsCorrect = 0, cardsReviewed = 0 } = session.sessionData;
    return cardsCorrect === cardsReviewed && cardsReviewed > 0
      ? `Perfect! You mastered all ${cardsCorrect} words!`
      : `You learned ${cardsCorrect} words!`;
  } else if (session.type === 'solo_board') {
    const newWords = session.sessionData.newWordsFound?.length || 0;
    return newWords > 0
      ? `You discovered ${newWords} new vocabulary words!`
      : 'Great practice! Keep finding those words!';
  } else {
    return session.sessionData.masteryLevel === 'mastered'
      ? 'Lesson mastered! You know these words!'
      : 'Nice work! Keep practicing to master this lesson.';
  }
}

