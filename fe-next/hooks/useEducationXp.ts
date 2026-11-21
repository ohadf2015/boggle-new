'use client';

/**
 * useEducationXp Hook
 *
 * Manages XP state for education practice activities.
 * Integrates with:
 * - calculatePracticeXp from educationXpManager (XP calculation)
 * - the lesson practice streak the server returns (never the Daily Challenge streak)
 * - xpManager (level progression)
 *
 * Design: Mastery-focused (research pitfall 1 - intrinsic > extrinsic)
 *
 * NOTE: Database persistence is NOT wired here.
 *       Use pendingUpdate for external persistence (wired in Plan 05).
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  calculatePracticeXp,
  EDUCATION_XP_CONFIG,
  type PracticeSessionXp,
  type PracticeXpResult,
} from '@/backend/modules/educationXpManager';
import {
  getXpProgress,
  getLevelFromXp,
  checkLevelUp,
  type XpProgress,
  type LevelUpResult,
} from '@/backend/modules/xpManager';
import type { PracticeStreak } from '@/lib/education/practiceStreak';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UseEducationXpOptions {
  /** Student identifier for tracking */
  studentId: string;
  /** Lesson identifier for context */
  lessonId: string;
  /** Initial total XP (from database) */
  initialXp?: number;
  /** Initial level (from database) */
  initialLevel?: number;
  /** Initial streak days (from database) */
  initialStreak?: number;
}

export interface LessonStreak {
  currentStreak: number;
  longestStreak: number;
}

export interface AwardPracticeXpResult extends PracticeXpResult {
  /** Whether player leveled up from this XP gain */
  leveledUp: boolean;
  /** New level after XP gain */
  newLevel?: number;
  /** Titles unlocked from leveling up */
  newTitles: string[];
}

export interface PendingXpUpdate {
  studentId: string;
  lessonId: string;
  totalXp: number;
  currentLevel: number;
  streak: LessonStreak;
}

export interface UseEducationXpReturn {
  // State
  /** Current total XP */
  totalXp: number;
  /** Current player level */
  currentLevel: number;
  /** Detailed XP progress information */
  xpProgress: XpProgress;
  /** The lesson practice streak, as last reported by the server */
  streak: LessonStreak;

  // Actions
  /** Award XP for a practice session */
  awardPracticeXp: (session: PracticeSessionXp) => Promise<AwardPracticeXpResult>;
  applyServerStreak: (streak: PracticeStreak) => void;
  /** Acknowledge that pending update was persisted */
  acknowledgePersistence: () => void;

  // Loading/error state
  /** Replace a local estimate with the XP the server granted; returns the resulting level. */
  reconcileAwardedXp: (estimatedXp: number, awardedXp: number) => number;
  /** Whether an XP calculation is in progress */
  isLoading: boolean;
  /** Error from last operation, if any */
  error: Error | null;

