import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBlastTutorial } from '../useBlastTutorial';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';

describe('useBlastTutorial', () => {
  const mockLevel1: BlastLevel = {
    levelNumber: 1,
    board: [['A', 'B', 'C']],
    theme: 'test',
  };

  const mockLevel3: BlastLevel = {
    levelNumber: 3,
    board: [['A', 'B', 'C']],
    theme: 'test',
  };

  it('returns showFtueOverlay=true for level 1 without ftue_completed', () => {
    const unlocks: UnlocksSeen = {};
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel1, unlocks, false, () => {})
    );

    expect(result.current.showFtueOverlay).toBe(true);
    expect(result.current.showUnlockCard).toBeNull();
  });

  it('returns no overlay when ftue_completed for level 1', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true };
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel1, unlocks, false, () => {})
    );

    expect(result.current.showFtueOverlay).toBe(false);
    expect(result.current.showUnlockCard).toBeNull();
  });

  it('shows unlock card when mechanic is new at level 3', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true };
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel3, unlocks, false, () => {})
    );

    // Level 3 has coinOverlay which is at level 3
    expect(result.current.showUnlockCard).toBe('coinOverlay');
    expect(result.current.showFtueOverlay).toBe(false);
  });

  it('hides unlock card when mechanic is already seen', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true, coinOverlay: true };
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel3, unlocks, false, () => {})
    );

    expect(result.current.showUnlockCard).toBeNull();
    expect(result.current.showFtueOverlay).toBe(false);
  });

  it('hides all future cards when skip_all is true', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true, skip_all: true };
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel3, unlocks, false, () => {})
    );

    expect(result.current.showUnlockCard).toBeNull();
    expect(result.current.showFtueOverlay).toBe(false);
  });

  it('skip_all does not affect FTUE on level 1', () => {
    const unlocks: UnlocksSeen = { skip_all: true };
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel1, unlocks, false, () => {})
    );

    // FTUE still shows even with skip_all because they're independent
    expect(result.current.showFtueOverlay).toBe(true);
  });

  it('returns correct unlockCardIndex for ordering', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true };
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel3, unlocks, false, () => {})
    );

    expect(result.current.unlockCardIndex).toBeGreaterThanOrEqual(0);
  });
});
