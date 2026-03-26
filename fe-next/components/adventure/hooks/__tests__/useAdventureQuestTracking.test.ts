// @ts-nocheck
/**
 * useAdventureQuestTracking Tests
 *
 * Verifies combo streak and streak master fire only on threshold crossings,
 * not on every comboCount increment.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAdventureQuestTracking } from '../useAdventureQuestTracking';

describe('useAdventureQuestTracking', () => {
  const mockRecordQuestProgress = vi.fn();
  const mockChapterQuests = {
    recordWordsFound: vi.fn(),
    recordLongWord: vi.fn(),
    recordStreakMaster: vi.fn(),
    recordFlashChallengeMaster: vi.fn(),
    recordWorldMechanicUse: vi.fn(),
  };
  const mockUpdateObjective = vi.fn();

  const defaultProps = {
    wordsFound: [],
    comboCount: 0,
    isBossLevel: false,
    bossCurrentHP: 100,
    bossMaxHP: 100,
    playerCurrentHP: 100,
    playerMaxHP: 100,
    gridEffectTrigger: null,
    isChallengeComplete: false,
    recordQuestProgress: mockRecordQuestProgress,
    chapterQuests: mockChapterQuests,
    updateObjective: mockUpdateObjective,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('comboStreak quest (M3 fix)', () => {
    it('fires comboStreak when crossing from <5 to >=5', () => {
      const { rerender } = renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: { ...defaultProps, comboCount: 4 } }
      );

      expect(mockRecordQuestProgress).not.toHaveBeenCalledWith('comboStreak');

      rerender({ ...defaultProps, comboCount: 5 });
      expect(mockRecordQuestProgress).toHaveBeenCalledWith('comboStreak');
    });

    it('does NOT fire comboStreak on subsequent increments (5→6→7)', () => {
      const { rerender } = renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: { ...defaultProps, comboCount: 5 } }
      );

      mockRecordQuestProgress.mockClear();

      rerender({ ...defaultProps, comboCount: 6 });
      rerender({ ...defaultProps, comboCount: 7 });
      rerender({ ...defaultProps, comboCount: 8 });

      expect(mockRecordQuestProgress).not.toHaveBeenCalledWith('comboStreak');
    });

    it('fires again after combo resets and crosses 5 again', () => {
      const { rerender } = renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: { ...defaultProps, comboCount: 5 } }
      );

      // First crossing
      expect(mockRecordQuestProgress).toHaveBeenCalledWith('comboStreak');
      mockRecordQuestProgress.mockClear();

      // Reset combo
      rerender({ ...defaultProps, comboCount: 0 });
      // Build up again
      rerender({ ...defaultProps, comboCount: 3 });
      expect(mockRecordQuestProgress).not.toHaveBeenCalledWith('comboStreak');

      rerender({ ...defaultProps, comboCount: 5 });
      expect(mockRecordQuestProgress).toHaveBeenCalledWith('comboStreak');
    });
  });

  describe('streakMaster chapter quest (M4 fix)', () => {
    it('fires streakMaster only on 0→positive transition', () => {
      const { rerender } = renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: defaultProps }
      );

      // Combo starts
      rerender({ ...defaultProps, comboCount: 1 });
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledTimes(1);

      // Subsequent increments should NOT fire again
      rerender({ ...defaultProps, comboCount: 2 });
      rerender({ ...defaultProps, comboCount: 3 });
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledTimes(1);
    });

    it('fires again after combo resets to 0', () => {
      const { rerender } = renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: { ...defaultProps, comboCount: 1 } }
      );

      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledTimes(1);

      // Combo breaks
      rerender({ ...defaultProps, comboCount: 0 });
      // New streak starts
      rerender({ ...defaultProps, comboCount: 1 });

      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledTimes(2);
    });

    it('does NOT fire when comboCount stays at 0', () => {
      renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: defaultProps }
      );

      expect(mockChapterQuests.recordStreakMaster).not.toHaveBeenCalled();
    });
  });
});
