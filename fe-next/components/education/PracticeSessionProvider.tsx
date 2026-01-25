'use client';

/**
 * PracticeSessionProvider - XP Context for Practice Activities
 *
 * Wraps practice components (FlashcardReview, SoloPracticeBoard) with XP state.
 * Handles:
 * - XP state from useEducationXp hook
 * - Session-specific tracking (XP earned this session)
 * - Level up modal state
 * - Supabase persistence on session completion
 *
 * Design: Mastery-focused (research pitfall 1 - intrinsic > extrinsic)
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import useEducationXp, {
  type XpProgress,
  type DailyStreak,
} from '@/hooks/useEducationXp';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface LevelUpPayload {
  /** Previous level before the level-up */
  oldLevel: number;
  /** New level after the level-up */
  newLevel: number;
  /** Titles unlocked at this level (if any) */
  newTitles: string[];
}

export interface CompletePracticeSessionData {
  type: 'flashcard' | 'solo_board' | 'lesson_completion';
  cardsReviewed?: number;
  cardsCorrect?: number;
  vocabularyWordsFound?: string[];
  newWordsFound?: string[];
  masteryLevel?: 'not_started' | 'started' | 'practicing' | 'mastered';
}

export interface PracticeSessionContextValue {
  // XP State (from useEducationXp)
  totalXp: number;
  currentLevel: number;
  xpProgress: XpProgress;
  streak: DailyStreak;

  // Session tracking
  sessionXpEarned: number;
  sessionMasteryMessage: string | null;

  // Actions
  completePracticeSession: (sessionData: CompletePracticeSessionData) => Promise<void>;

  // Level up state
  levelUpData: LevelUpPayload | null;
  dismissLevelUp: () => void;

  // Loading state
  isLoading: boolean;
}

export interface PracticeSessionProviderProps {
  children: ReactNode;
  studentId: string;
  lessonId: string;
  initialXp?: number;
  initialLevel?: number;
  initialStreak?: number;
}

// ============================================
// CONTEXT
// ============================================

const PracticeSessionContext = createContext<PracticeSessionContextValue | null>(null);

// ============================================
// PROVIDER COMPONENT
// ============================================

export function PracticeSessionProvider({
  children,
  studentId,
  lessonId,
  initialXp,
  initialLevel,
  initialStreak,
}: PracticeSessionProviderProps) {
  // Core XP state from hook
  const {
    totalXp,
    currentLevel,
    xpProgress,
    streak,
    awardPracticeXp,
    isLoading: xpLoading,
  } = useEducationXp({
    studentId,
    lessonId,
    initialXp,
    initialLevel,
    initialStreak,
  });

  // Session-specific state
  const [sessionXpEarned, setSessionXpEarned] = useState<number>(0);
  const [sessionMasteryMessage, setSessionMasteryMessage] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpPayload | null>(null);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);

  /**
   * Complete a practice session and award XP
   * Handles XP calculation, level up detection, and database persistence
   */
  const completePracticeSession = useCallback(
    async (sessionData: CompletePracticeSessionData) => {
      setIsPersisting(true);

      try {
        // Build session data for XP calculation
        const xpSessionData: Record<string, unknown> = {};

        if (sessionData.type === 'flashcard') {
          xpSessionData.cardsReviewed = sessionData.cardsReviewed;
          xpSessionData.cardsCorrect = sessionData.cardsCorrect;
        } else if (sessionData.type === 'solo_board') {
          xpSessionData.vocabularyWordsFound = sessionData.vocabularyWordsFound;
          xpSessionData.newWordsFound = sessionData.newWordsFound;
        } else if (sessionData.type === 'lesson_completion') {
          xpSessionData.masteryLevel = sessionData.masteryLevel;
        }

        // Award XP via hook
        const result = await awardPracticeXp({
          type: sessionData.type,
          sessionData: xpSessionData as Parameters<typeof awardPracticeXp>[0]['sessionData'],
          streakDays: streak.currentStreak,
        });

        // Update session state
        setSessionXpEarned(result.totalXp);
        setSessionMasteryMessage(result.masteryMessage);

        // Check for level up
        if (result.leveledUp && result.newLevel) {
          setLevelUpData({
            oldLevel: currentLevel,
            newLevel: result.newLevel,
            newTitles: result.newTitles || [],
          });
        }

        // Persist to Supabase
        await persistToSupabase(
          studentId,
          lessonId,
          totalXp + result.totalXp,
          streak.currentStreak,
          Math.max(streak.longestStreak, streak.currentStreak)
        );
      } catch (error) {
        logger.error('Error completing practice session:', error);
      } finally {
        setIsPersisting(false);
      }
    },
    [awardPracticeXp, streak, currentLevel, totalXp, studentId, lessonId]
  );

  /**
   * Dismiss level up celebration modal
   */
  const dismissLevelUp = useCallback(() => {
    setLevelUpData(null);
  }, []);

  // Context value
  const value = useMemo<PracticeSessionContextValue>(
    () => ({
      // XP State
      totalXp,
      currentLevel,
      xpProgress,
      streak,

      // Session tracking
      sessionXpEarned,
      sessionMasteryMessage,

      // Actions
      completePracticeSession,

      // Level up state
      levelUpData,
      dismissLevelUp,

      // Loading state
      isLoading: xpLoading || isPersisting,
    }),
    [
      totalXp,
      currentLevel,
      xpProgress,
      streak,
      sessionXpEarned,
      sessionMasteryMessage,
      completePracticeSession,
      levelUpData,
      dismissLevelUp,
      xpLoading,
      isPersisting,
    ]
  );

  return (
    <PracticeSessionContext.Provider value={value}>
      {children}
    </PracticeSessionContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Access the practice session context
 * Must be used within a PracticeSessionProvider
 */
export function usePracticeSession(): PracticeSessionContextValue {
  const context = useContext(PracticeSessionContext);

  if (!context) {
    throw new Error(
      'usePracticeSession must be used within a PracticeSessionProvider'
    );
  }

  return context;
}

// ============================================
// PERSISTENCE HELPER
// ============================================

/**
 * Persist XP and streak to Supabase
 * Uses upsert to handle both new and existing records
 */
async function persistToSupabase(
  studentId: string,
  lessonId: string,
  newTotalXp: number,
  currentStreak: number,
  longestStreak: number
): Promise<void> {
  if (!supabase) {
    logger.warn('Supabase not configured, skipping XP persistence');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('student_lesson_progress').upsert(
      {
        student_id: studentId,
        lesson_id: lessonId,
        total_xp: newTotalXp,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_practice_date: today,
        // total_practice_sessions incremented via DB trigger or RPC
      },
      {
        onConflict: 'student_id,lesson_id',
      }
    );

    if (error) {
      logger.error('Error persisting XP to Supabase:', error);
    }
  } catch (error) {
    logger.error('Error in persistToSupabase:', error);
  }
}

// ============================================
// EXPORTS
// ============================================

export default PracticeSessionProvider;
