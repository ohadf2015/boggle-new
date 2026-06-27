// @ts-nocheck
/**
 * useAdventureQuestTracking Tests
 *
 * Verifies the streakMaster chapter quest records the *streak length reached*
 * (max semantics) so "Reach a {target}-word streak" completes when a single
 * combo hits the target — not after N separate combos are started.
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

  describe('streakMaster chapter quest', () => {
    it('records the streak length on every combo increase', () => {
      const { rerender } = renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: defaultProps }
      );

      // A single growing streak reports its length as it climbs, so the quest
      // can store the highest streak reached (max semantics).
      rerender({ ...defaultProps, comboCount: 1 });
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledWith(1);

      rerender({ ...defaultProps, comboCount: 2 });
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledWith(2);

      rerender({ ...defaultProps, comboCount: 3 });
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledWith(3);

      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledTimes(3);
    });

    it('does NOT fire when the combo resets to 0', () => {
      const { rerender } = renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: { ...defaultProps, comboCount: 3 } }
      );
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledTimes(1);

      // Combo breaks — no record on the way down.
      rerender({ ...defaultProps, comboCount: 0 });
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenCalledTimes(1);
    });

    it('records again as a fresh streak grows past previous lengths', () => {
      const { rerender } = renderHook(
        (props) => useAdventureQuestTracking(props),
        { initialProps: { ...defaultProps, comboCount: 2 } }
      );
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenLastCalledWith(2);

      // Combo breaks, then a new streak begins and climbs.
      rerender({ ...defaultProps, comboCount: 0 });
      rerender({ ...defaultProps, comboCount: 1 });
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenLastCalledWith(1);
      rerender({ ...defaultProps, comboCount: 2 });
      rerender({ ...defaultProps, comboCount: 3 });
      expect(mockChapterQuests.recordStreakMaster).toHaveBeenLastCalledWith(3);
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
