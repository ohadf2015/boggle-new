'use client';

/**
 * PracticeSessionProvider - XP Context for Practice Activities
 *
 * Wraps practice components (FlashcardReview, SoloPracticeBoard) with XP state.
 * Handles:
 * - XP state from useEducationXp hook
 * - Session-specific tracking (XP earned this session)
 * - Level up modal state
 * - Achievement unlock detection
 * - Supabase persistence on session completion
 *
 * Design: Mastery-focused (research pitfall 1 - intrinsic > extrinsic)
 */

import {
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
import useAchievementUnlock from '@/hooks/useAchievementUnlock';
import { UnifiedAchievementModal } from '@/components/achievements/UnifiedAchievementModal';
// supabase import removed — XP persistence handled server-side only
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
  type: 'flashcard' | 'solo_board' | 'lesson_completion' | 'matching' | 'spelling' | 'blitz';
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

  // Achievement unlock detection
  const { currentUnlock, acknowledgeUnlock, checkForUnlocks } = useAchievementUnlock({
    studentId,
    enabled: true,
  });

  // Session-specific state
  const [sessionXpEarned, setSessionXpEarned] = useState<number>(0);
  const [sessionMasteryMessage, setSessionMasteryMessage] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<LevelUpPayload | null>(null);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [totalPracticeSessions, setTotalPracticeSessions] = useState<number>(0);
  const [totalWordsMastered, setTotalWordsMastered] = useState<number>(0);

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

        // XP persistence is handled server-side by PATCH /api/education/practice
        // Do NOT call persistToSupabase() here — it bypasses server validation (C2 fix)

        // Increment session counter
        const newSessionCount = totalPracticeSessions + 1;
        setTotalPracticeSessions(newSessionCount);

        // Track total words mastered (estimate from flashcard correct answers)
        let newWordsMastered = totalWordsMastered;
        if (sessionData.type === 'flashcard' && sessionData.cardsCorrect) {
          newWordsMastered = totalWordsMastered + sessionData.cardsCorrect;
          setTotalWordsMastered(newWordsMastered);
        }

        // Check for achievement unlocks after XP is awarded
        checkForUnlocks({
          totalXp: totalXp + result.totalXp,
          wordsMastered: newWordsMastered,
          currentLevel: result.newLevel || currentLevel,
          currentStreak: streak.currentStreak,
          practiceSessions: newSessionCount,
          // Fields not tracked yet - default to 0
          lessonsCompleted: 1, // At least 1 if practicing
          wordsInGame: 0,
          perfectGames: 0,
          bossesDefeated: 0,
          combosAchieved: 0,
          morningPractices: 0,
          daysThisMonth: 0,
          weeksWith5Days: 0,
          longestStreak: streak.longestStreak || 0,
          modesTried: 1, // At least 1 mode
          lessonsCollected: 1,
          classroomsJoined: 1, // Assume 1 if in classroom
          uniqueWords: 0,
        });
      } catch (error) {
        logger.error('Error completing practice session:', error);
      } finally {
        setIsPersisting(false);
      }
    },
    [
      awardPracticeXp,
      streak,
      currentLevel,
      totalXp,
      studentId,
      lessonId,
      checkForUnlocks,
      totalPracticeSessions,
      totalWordsMastered,
    ]
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

      {/* Achievement unlock celebration modal */}
      {currentUnlock && (
        <UnifiedAchievementModal
          type="education"
          unlock={currentUnlock}
          onClose={acknowledgeUnlock}
        />
      )}
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
// persistToSupabase removed (C2 fix) — all XP persistence goes through
// PATCH /api/education/practice which uses server-side award_education_xp RPC

// ============================================
// EXPORTS
// ============================================

export default PracticeSessionProvider;
