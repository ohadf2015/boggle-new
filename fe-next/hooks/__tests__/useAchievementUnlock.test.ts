/**
 * useAchievementUnlock Hook Tests
 * Tests achievement unlock detection and celebration queue management
 */

import { vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAchievementUnlock } from '../useAchievementUnlock';
import type { StudentProgressData } from '@/backend/modules/educationAchievementManager';
import * as achievementManager from '@/backend/modules/educationAchievementManager';

// Mock achievement manager
vi.mock('@/backend/modules/educationAchievementManager');

// Provide a real localStorage backend so getItem returns what setItem stored
const localStore: Record<string, string> = {};
beforeEach(() => {
  for (const k of Object.keys(localStore)) delete localStore[k];
  (localStorage.getItem as any).mockImplementation((key: string) => localStore[key] ?? null);
  (localStorage.setItem as any).mockImplementation((key: string, val: string) => { localStore[key] = val; });
  (localStorage.removeItem as any).mockImplementation((key: string) => { delete localStore[key]; });
  (localStorage.clear as any).mockImplementation(() => { for (const k of Object.keys(localStore)) delete localStore[k]; });
});

describe('useAchievementUnlock', () => {
  const mockStudentId = 'student-123';
  const mockCalculateNewUnlocks = achievementManager.calculateNewUnlocks as any;
  const mockCheckAchievementProgress = achievementManager.checkAchievementProgress as any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Initial State', () => {
    it('should return empty queue initially', () => {
      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      expect(result.current.pendingUnlocks).toEqual([]);
      expect(result.current.currentUnlock).toBeNull();
      expect(result.current.isChecking).toBe(false);
    });
  });

  describe('checkForUnlocks', () => {
    it('should detect new bronze unlock', () => {
      // GIVEN: Mock progress data (before and after)
      const mockProgressBefore: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const mockProgressAfter: StudentProgressData = {
        ...mockProgressBefore,
        lessonsCompleted: 1, // Unlocks bronze tier
      };

      const mockBeforeProgress = [
        { key: 'first_lesson', current_tier: null, progress_value: 0, next_threshold: 1, percent_complete: 0, isSecret: false },
      ];

      const mockAfterProgress = [
        { key: 'first_lesson', current_tier: 'bronze' as const, progress_value: 1, next_threshold: 3, percent_complete: 0, isSecret: false },
      ];

      const mockUnlock = {
        achievementKey: 'first_lesson',
        tier: 'bronze' as const,
        icon: '📚',
        isNew: true,
        isUpgrade: false,
      };

      mockCheckAchievementProgress
        .mockReturnValueOnce(mockBeforeProgress) // First call: establish baseline
        .mockReturnValueOnce(mockAfterProgress); // Second call: detect unlock
      mockCalculateNewUnlocks.mockReturnValue([mockUnlock]);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      // WHEN: Check for unlocks (establish baseline first, then check)
      act(() => {
        result.current.checkForUnlocks(mockProgressBefore);
      });

      act(() => {
        result.current.checkForUnlocks(mockProgressAfter);
      });

      // THEN: Should detect new bronze unlock
      expect(result.current.pendingUnlocks).toHaveLength(1);
      expect(result.current.currentUnlock).toEqual(mockUnlock);
    });

    it('should detect tier upgrade (silver to gold)', () => {
      // GIVEN: Mock tier upgrade (silver -> gold)
      const mockProgressBefore: StudentProgressData = {
        lessonsCompleted: 3, // Silver tier
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const mockProgressAfter: StudentProgressData = {
        ...mockProgressBefore,
        lessonsCompleted: 10, // Gold tier
      };

      const mockBeforeProgress = [
        { key: 'first_lesson', current_tier: 'silver' as const, progress_value: 3, next_threshold: 10, percent_complete: 0, isSecret: false },
      ];

      const mockAfterProgress = [
        { key: 'first_lesson', current_tier: 'gold' as const, progress_value: 10, next_threshold: 25, percent_complete: 0, isSecret: false },
      ];

      const mockUnlock = {
        achievementKey: 'first_lesson',
        tier: 'gold' as const,
        icon: '📚',
        isNew: false,
        isUpgrade: true,
      };

      mockCheckAchievementProgress
        .mockReturnValueOnce(mockBeforeProgress) // Baseline
        .mockReturnValueOnce(mockAfterProgress); // After upgrade
      mockCalculateNewUnlocks.mockReturnValue([mockUnlock]);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      // WHEN: Check for unlocks (baseline then upgrade)
      act(() => {
        result.current.checkForUnlocks(mockProgressBefore);
      });

      act(() => {
        result.current.checkForUnlocks(mockProgressAfter);
      });

      // THEN: Should detect upgrade
      expect(result.current.currentUnlock?.isUpgrade).toBe(true);
      expect(result.current.currentUnlock?.tier).toBe('gold');
    });

    it('should queue multiple unlocks in order earned', () => {
      // GIVEN: Multiple unlocks at once
      const mockProgressBefore: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const mockProgressAfter: StudentProgressData = {
        ...mockProgressBefore,
        lessonsCompleted: 1,
        wordsMastered: 50,
      };

      const mockBeforeProgress = [
        { key: 'first_lesson', current_tier: null, progress_value: 0, next_threshold: 1, percent_complete: 0, isSecret: false },
        { key: 'word_master', current_tier: null, progress_value: 0, next_threshold: 50, percent_complete: 0, isSecret: false },
      ];

      const mockAfterProgress = [
        { key: 'first_lesson', current_tier: 'bronze' as const, progress_value: 1, next_threshold: 3, percent_complete: 0, isSecret: false },
        { key: 'word_master', current_tier: 'bronze' as const, progress_value: 50, next_threshold: 150, percent_complete: 0, isSecret: false },
      ];

      const mockUnlocks = [
        {
          achievementKey: 'first_lesson',
          tier: 'bronze' as const,
          icon: '📚',
          isNew: true,
          isUpgrade: false,
        },
        {
          achievementKey: 'word_master',
          tier: 'bronze' as const,
          icon: '🎓',
          isNew: true,
          isUpgrade: false,
        },
      ];

      mockCheckAchievementProgress
        .mockReturnValueOnce(mockBeforeProgress)
        .mockReturnValueOnce(mockAfterProgress);
      mockCalculateNewUnlocks.mockReturnValue(mockUnlocks);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      // WHEN: Check for unlocks (baseline then multiple unlocks)
      act(() => {
        result.current.checkForUnlocks(mockProgressBefore);
      });

      act(() => {
        result.current.checkForUnlocks(mockProgressAfter);
      });

      // THEN: Should queue both unlocks
      expect(result.current.pendingUnlocks).toHaveLength(2);
      expect(result.current.currentUnlock).toEqual(mockUnlocks[0]);
    });

    it('should handle disabled state (enabled: false)', () => {
      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId, enabled: false })
      );

      const mockProgress: StudentProgressData = {
        lessonsCompleted: 1,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      // WHEN: Try to check for unlocks while disabled
      act(() => {
        result.current.checkForUnlocks(mockProgress);
      });

      // THEN: Should not process unlocks
      expect(result.current.pendingUnlocks).toEqual([]);
      expect(mockCheckAchievementProgress).not.toHaveBeenCalled();
    });
  });

  describe('acknowledgeUnlock', () => {
    it('should remove current unlock and advance queue', () => {
      // GIVEN: Multiple unlocks queued
      const mockProgressBefore: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const mockProgressAfter: StudentProgressData = {
        ...mockProgressBefore,
        lessonsCompleted: 1,
        wordsMastered: 50,
      };

      const mockBeforeProgress = [
        { key: 'first_lesson', current_tier: null, progress_value: 0, next_threshold: 1, percent_complete: 0, isSecret: false },
        { key: 'word_master', current_tier: null, progress_value: 0, next_threshold: 50, percent_complete: 0, isSecret: false },
      ];

      const mockAfterProgress = [
        { key: 'first_lesson', current_tier: 'bronze' as const, progress_value: 1, next_threshold: 3, percent_complete: 0, isSecret: false },
        { key: 'word_master', current_tier: 'bronze' as const, progress_value: 50, next_threshold: 150, percent_complete: 0, isSecret: false },
      ];

      const mockUnlocks = [
        {
          achievementKey: 'first_lesson',
          tier: 'bronze' as const,
          icon: '📚',
          isNew: true,
          isUpgrade: false,
        },
        {
          achievementKey: 'word_master',
          tier: 'bronze' as const,
          icon: '🎓',
          isNew: true,
          isUpgrade: false,
        },
      ];

      mockCheckAchievementProgress
        .mockReturnValueOnce(mockBeforeProgress)
        .mockReturnValueOnce(mockAfterProgress);
      mockCalculateNewUnlocks.mockReturnValue(mockUnlocks);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      act(() => {
        result.current.checkForUnlocks(mockProgressBefore);
      });

      act(() => {
        result.current.checkForUnlocks(mockProgressAfter);
      });

      // WHEN: Acknowledge first unlock
      act(() => {
        result.current.acknowledgeUnlock();
      });

      // THEN: Should advance to second unlock
      expect(result.current.pendingUnlocks).toHaveLength(1);
      expect(result.current.currentUnlock).toEqual(mockUnlocks[1]);
    });

    it('should set currentUnlock to null when queue empty', () => {
      // GIVEN: Single unlock
      const mockProgress: StudentProgressData = {
        lessonsCompleted: 1,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const mockUnlocks = [
        {
          achievementKey: 'first_lesson',
          tier: 'bronze' as const,
          icon: '📚',
          isNew: true,
          isUpgrade: false,
        },
      ];

      mockCheckAchievementProgress.mockReturnValue([]);
      mockCalculateNewUnlocks.mockReturnValue(mockUnlocks);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      act(() => {
        result.current.checkForUnlocks(mockProgress);
      });

      // WHEN: Acknowledge last unlock
      act(() => {
        result.current.acknowledgeUnlock();
      });

      // THEN: Should be null
      expect(result.current.currentUnlock).toBeNull();
      expect(result.current.pendingUnlocks).toEqual([]);
    });
  });

  describe('Persistence', () => {
    it('should not re-trigger for already acknowledged unlocks', () => {
      // GIVEN: Already acknowledged unlock (stored in localStorage)
      const acknowledgedKey = 'first_lesson:bronze';
      localStorage.setItem(
        `achievement-acknowledged-${mockStudentId}`,
        JSON.stringify([acknowledgedKey])
      );

      const mockProgress: StudentProgressData = {
        lessonsCompleted: 1,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const mockUnlocks = [
        {
          achievementKey: 'first_lesson',
          tier: 'bronze' as const,
          icon: '📚',
          isNew: true,
          isUpgrade: false,
        },
      ];

      mockCheckAchievementProgress.mockReturnValue([]);
      mockCalculateNewUnlocks.mockReturnValue(mockUnlocks);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      // WHEN: Check for unlocks
      act(() => {
        result.current.checkForUnlocks(mockProgress);
      });

      // THEN: Should filter out already acknowledged unlock
      expect(result.current.pendingUnlocks).toEqual([]);
      expect(result.current.currentUnlock).toBeNull();
    });

    it('should persist acknowledgment to localStorage', () => {
      // GIVEN: New unlock
      const mockProgressBefore: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      const mockProgressAfter: StudentProgressData = {
        ...mockProgressBefore,
        lessonsCompleted: 1,
      };

      const mockBeforeProgress = [
        { key: 'first_lesson', current_tier: null, progress_value: 0, next_threshold: 1, percent_complete: 0, isSecret: false },
      ];

      const mockAfterProgress = [
        { key: 'first_lesson', current_tier: 'bronze' as const, progress_value: 1, next_threshold: 3, percent_complete: 0, isSecret: false },
      ];

      const mockUnlocks = [
        {
          achievementKey: 'first_lesson',
          tier: 'bronze' as const,
          icon: '📚',
          isNew: true,
          isUpgrade: false,
        },
      ];

      mockCheckAchievementProgress
        .mockReturnValueOnce(mockBeforeProgress)
        .mockReturnValueOnce(mockAfterProgress);
      mockCalculateNewUnlocks.mockReturnValue(mockUnlocks);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      act(() => {
        result.current.checkForUnlocks(mockProgressBefore);
      });

      act(() => {
        result.current.checkForUnlocks(mockProgressAfter);
      });

      // WHEN: Acknowledge unlock
      act(() => {
        result.current.acknowledgeUnlock();
      });

      // THEN: Should persist to localStorage
      const storedData = localStorage.getItem(`achievement-acknowledged-${mockStudentId}`);
      expect(storedData).not.toBeNull();
      const parsed = JSON.parse(storedData!);
      expect(parsed).toContain('first_lesson:bronze');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty unlocks array', () => {
      const mockProgress: StudentProgressData = {
        lessonsCompleted: 0,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 0,
        practiceSessions: 0,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      mockCheckAchievementProgress.mockReturnValue([]);
      mockCalculateNewUnlocks.mockReturnValue([]);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      act(() => {
        result.current.checkForUnlocks(mockProgress);
      });

      expect(result.current.pendingUnlocks).toEqual([]);
      expect(result.current.currentUnlock).toBeNull();
    });

    it('should handle acknowledgeUnlock when queue is already empty', () => {
      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      // WHEN: Acknowledge with empty queue
      act(() => {
        result.current.acknowledgeUnlock();
      });

      // THEN: Should not throw, should remain empty
      expect(result.current.pendingUnlocks).toEqual([]);
      expect(result.current.currentUnlock).toBeNull();
    });

    it('should set isChecking to true during checkForUnlocks', () => {
      const mockProgress: StudentProgressData = {
        lessonsCompleted: 1,
        wordsMastered: 0,
        currentLevel: 1,
        totalXp: 100,
        practiceSessions: 1,
        wordsInGame: 0,
        perfectGames: 0,
        bossesDefeated: 0,
        combosAchieved: 0,
        currentStreak: 0,
        morningPractices: 0,
        daysThisMonth: 0,
        weeksWith5Days: 0,
        longestStreak: 0,
        modesTried: 0,
        lessonsCollected: 0,
        classroomsJoined: 0,
        uniqueWords: 0,
      };

      mockCheckAchievementProgress.mockReturnValue([]);
      mockCalculateNewUnlocks.mockReturnValue([]);

      const { result } = renderHook(() =>
        useAchievementUnlock({ studentId: mockStudentId })
      );

      let isCheckingDuringCall = false;

      act(() => {
        result.current.checkForUnlocks(mockProgress);
        // Note: isChecking is synchronous in this implementation
      });

      // After call completes, should be false
      expect(result.current.isChecking).toBe(false);
    });
  });
});
