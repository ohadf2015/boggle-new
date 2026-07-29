/**
 * useEducationXp Hook Tests
 *
 * Tests for education XP state management hook
 * Following TDD RED-GREEN-REFACTOR cycle
 */

import { vi } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEducationXp } from '../useEducationXp';

// Type import (separate from mock)
type PracticeSessionXp = {
  type: 'flashcard' | 'solo_board' | 'lesson_completion';
  sessionData: {
    cardsReviewed?: number;
    cardsCorrect?: number;
    vocabularyWordsFound?: string[];
    newWordsFound?: string[];
    masteryLevel?: 'not_started' | 'started' | 'practicing' | 'mastered';
  };
  streakDays?: number;
};

// Mock fetch — stub is applied in beforeEach; this is just a placeholder fn
const mockEducationFetch = vi.fn().mockImplementation(() => new Promise(() => {}));

// Mock the educationXpManager module
vi.mock('@/backend/modules/educationXpManager', () => ({
  calculatePracticeXp: vi.fn(),
  getMasteryMessage: vi.fn(),
  EDUCATION_XP_CONFIG: {
    FLASHCARD_CORRECT: 10,
    FLASHCARD_ACCURACY_BONUS: { 90: 50, 80: 30, 70: 10 },
    FLASHCARD_PERFECT_SESSION: 100,
    VOCABULARY_WORD_FOUND: 15,
    BOARD_COMPLETION: 50,
    NEW_WORD_BONUS: 25,
    LESSON_COMPLETED: 200,
    LESSON_MASTERY_BONUS: 100,
    DAILY_PRACTICE_BASE: 20,
    STREAK_MULTIPLIERS: { 7: 1.5, 14: 1.75, 30: 2.0 },
  },
}));

// Mock the xpManager module
vi.mock('@/backend/modules/xpManager', () => ({
  getXpProgress: vi.fn(),
  getLevelFromXp: vi.fn(),
  checkLevelUp: vi.fn(),
}));

// Mock the streaks module
vi.mock('@/utils/dailyChallenge/streaks', () => ({
  getDailyStreak: vi.fn(),
  updateDailyStreak: vi.fn(),
  getStreakMilestone: vi.fn(),
  getStreakMilestoneMessage: vi.fn(),
}));

// Import mocked functions for assertions
import {
  calculatePracticeXp,
  getMasteryMessage,
} from '@/backend/modules/educationXpManager';
import {
  getXpProgress,
  getLevelFromXp,
  checkLevelUp,
} from '@/backend/modules/xpManager';
import {
  getDailyStreak,
  updateDailyStreak,
  getStreakMilestone,
  getStreakMilestoneMessage,
} from '@/utils/dailyChallenge/streaks';

const mockCalculatePracticeXp = calculatePracticeXp as any;
const mockGetMasteryMessage = getMasteryMessage as any;
const mockGetXpProgress = getXpProgress as any;
const mockGetLevelFromXp = getLevelFromXp as any;
const mockCheckLevelUp = checkLevelUp as any;
const mockGetDailyStreak = getDailyStreak as any;
const mockUpdateDailyStreak = updateDailyStreak as any;
const mockGetStreakMilestone = getStreakMilestone as any;
const mockGetStreakMilestoneMessage = getStreakMilestoneMessage as any;

let queryClient: QueryClient;
let wrapper: ({ children }: { children: React.ReactNode }) => React.ReactElement;

