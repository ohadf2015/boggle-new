import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFlashChallenge } from '../useFlashChallenge';
vi.useFakeTimers();

// Mock Math.random to always return 0 (selects first candidate)
const mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

const baseProps = { worldId: 1, totalTimeSeconds: 100, isPlaying: true };

afterAll(() => { mockRandom.mockRestore(); });

/** Helper: trigger a challenge by simulating 31% elapsed */
function triggerChallenge(worldId = 1) {
  return renderHook(
    ({ timeRemaining, wordsFound, lastWordTileTypes }) =>
      useFlashChallenge({ ...baseProps, worldId, timeRemaining, wordsFound, lastWordTileTypes }),
    { initialProps: { timeRemaining: 69, wordsFound: [] as string[], lastWordTileTypes: undefined as string[] | undefined } }
  );
}

/** Helper: trigger a specific challenge type by picking the right world pool index */
function triggerChallengeType(type: string) {
  // World pools: easy=[longWord5, comboStreak2, startsWith S, fastWord10]
  // medium=[longWord6, doubleLetters, endsWith ING, endsWith ED]
  // hard=[palindrome, exactLength6, useGoldTile, comboStreak3]
  const typeToWorld: Record<string, { worldId: number; randomVal: number }> = {
    'longWord': { worldId: 1, randomVal: 0 },        // easy[0]
    'comboStreak': { worldId: 1, randomVal: 0.25 },   // easy[1]
    'startsWith': { worldId: 1, randomVal: 0.5 },     // easy[2]
    'fastWord': { worldId: 1, randomVal: 0.75 },      // easy[3]
    'doubleLetters': { worldId: 3, randomVal: 0.25 }, // medium[1]
    'endsWith': { worldId: 3, randomVal: 0.5 },       // medium[2] = endsWith ING
    'palindrome': { worldId: 5, randomVal: 0 },       // hard[0]
    'exactLength': { worldId: 5, randomVal: 0.25 },   // hard[1] = exactLength 6
    'useGoldTile': { worldId: 5, randomVal: 0.5 },    // hard[2]
  };
  const config = typeToWorld[type];
  if (!config) throw new Error(`No config for type: ${type}`);
  mockRandom.mockReturnValue(config.randomVal);

  const hook = renderHook(
    ({ timeRemaining, wordsFound, lastWordTileTypes }) =>
      useFlashChallenge({ ...baseProps, worldId: config.worldId, timeRemaining, wordsFound, lastWordTileTypes }),
    { initialProps: { timeRemaining: 69, wordsFound: [] as string[], lastWordTileTypes: undefined as string[] | undefined } }
  );

  // Reset random for other uses
  mockRandom.mockReturnValue(0);
  return hook;
}

