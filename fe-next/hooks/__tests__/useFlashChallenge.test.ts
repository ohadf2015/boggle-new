import { renderHook, act } from '@testing-library/react';
import { useFlashChallenge } from '../useFlashChallenge';

jest.useFakeTimers();

const baseProps = { worldId: 1, totalTimeSeconds: 100, isPlaying: true };

describe('useFlashChallenge', () => {
  afterEach(() => { jest.clearAllTimers(); });

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
    const { result, rerender } = renderHook(
      ({ timeRemaining, wordsFound }) =>
        useFlashChallenge({ ...baseProps, timeRemaining, wordsFound }),
      { initialProps: { timeRemaining: 69, wordsFound: [] as string[] } }
    );
    // active challenge triggered
    expect(result.current.activeChallenge).not.toBeNull();
    rerender({ timeRemaining: 60, wordsFound: ['AMAZING'] }); // 7-letter word
    expect(result.current.isChallengeComplete).toBe(true);
  });

  it('dismiss() clears the challenge', () => {
    const { result, rerender } = renderHook(
      ({ timeRemaining }) => useFlashChallenge({ ...baseProps, timeRemaining, wordsFound: [] }),
      { initialProps: { timeRemaining: 69 } }
    );
    expect(result.current.activeChallenge).not.toBeNull();
    act(() => { result.current.dismiss(); });
    expect(result.current.activeChallenge).toBeNull();
  });
});