  // Persistence
  /** Pending update data for external database persistence */
  pendingUpdate: PendingXpUpdate | null;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

/**
 * Education XP state management hook
 *
 * @param options - Configuration options
 * @returns XP state and actions
 *
 * @example
 * const { totalXp, awardPracticeXp, streak } = useEducationXp({
 *   studentId: 'student-123',
 *   lessonId: 'lesson-456',
 *   initialXp: 500,
 * });
 *
 * // Award XP after flashcard session
 * const result = await awardPracticeXp({
 *   type: 'flashcard',
 *   sessionData: { cardsReviewed: 10, cardsCorrect: 9 },
 *   streakDays: streak.currentStreak,
 * });
 *
 * if (result.leveledUp) {
 *   showLevelUpCelebration(result.newLevel);
 * }
 */
export function useEducationXp(options: UseEducationXpOptions): UseEducationXpReturn {
  const { studentId, lessonId, initialXp = 0, initialLevel, initialStreak } = options;

  // ==================== State ====================

  const [totalXp, setTotalXp] = useState<number>(initialXp);
  const [currentLevel, setCurrentLevel] = useState<number>(
    () => initialLevel ?? getLevelFromXp(initialXp)
  );
  // BUG-05: refs mirror latest state to survive back-to-back awards before rerender
  const totalXpRef = useRef<number>(initialXp);
  const currentLevelRef = useRef<number>(0);
  currentLevelRef.current = currentLevel;
  totalXpRef.current = totalXp;
  const [streak, setStreak] = useState<LessonStreak>({ currentStreak: initialStreak ?? 0, longestStreak: initialStreak ?? 0 });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<PendingXpUpdate | null>(null);

  // ==================== Derived State ====================

  // xpProgress is derived from totalXp via useMemo
  const xpProgress = useMemo<XpProgress>(() => {
    return getXpProgress(totalXp);
  }, [totalXp]);

  // ==================== Actions ====================

  /**
   * Award XP for a practice session
   * Handles:
   * - XP calculation via calculatePracticeXp
   * - Level up detection
   */
  const awardPracticeXp = useCallback(
    async (session: PracticeSessionXp): Promise<AwardPracticeXpResult> => {
      setIsLoading(true);
      setError(null);

      try {
        // Validate session type
        const validTypes = [
          'flashcard',
          'solo_board',
          'lesson_completion',
          'matching',
          'spelling',
          'blitz',
          'duel_async',
          'duel_realtime',
          'daily_challenge',
        ];
        if (!validTypes.includes(session.type)) {
          throw new Error(`Invalid session type: ${session.type}`);
        }

        // Calculate XP (includes streak bonus if applicable)
        const xpResult = calculatePracticeXp(session);

        // BUG-05: read from ref to avoid stale closure on consecutive awards
        const newTotalXp = totalXpRef.current + xpResult.totalXp;
        const oldLevel = currentLevelRef.current;
        const newLevel = getLevelFromXp(newTotalXp);

        // Check for level up
        const levelUpResult: LevelUpResult = checkLevelUp(oldLevel, newLevel);

        // Update refs synchronously so next call sees fresh values
        totalXpRef.current = newTotalXp;
        currentLevelRef.current = newLevel;

        setTotalXp(newTotalXp);
        setCurrentLevel(newLevel);

        // Create pending update for database persistence
        const update: PendingXpUpdate = {
          studentId,
          lessonId,
          totalXp: newTotalXp,
          currentLevel: newLevel,
          streak,
        };
        setPendingUpdate(update);

        // BUG-02 fix: XP persistence is owned by server PATCH /api/education/practice,
        // which writes both student_lesson_progress (award_education_xp) and profiles
        // (increment_player_xp). Client previously also hit /api/education/record-xp
        // which double-counted profile XP.

        // Build result
        const result: AwardPracticeXpResult = {
          ...xpResult,
          leveledUp: levelUpResult.leveledUp,
          newLevel: levelUpResult.newLevel,
          newTitles: levelUpResult.newTitles,
        };

        setIsLoading(false);
        return result;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsLoading(false);

        // Return error result
        return {
          totalXp: 0,
          breakdown: {},
          masteryMessage: '',
          leveledUp: false,
          newTitles: [],
        };
      }
    },
    [studentId, lessonId, streak]
  );

  const applyServerStreak = useCallback((next: PracticeStreak) => {
    setStreak({ currentStreak: next.current, longestStreak: next.longest });
  }, []);

  const reconcileAwardedXp = useCallback((estimatedXp: number, awardedXp: number): number => {
    const reconciledXp = Math.max(0, totalXpRef.current - estimatedXp + awardedXp);
    const level = getLevelFromXp(reconciledXp);
    totalXpRef.current = reconciledXp;
    currentLevelRef.current = level;
    setTotalXp(reconciledXp);
    setCurrentLevel(level);
    return level;
  }, []);

  /**
   * Acknowledge that pending update was persisted to database
   * Call this after successfully saving to Supabase
   */
  const acknowledgePersistence = useCallback(() => {
    setPendingUpdate(null);
  }, []);

  // ==================== Return ====================

  return {
    // State
    totalXp,
    currentLevel,
    xpProgress,
    streak,

    // Actions
    awardPracticeXp,
    applyServerStreak,
    reconcileAwardedXp,
    acknowledgePersistence,

    // Loading/error state
    isLoading,
    error,

    // Persistence
    pendingUpdate,
  };
}

// ==================== EXPORTS ====================

export { EDUCATION_XP_CONFIG };
export type { PracticeSessionXp, PracticeXpResult, XpProgress };

export default useEducationXp;
