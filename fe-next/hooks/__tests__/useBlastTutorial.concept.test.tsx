import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBlastTutorial } from '../useBlastTutorial';
import type { BlastLevel } from '@/lib/blast/v2/types';
import type { UnlocksSeen } from '@/lib/blast/v2/tutorial/unlocks-seen';

function makeLevel(levelNumber: number): BlastLevel {
  return {
    id: `concept-${levelNumber}`,
    levelNumber,
    locale: 'en',
    theme: 'onboarding',
    columns: [{ index: 0, tiles: ['A'] }],
    words: ['A'],
    resolvableOrder: ['A'],
    tileFlags: {},
    difficulty: levelNumber,
  } as unknown as BlastLevel;
}

describe('useBlastTutorial concept intros', () => {
  it('level 4 shows the "anyRow" concept card when unseen', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true };
    const { result } = renderHook(() =>
      useBlastTutorial(makeLevel(4), unlocks, false, () => {})
    );
    expect(result.current.showConceptCard).toBe('anyRow');
  });

  it('level 4 hides the concept card once anyRow is seen', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true, concept_anyRow: true };
    const { result } = renderHook(() =>
      useBlastTutorial(makeLevel(4), unlocks, false, () => {})
    );
    expect(result.current.showConceptCard).toBeNull();
  });

  it('level 31 shows the "verticalWords" concept card when unseen', () => {
    const unlocks: UnlocksSeen = {
      ftue_completed: true,
      concept_anyRow: true,
    };
    const { result } = renderHook(() =>
      useBlastTutorial(makeLevel(31), unlocks, false, () => {})
    );
    expect(result.current.showConceptCard).toBe('verticalWords');
  });

  it('level 31 still surfaces unseen anyRow first (player jumped in late)', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true };
    const { result } = renderHook(() =>
      useBlastTutorial(makeLevel(31), unlocks, false, () => {})
    );
    expect(result.current.showConceptCard).toBe('anyRow');
  });

  it('level 32 hides concepts once both are seen', () => {
    const unlocks: UnlocksSeen = {
      ftue_completed: true,
      concept_anyRow: true,
      concept_verticalWords: true,
    };
    const { result } = renderHook(() =>
      useBlastTutorial(makeLevel(32), unlocks, false, () => {})
    );
    expect(result.current.showConceptCard).toBeNull();
  });

  it('verticalWords concept does not fire below level 31 (only generator places V)', () => {
    const unlocks: UnlocksSeen = {
      ftue_completed: true,
      concept_anyRow: true,
    };
    for (const n of [4, 6, 10, 20, 30]) {
      const { result } = renderHook(() =>
        useBlastTutorial(makeLevel(n), unlocks, false, () => {})
      );
      expect(result.current.showConceptCard).toBeNull();
    }
  });

  it('levels 1-3 never show concept cards', () => {
    const unlocks: UnlocksSeen = {};
    for (const n of [1, 2, 3]) {
      const { result } = renderHook(() =>
        useBlastTutorial(makeLevel(n), unlocks, false, () => {})
      );
      expect(result.current.showConceptCard).toBeNull();
    }
  });

  it('skip_all suppresses concept cards', () => {
    const unlocks: UnlocksSeen = { ftue_completed: true, skip_all: true };
    const { result } = renderHook(() =>
      useBlastTutorial(makeLevel(4), unlocks, false, () => {})
    );
    expect(result.current.showConceptCard).toBeNull();
  });
});
