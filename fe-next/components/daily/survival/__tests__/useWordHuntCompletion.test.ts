import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/dailyChallenge', () => ({
  saveWordHuntResult: vi.fn(() => ({ currentStreak: 1 })),
}));
vi.mock('@/utils/growthTracking', () => ({ trackDailyPuzzle: vi.fn(), trackGrowthEvent: vi.fn() }));
vi.mock('../../analytics/wordHuntCompletePayload', () => ({ buildDailyWordHuntCompletePayload: () => ({}) }));
vi.mock('@/lib/avatar/revealTrigger', () => ({ levelUpFromRecordGame: vi.fn(), publishLevelUp: vi.fn() }));
const clearWordHuntRunStarted = vi.fn();
vi.mock('../runStartedMarker', () => ({ clearWordHuntRunStarted: (...a: unknown[]) => clearWordHuntRunStarted(...a) }));

import { useWordHuntCompletion, INTERSTITIAL_RESULTS_CAP_MS } from '../useWordHuntCompletion';

const result = {
  solved: true, attemptsUsed: 1, targetWord: 'CAT', attempts: [], wordsDiscovered: [], lifeRemaining: 50,
  clueTokensEarned: 0, clueTokensSpent: 0, hintsUnlocked: 0, efficiencyScore: 500,
};

function setup(showInterstitial: () => Promise<unknown>) {
  const onShowResults = vi.fn();
  const { result: hook } = renderHook(() => useWordHuntCompletion({
    isPractice: false, isCatchup: false, puzzleNumber: 1, puzzleDate: '2026-10-30', gameLanguage: 'en', meaning: null,
    extraTries: 0, isAuthenticated: false, gameStartedAtRef: { current: 0 }, recordStreak: vi.fn(), showInterstitial,
    setGameResult: vi.fn(), setStoredResult: vi.fn(), onShowResults, t: (k: string) => k,
  }));
  return { complete: hook.current, onShowResults };
}

describe('useWordHuntCompletion', () => {
  beforeEach(() => { vi.useFakeTimers(); clearWordHuntRunStarted.mockClear(); });
  afterEach(() => vi.useRealTimers());

  it('given the interstitial never settles, when the run ends, then results still open after the cap', async () => {
    const { complete, onShowResults } = setup(() => new Promise(() => {}));
    act(() => complete(result));
    await act(async () => { await vi.advanceTimersByTimeAsync(INTERSTITIAL_RESULTS_CAP_MS - 1); });
    expect(onShowResults).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(onShowResults).toHaveBeenCalledTimes(1);
  });

  it('given the interstitial settles quickly, when the run ends, then results open once', async () => {
    const { complete, onShowResults } = setup(() => Promise.resolve());
    act(() => complete(result));
    await act(async () => { await vi.advanceTimersByTimeAsync(INTERSTITIAL_RESULTS_CAP_MS * 2); });
    expect(onShowResults).toHaveBeenCalledTimes(1);
  });

  it('given a finished run, when completed, then the unfinished-run marker is cleared', () => {
    const { complete } = setup(() => Promise.resolve());
    act(() => complete(result));
    expect(clearWordHuntRunStarted).toHaveBeenCalledWith('en');
  });
});