describe('useEducationXp', () => {
  const defaultStreak = {
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
    totalDailiesCompleted: 0,
  };

  const defaultXpProgress = {
    currentLevel: 1,
    totalXp: 0,
    currentLevelXp: 0,
    nextLevelXp: 100,
    xpInCurrentLevel: 0,
    xpNeededForNextLevel: 100,
    progressPercent: 0,
    isMaxLevel: false,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})));
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    vi.clearAllMocks();

    // Default mock implementations
    mockGetDailyStreak.mockReturnValue(defaultStreak);
    mockGetLevelFromXp.mockReturnValue(1);
    mockGetXpProgress.mockReturnValue(defaultXpProgress);
    mockCheckLevelUp.mockReturnValue({
      leveledUp: false,
      levelsGained: 0,
      newTitles: [],
    });
    mockUpdateDailyStreak.mockReturnValue({
      currentStreak: 1,
      longestStreak: 1,
      lastPlayedDate: '2026-01-25',
      totalDailiesCompleted: 1,
    });
    mockGetStreakMilestone.mockReturnValue(null);
    mockGetStreakMilestoneMessage.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should initialize with default values when no initial values provided', () => {
      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      expect(result.current.totalXp).toBe(0);
      expect(result.current.currentLevel).toBe(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should initialize with provided initial values', () => {
      mockGetLevelFromXp.mockReturnValue(5);
      mockGetXpProgress.mockReturnValue({
        ...defaultXpProgress,
        currentLevel: 5,
        totalXp: 500,
        progressPercent: 45,
      });
      mockGetDailyStreak.mockReturnValue({
        currentStreak: 7,
        longestStreak: 14,
        lastPlayedDate: '2026-01-24',
        totalDailiesCompleted: 20,
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
          initialXp: 500,
          initialLevel: 5,
          initialStreak: 7,
        })
      , { wrapper });

      expect(result.current.totalXp).toBe(500);
      expect(result.current.currentLevel).toBe(5);
      expect(result.current.streak.currentStreak).toBe(7);
    });

    it('should derive xpProgress from totalXp via useMemo', () => {
      mockGetXpProgress.mockReturnValue({
        ...defaultXpProgress,
        currentLevel: 3,
        totalXp: 350,
        progressPercent: 75,
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
          initialXp: 350,
        })
      , { wrapper });

      expect(result.current.xpProgress.progressPercent).toBe(75);
      expect(mockGetXpProgress).toHaveBeenCalledWith(350);
    });
  });

  describe('awardPracticeXp', () => {
    it('should update totalXp after awarding practice XP', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 120,
        breakdown: { flashcardCorrect: 100, dailyPractice: 20 },
        masteryMessage: 'You learned 10 words!',
      });
      mockGetLevelFromXp.mockReturnValue(1);

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 10,
        },
      };

      let awardResult: Awaited<ReturnType<typeof result.current.awardPracticeXp>>;
      await act(async () => {
        awardResult = await result.current.awardPracticeXp(session);
      });

      expect(result.current.totalXp).toBe(120);
      expect(awardResult!.totalXp).toBe(120);
      expect(awardResult!.breakdown).toEqual({
        flashcardCorrect: 100,
        dailyPractice: 20,
      });
      expect(awardResult!.masteryMessage).toBe('You learned 10 words!');
    });

    it('should detect level up when XP crosses threshold', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 150,
        breakdown: { lessonCompleted: 150 },
        masteryMessage: 'Lesson mastered!',
      });
      mockGetLevelFromXp
        .mockReturnValueOnce(1) // Initial
        .mockReturnValueOnce(2); // After XP gain
      mockCheckLevelUp.mockReturnValue({
        leveledUp: true,
        levelsGained: 1,
        newTitles: [],
        newLevel: 2,
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'lesson_completion',
        sessionData: {
          masteryLevel: 'mastered',
        },
      };

      let awardResult: Awaited<ReturnType<typeof result.current.awardPracticeXp>>;
      await act(async () => {
        awardResult = await result.current.awardPracticeXp(session);
      });

      expect(awardResult!.leveledUp).toBe(true);
      expect(result.current.currentLevel).toBe(2);
    });

    it('should apply streak bonus correctly', async () => {
      mockGetDailyStreak.mockReturnValue({
        currentStreak: 7,
        longestStreak: 10,
        lastPlayedDate: '2026-01-24',
        totalDailiesCompleted: 15,
      });

      // With 7-day streak, expect 1.5x multiplier applied
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 180, // Base 120 * 1.5 = 180 (streak bonus included)
        breakdown: {
          flashcardCorrect: 100,
          dailyPractice: 20,
          streakBonus: 60, // 120 * 0.5 bonus
        },
        masteryMessage: 'Perfect! You mastered all 10 words!',
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
          initialStreak: 7,
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 10,
        },
        streakDays: 7,
      };

      let awardResult: Awaited<ReturnType<typeof result.current.awardPracticeXp>>;
      await act(async () => {
        awardResult = await result.current.awardPracticeXp(session);
      });

      expect(awardResult!.breakdown.streakBonus).toBe(60);
      expect(result.current.totalXp).toBe(180);
    });

    it('should update streak after practice', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 100,
        breakdown: { flashcardCorrect: 80, dailyPractice: 20 },
        masteryMessage: 'You learned 8 words!',
      });
      mockUpdateDailyStreak.mockReturnValue({
        currentStreak: 3,
        longestStreak: 3,
        lastPlayedDate: '2026-01-25',
        totalDailiesCompleted: 3,
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 8,
        },
      };

      await act(async () => {
        await result.current.awardPracticeXp(session);
      });

      expect(mockUpdateDailyStreak).toHaveBeenCalled();
      expect(result.current.streak.currentStreak).toBe(3);
    });

    it('should detect streak milestone', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 100,
        breakdown: { flashcardCorrect: 80, dailyPractice: 20 },
        masteryMessage: 'You learned words!',
      });
      mockUpdateDailyStreak.mockReturnValue({
        currentStreak: 7,
        longestStreak: 7,
        lastPlayedDate: '2026-01-25',
        totalDailiesCompleted: 7,
      });
      mockGetStreakMilestone.mockReturnValue(7);
      mockGetStreakMilestoneMessage.mockReturnValue({
        emoji: '🔥',
        title: '1 WEEK STREAK!',
        subtitle: 'A full week of word hunting!',
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: {
          cardsReviewed: 10,
          cardsCorrect: 8,
        },
      };

      let awardResult: Awaited<ReturnType<typeof result.current.awardPracticeXp>>;
      await act(async () => {
        awardResult = await result.current.awardPracticeXp(session);
      });

      expect(awardResult!.streakMilestone).toEqual({
        emoji: '🔥',
        title: '1 WEEK STREAK!',
        subtitle: 'A full week of word hunting!',
      });
    });
  });

  describe('XP Progress Recalculation', () => {
    it('should recalculate xpProgress when totalXp changes', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 100,
        breakdown: { dailyPractice: 20, flashcardCorrect: 80 },
        masteryMessage: 'Great!',
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      // Initial call
      expect(mockGetXpProgress).toHaveBeenCalledWith(0);

      mockGetXpProgress.mockReturnValue({
        ...defaultXpProgress,
        totalXp: 100,
        progressPercent: 50,
      });

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: { cardsReviewed: 8, cardsCorrect: 8 },
      };

      await act(async () => {
        await result.current.awardPracticeXp(session);
      });

      // Should be called again with new XP
      expect(mockGetXpProgress).toHaveBeenCalledWith(100);
    });
  });

  describe('Error Handling', () => {
    it('should set error state when session data is invalid', async () => {
      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      // Testing invalid input by casting to any to bypass TypeScript
      const invalidSession = {
        type: 'invalid_type',
        sessionData: {},
      } as unknown as PracticeSessionXp;

      await act(async () => {
        await result.current.awardPracticeXp(invalidSession);
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should set loading state to false after XP calculation completes', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 100,
        breakdown: { dailyPractice: 20 },
        masteryMessage: 'Great!',
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      // Initially not loading
      expect(result.current.isLoading).toBe(false);

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: { cardsReviewed: 5, cardsCorrect: 5 },
      };

      await act(async () => {
        await result.current.awardPracticeXp(session);
      });

      // Should not be loading after completion
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Pending Updates', () => {
    it('should track pending XP update for external persistence', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 100,
        breakdown: { dailyPractice: 20, flashcardCorrect: 80 },
        masteryMessage: 'Great!',
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: { cardsReviewed: 8, cardsCorrect: 8 },
      };

      let awardResult: Awaited<ReturnType<typeof result.current.awardPracticeXp>>;
      await act(async () => {
        awardResult = await result.current.awardPracticeXp(session);
      });

      // pendingUpdate should contain data needed for database persistence
      expect(result.current.pendingUpdate).toEqual({
        studentId: 'student-1',
        lessonId: 'lesson-1',
        totalXp: 100,
        currentLevel: 1,
        streak: expect.any(Object),
      });
    });

    it('should clear pending update after acknowledgment', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 100,
        breakdown: { dailyPractice: 20, flashcardCorrect: 80 },
        masteryMessage: 'Great!',
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: { cardsReviewed: 8, cardsCorrect: 8 },
      };

      await act(async () => {
        await result.current.awardPracticeXp(session);
      });

      expect(result.current.pendingUpdate).not.toBeNull();

      act(() => {
        result.current.acknowledgePersistence();
      });

      expect(result.current.pendingUpdate).toBeNull();
    });
  });

  describe('Solo Board Sessions', () => {
    it('should calculate XP for solo board practice', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 165,
        breakdown: {
          dailyPractice: 20,
          vocabularyWords: 90, // 6 words * 15
          newWords: 50, // 2 new * 25
          boardCompletion: 50,
        },
        masteryMessage: 'You discovered 2 new vocabulary words!',
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'solo_board',
        sessionData: {
          vocabularyWordsFound: ['CAT', 'DOG', 'BIRD', 'FISH', 'LION', 'BEAR'],
          newWordsFound: ['LION', 'BEAR'],
        },
      };

      let awardResult: Awaited<ReturnType<typeof result.current.awardPracticeXp>>;
      await act(async () => {
        awardResult = await result.current.awardPracticeXp(session);
      });

      expect(awardResult!.totalXp).toBe(165);
      expect(awardResult!.masteryMessage).toBe('You discovered 2 new vocabulary words!');
    });
  });

  describe('Lesson Completion', () => {
    it('should calculate XP for lesson completion with mastery', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 320,
        breakdown: {
          dailyPractice: 20,
          lessonCompleted: 200,
          masteryBonus: 100,
        },
        masteryMessage: 'Lesson mastered! You know these words!',
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'lesson_completion',
        sessionData: {
          masteryLevel: 'mastered',
        },
      };

      let awardResult: Awaited<ReturnType<typeof result.current.awardPracticeXp>>;
      await act(async () => {
        awardResult = await result.current.awardPracticeXp(session);
      });

      expect(awardResult!.totalXp).toBe(320);
      expect(awardResult!.breakdown.masteryBonus).toBe(100);
    });
  });

  describe('Multiple Title Unlocks', () => {
    it('should return newTitleUnlocked when leveling up unlocks a title', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 500,
        breakdown: { lessonCompleted: 500 },
        masteryMessage: 'Lesson mastered!',
      });
      mockGetLevelFromXp
        .mockReturnValueOnce(1) // Initial
        .mockReturnValueOnce(5); // After XP gain
      mockCheckLevelUp.mockReturnValue({
        leveledUp: true,
        levelsGained: 4,
        newTitles: ['WORD_SEEKER'],
        newLevel: 5,
      });

      const { result } = renderHook(() =>
        useEducationXp({
          studentId: 'student-1',
          lessonId: 'lesson-1',
        })
      , { wrapper });

      const session: PracticeSessionXp = {
        type: 'lesson_completion',
        sessionData: { masteryLevel: 'mastered' },
      };

      let awardResult: Awaited<ReturnType<typeof result.current.awardPracticeXp>>;
      await act(async () => {
        awardResult = await result.current.awardPracticeXp(session);
      });

      expect(awardResult!.leveledUp).toBe(true);
      expect(awardResult!.newTitles).toContain('WORD_SEEKER');
    });
  });

  describe('Stale closure on consecutive awards (BUG-05)', () => {
    it('accumulates totalXp correctly across back-to-back awards within one act', async () => {
      mockCalculatePracticeXp.mockReturnValue({
        totalXp: 50,
        breakdown: { flashcardCorrect: 50 },
        masteryMessage: 'Nice!',
      });
      mockGetLevelFromXp.mockImplementation((xp: number) => {
        if (xp >= 100) return 2;
        if (xp >= 50) return 1;
        return 1;
      });
      mockCheckLevelUp.mockReturnValue({
        leveledUp: false,
        levelsGained: 0,
        newTitles: [],
      });

      const { result } = renderHook(
        () =>
          useEducationXp({
            studentId: 'student-1',
            lessonId: 'lesson-1',
          }),
        { wrapper }
      );

      const session: PracticeSessionXp = {
        type: 'flashcard',
        sessionData: { cardsReviewed: 5, cardsCorrect: 5 },
      };

      await act(async () => {
        await result.current.awardPracticeXp(session);
        await result.current.awardPracticeXp(session);
      });

      // After two back-to-back awards of 50 XP each, pendingUpdate should reflect 100
      expect(result.current.pendingUpdate?.totalXp).toBe(100);
      expect(result.current.totalXp).toBe(100);
    });
  });

});
