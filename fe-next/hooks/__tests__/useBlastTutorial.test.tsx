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

  it('suppresses all unlock cards on level 3+ (tutorial ends after level 2)', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true };
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel3, unlocks, false, () => {})
    );

    expect(result.current.showUnlockCard).toBeNull();
    expect(result.current.showFtueOverlay).toBe(false);
  });

  it('suppresses unlock cards on level 13 even if mechanic never seen', () => {
    const level13: BlastLevel = { levelNumber: 13, board: [['A']], theme: 'test' };
    const unlocks: UnlocksSeen = { ftue_completed: true };
    const { result } = renderHook(() =>
      useBlastTutorial(level13, unlocks, false, () => {})
    );

    expect(result.current.showUnlockCard).toBeNull();
    expect(result.current.showFtueOverlay).toBe(false);
  });

  it('skip_all also clears cards (defensive — superseded by level>2 gate)', () => {
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

  it('returns unlockCardIndex=-1 after tutorial cutoff', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true };
    const { result } = renderHook(() =>
      useBlastTutorial(mockLevel3, unlocks, false, () => {})
    );

    expect(result.current.unlockCardIndex).toBe(-1);
  });
});
