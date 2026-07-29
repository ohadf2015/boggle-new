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
  useEffect,
  useRef,
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
import { trackEduPracticeComplete, trackEduError } from '@/lib/education/telemetry';

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
  wordsFound?: string[];
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

  // Achievement tracking state — persisted to localStorage per student
  const [perfectGames, setPerfectGames] = useState<number>(0);
  const [morningPractices, setMorningPractices] = useState<number>(0);
  const modesTriedRef = useRef<Set<string>>(new Set());
  const [, setModesTriedCount] = useState<number>(1);
  const completedLessonsRef = useRef<Set<string>>(new Set());
  const [, setCompletedLessonsCount] = useState<number>(0);
  const uniqueWordsRef = useRef<Set<string>>(new Set());
  const [, setUniqueWordsCount] = useState<number>(0);
  const [practiceDaysThisMonth, setPracticeDaysThisMonth] = useState<number>(0);

  // Initialize achievement trackers from localStorage on mount
  useEffect(() => {
    try {
      const storedPerfect = localStorage.getItem(`edu_perfect_games_${studentId}`);
      if (storedPerfect) setPerfectGames(parseInt(storedPerfect, 10) || 0);

      const storedMorning = localStorage.getItem(`edu_morning_practices_${studentId}`);
      if (storedMorning) setMorningPractices(parseInt(storedMorning, 10) || 0);

      const storedLessons = localStorage.getItem(`education_completed_lessons_${studentId}`);
      if (storedLessons) {
        const parsed: string[] = JSON.parse(storedLessons);
        completedLessonsRef.current = new Set(parsed);
        setCompletedLessonsCount(completedLessonsRef.current.size);
      }

      const storedModes = localStorage.getItem(`education_modes_tried_${studentId}`);
      if (storedModes) {
        const parsed: string[] = JSON.parse(storedModes);
        modesTriedRef.current = new Set(parsed);
        setModesTriedCount(modesTriedRef.current.size || 1);
      }

      const storedWords = localStorage.getItem(`education_unique_words_${studentId}`);
      if (storedWords) {
        const parsed: string[] = JSON.parse(storedWords);
        uniqueWordsRef.current = new Set(parsed);
        setUniqueWordsCount(uniqueWordsRef.current.size);
      }

      const storedDays = localStorage.getItem(`edu_practice_days_${studentId}`);
      if (storedDays) {
        const parsed: string[] = JSON.parse(storedDays);
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
        const daysThisMonth = parsed.filter((d: string) => d.startsWith(thisMonth)).length;
        setPracticeDaysThisMonth(daysThisMonth);
      }
    } catch {
      // localStorage unavailable or corrupt — use defaults
    }
  }, [studentId]);

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

        // --- Compute real achievement metrics ---

        // wordsInGame: words found this session
        const wordsInGame = sessionData.vocabularyWordsFound?.length
          || sessionData.wordsFound?.length || 0;

        // perfectGames: increment if 100% accuracy on flashcard session
        let newPerfectGames = perfectGames;
        if (
          sessionData.type === 'flashcard' &&
          sessionData.cardsReviewed &&
          sessionData.cardsReviewed > 0 &&
          sessionData.cardsCorrect === sessionData.cardsReviewed
        ) {
          newPerfectGames = perfectGames + 1;
          setPerfectGames(newPerfectGames);
          try { localStorage.setItem(`edu_perfect_games_${studentId}`, String(newPerfectGames)); } catch { /* noop */ }
        }

        // morningPractices: before 9 AM
        let newMorningPractices = morningPractices;
        if (new Date().getHours() < 9) {
          newMorningPractices = morningPractices + 1;
          setMorningPractices(newMorningPractices);
          try { localStorage.setItem(`edu_morning_practices_${studentId}`, String(newMorningPractices)); } catch { /* noop */ }
        }

        // completedLessons: track unique lesson IDs finished (only on lesson_completion)
        if (sessionData.type === 'lesson_completion') {
          completedLessonsRef.current.add(lessonId);
          try { localStorage.setItem(`education_completed_lessons_${studentId}`, JSON.stringify([...completedLessonsRef.current])); } catch { /* noop */ }
        }
        const newCompletedLessonsCount = completedLessonsRef.current.size;
        setCompletedLessonsCount(newCompletedLessonsCount);

        // modesTried: track unique practice mode types
        modesTriedRef.current.add(sessionData.type);
        const newModesTriedCount = modesTriedRef.current.size;
        setModesTriedCount(newModesTriedCount);
        try { localStorage.setItem(`education_modes_tried_${studentId}`, JSON.stringify([...modesTriedRef.current])); } catch { /* noop */ }

        // uniqueWords: cumulative unique words across sessions
        const sessionWords = sessionData.vocabularyWordsFound || sessionData.wordsFound || [];
        for (const word of sessionWords) {
          uniqueWordsRef.current.add(word);
        }
        const newUniqueWordsCount = uniqueWordsRef.current.size;
        setUniqueWordsCount(newUniqueWordsCount);
        try { localStorage.setItem(`education_unique_words_${studentId}`, JSON.stringify([...uniqueWordsRef.current])); } catch { /* noop */ }

        // daysThisMonth: record today's practice date
        let newDaysThisMonth = practiceDaysThisMonth;
        try {
          const now = new Date();
          const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
          const storedDays: string[] = JSON.parse(localStorage.getItem(`edu_practice_days_${studentId}`) || '[]');
          if (!storedDays.includes(todayKey)) {
            storedDays.push(todayKey);
            localStorage.setItem(`edu_practice_days_${studentId}`, JSON.stringify(storedDays));
          }
          const thisMonthPrefix = `${now.getFullYear()}-${now.getMonth()}`;
          newDaysThisMonth = storedDays.filter((d: string) => d.startsWith(thisMonthPrefix)).length;
          setPracticeDaysThisMonth(newDaysThisMonth);
        } catch { /* noop */ }

        // F1: announce session completion to PostHog so we can build
        // funnels (D1/D7 return, mode mix, drop-off step) without inventing
        // events at every call site.
        trackEduPracticeComplete({
          lessonId,
          practiceType: sessionData.type,
          cardsReviewed: sessionData.cardsReviewed,
          cardsCorrect: sessionData.cardsCorrect,
        });

        // Check for achievement unlocks after XP is awarded.
        // Fields not tracked in education context use 0 (won't falsely unlock)
        // rather than hardcoded 1 which could falsely unlock achievements.
        checkForUnlocks({
          totalXp: totalXp + result.totalXp,
          wordsMastered: newWordsMastered,
          currentLevel: result.newLevel || currentLevel,
          currentStreak: streak.currentStreak,
          practiceSessions: newSessionCount,
          lessonsCompleted: newCompletedLessonsCount,
          wordsInGame,
          perfectGames: newPerfectGames,
          bossesDefeated: 0,
          combosAchieved: 0,
          morningPractices: newMorningPractices,
          daysThisMonth: newDaysThisMonth,
          weeksWith5Days: 0,
          longestStreak: streak.longestStreak || 0,
          modesTried: newModesTriedCount,
          lessonsCollected: newCompletedLessonsCount,
          classroomsJoined: 0,
          uniqueWords: newUniqueWordsCount,
        });
      } catch (error) {
        logger.error('Error completing practice session:', error);
        trackEduError({ surface: 'practice_session', code: 'complete_failed' });
      } finally {
        setIsPersisting(false);
      }
    },
    [
      awardPracticeXp,
      streak,
      currentLevel,
      totalXp,
      checkForUnlocks,
      totalPracticeSessions,
      totalWordsMastered,
      perfectGames,
      morningPractices,
      practiceDaysThisMonth,
      studentId,
      lessonId,
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
