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
    chapterQuests: mockChapterQuests,
    updateObjective: mockUpdateObjective,
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