describe('useFlashChallenge', () => {
  afterEach(() => { vi.clearAllTimers(); mockRandom.mockReturnValue(0); });

  it('returns null challenge before 30% time has elapsed', () => {
    const { result } = renderHook(() =>
      useFlashChallenge({ ...baseProps, timeRemaining: 75, wordsFound: [] })
    );
    expect(result.current.activeChallenge).toBeNull();
  });

  it('triggers challenge when 30%+ time has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ timeRemaining }) => useFlashChallenge({ ...baseProps, timeRemaining, wordsFound: [] }),
      { initialProps: { timeRemaining: 75 } }
    );
    rerender({ timeRemaining: 69 }); // 31% elapsed
    expect(result.current.activeChallenge).not.toBeNull();
  });

  it('marks challenge complete when longWord condition met after trigger', () => {
    const { result, rerender } = triggerChallenge();
    expect(result.current.activeChallenge).not.toBeNull();
    rerender({ timeRemaining: 60, wordsFound: ['AMAZING'], lastWordTileTypes: undefined }); // 7-letter word
    expect(result.current.isChallengeComplete).toBe(true);
  });

  it('dismiss() clears the challenge', () => {
    const { result } = triggerChallenge();
    expect(result.current.activeChallenge).not.toBeNull();
    act(() => { result.current.dismiss(); });
    expect(result.current.activeChallenge).toBeNull();
  });

  it('returns challengeTimeLeft that starts at durationSeconds', () => {
    const { result } = triggerChallenge();
    expect(result.current.challengeTimeLeft).toBeGreaterThan(0);
  });

  describe('startsWith challenge', () => {
    it('completes when a word starting with the target letter is found', () => {
      const { result, rerender } = triggerChallengeType('startsWith');
      expect(result.current.activeChallenge?.type).toBe('startsWith');
      rerender({ timeRemaining: 60, wordsFound: ['STAR'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(true);
    });

    it('does NOT complete for wrong starting letter', () => {
      const { result, rerender } = triggerChallengeType('startsWith');
      rerender({ timeRemaining: 60, wordsFound: ['APPLE'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(false);
    });
  });

  describe('endsWith challenge', () => {
    it('completes when a word ending with ING is found', () => {
      const { result, rerender } = triggerChallengeType('endsWith');
      expect(result.current.activeChallenge?.type).toBe('endsWith');
      rerender({ timeRemaining: 60, wordsFound: ['RUNNING'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(true);
    });

    it('does NOT complete for word not ending with ING', () => {
      const { result, rerender } = triggerChallengeType('endsWith');
      rerender({ timeRemaining: 60, wordsFound: ['APPLE'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(false);
    });
  });

  describe('doubleLetters challenge', () => {
    it('completes when a word with consecutive double letters is found', () => {
      const { result, rerender } = triggerChallengeType('doubleLetters');
      expect(result.current.activeChallenge?.type).toBe('doubleLetters');
      rerender({ timeRemaining: 60, wordsFound: ['BOOK'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(true);
    });

    it('does NOT complete for word without consecutive doubles', () => {
      const { result, rerender } = triggerChallengeType('doubleLetters');
      rerender({ timeRemaining: 60, wordsFound: ['BAKE'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(false);
    });
  });

  describe('palindrome challenge', () => {
    it('completes when a palindrome of sufficient length is found', () => {
      const { result, rerender } = triggerChallengeType('palindrome');
      expect(result.current.activeChallenge?.type).toBe('palindrome');
      rerender({ timeRemaining: 60, wordsFound: ['KAYAK'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(true);
    });

    it('does NOT complete for too-short palindrome', () => {
      const { result, rerender } = triggerChallengeType('palindrome');
      // param=3, so 2-letter palindrome shouldn't count
      rerender({ timeRemaining: 60, wordsFound: ['AA'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(false);
    });

    it('does NOT complete for non-palindrome', () => {
      const { result, rerender } = triggerChallengeType('palindrome');
      rerender({ timeRemaining: 60, wordsFound: ['APPLE'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(false);
    });
  });

  describe('exactLength challenge', () => {
    it('completes when a word of exact length is found', () => {
      const { result, rerender } = triggerChallengeType('exactLength');
      expect(result.current.activeChallenge?.type).toBe('exactLength');
      // param=6
      rerender({ timeRemaining: 60, wordsFound: ['TIGERS'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(true);
    });

    it('does NOT complete for wrong length', () => {
      const { result, rerender } = triggerChallengeType('exactLength');
      rerender({ timeRemaining: 60, wordsFound: ['TIGER'], lastWordTileTypes: undefined }); // 5 letters, need 6
      expect(result.current.isChallengeComplete).toBe(false);
    });
  });

  describe('useGoldTile challenge', () => {
    it('completes when lastWordTileTypes includes gold', () => {
      const { result, rerender } = triggerChallengeType('useGoldTile');
      expect(result.current.activeChallenge?.type).toBe('useGoldTile');
      rerender({ timeRemaining: 60, wordsFound: ['CAT'], lastWordTileTypes: ['standard', 'gold', 'standard'] });
      expect(result.current.isChallengeComplete).toBe(true);
    });

    it('does NOT complete without gold tiles', () => {
      const { result, rerender } = triggerChallengeType('useGoldTile');
      rerender({ timeRemaining: 60, wordsFound: ['CAT'], lastWordTileTypes: ['standard', 'standard', 'standard'] });
      expect(result.current.isChallengeComplete).toBe(false);
    });
  });

  describe('fastWord challenge', () => {
    it('completes when a word is found quickly after challenge start', () => {
      const { result, rerender } = triggerChallengeType('fastWord');
      expect(result.current.activeChallenge?.type).toBe('fastWord');
      // Find word immediately (within param=10 seconds)
      rerender({ timeRemaining: 60, wordsFound: ['CAT'], lastWordTileTypes: undefined });
      expect(result.current.isChallengeComplete).toBe(true);
    });
  });

  describe('multiple triggers per level', () => {
    it('triggers a second challenge at 60% after first is dismissed', () => {
      const { result, rerender } = renderHook(
        ({ timeRemaining, wordsFound }) =>
          useFlashChallenge({ ...baseProps, timeRemaining, wordsFound }),
        { initialProps: { timeRemaining: 69, wordsFound: [] as string[] } }
      );
      // First challenge at 31%
      expect(result.current.activeChallenge).not.toBeNull();
      const firstType = result.current.activeChallenge!.type;

      // Dismiss first challenge
      act(() => { result.current.dismiss(); });
      expect(result.current.activeChallenge).toBeNull();

      // Advance to 61% elapsed
      rerender({ timeRemaining: 39, wordsFound: [] });
      expect(result.current.activeChallenge).not.toBeNull();
    });

    it('triggers a third challenge at 85% after second is dismissed', () => {
      const { result, rerender } = renderHook(
        ({ timeRemaining, wordsFound }) =>
          useFlashChallenge({ ...baseProps, timeRemaining, wordsFound }),
        { initialProps: { timeRemaining: 69, wordsFound: [] as string[] } }
      );
      // Dismiss first (30%)
      act(() => { result.current.dismiss(); });

      // Trigger + dismiss second (60%)
      rerender({ timeRemaining: 39, wordsFound: [] });
      expect(result.current.activeChallenge).not.toBeNull();
      act(() => { result.current.dismiss(); });

      // Trigger third (85%)
      rerender({ timeRemaining: 14, wordsFound: [] });
      expect(result.current.activeChallenge).not.toBeNull();
    });

    it('does not trigger a fourth challenge after all 3 thresholds used', () => {
      const { result, rerender } = renderHook(
        ({ timeRemaining, wordsFound }) =>
          useFlashChallenge({ ...baseProps, timeRemaining, wordsFound }),
        { initialProps: { timeRemaining: 69, wordsFound: [] as string[] } }
      );
      // Dismiss all 3
      act(() => { result.current.dismiss(); });
      rerender({ timeRemaining: 39, wordsFound: [] });
      act(() => { result.current.dismiss(); });
      rerender({ timeRemaining: 14, wordsFound: [] });
      act(() => { result.current.dismiss(); });

      // No more challenges at 95%
      rerender({ timeRemaining: 5, wordsFound: [] });
      expect(result.current.activeChallenge).toBeNull();
    });
  });
});
