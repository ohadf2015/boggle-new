import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/utils/dailyChallenge', () => ({
  saveWordWheelResult: vi.fn(),
  getDailyStreak: vi.fn(() => ({ currentStreak: 1 })),
  updateDailyStreak: vi.fn(() => ({ currentStreak: 1 })),
  getDailyChallengeDate: vi.fn(() => '2026-11-06'),
}));
vi.mock('../submitWordWheelDailyResult', () => ({ submitWordWheelDailyResult: vi.fn() }));
vi.mock('../WheelTimeUpStamp', () => ({ shouldPlayFinishBeat: vi.fn(() => false) }));

import { useWheelCompletion } from '../useWheelCompletion';
import { shouldPlayFinishBeat } from '../WheelTimeUpStamp';

const result = { wordsFound: ['cat'], score: 10, timeSeconds: 60 };
const meta = { puzzleDate: '2026-11-06', puzzleNumber: 1, centerLetter: 'a' };

function setup(overrides: { isCatchup?: boolean; isPractice?: boolean; showInterstitial?: (p: string) => Promise<unknown> } = {}) {
  const setPhase = vi.fn();
  const hook = renderHook(() =>
    useWheelCompletion({
      language: 'en',
      isPractice: overrides.isPractice ?? false,
      isCatchup: overrides.isCatchup ?? false,
      isAuthenticated: false,
      profile: null,
      guestFingerprint: null,
      setGameActive: vi.fn(),
      setGameResult: vi.fn(),
      setPhase,
      showInterstitial: overrides.showInterstitial,
    }),
  );
  return { hook, setPhase };
}

describe('useWheelCompletion — interstitial at the results break', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('Given a daily wheel ends, When the interstitial settles, Then results open after it', async () => {
    let settle!: () => void;
    const showInterstitial = vi.fn(() => new Promise<void>((r) => { settle = r; }));
    const { hook, setPhase } = setup({ showInterstitial });

    act(() => hook.result.current.handleComplete(result, meta));
    expect(showInterstitial).toHaveBeenCalledWith(expect.stringMatching(/^word-wheel-complete/));
    expect(setPhase).not.toHaveBeenCalledWith('completed');

    await act(async () => { settle(); await Promise.resolve(); });
    expect(setPhase).toHaveBeenCalledWith('completed');
  });

  it('Given practice wheels replayed in one visit, When each ends, Then each gets its own break', async () => {
    const showInterstitial = vi.fn(() => Promise.resolve());
    const { hook } = setup({ isPractice: true, showInterstitial });

    act(() => hook.result.current.handleComplete(result, meta));
    act(() => hook.result.current.handleComplete(result, meta));
    const names = showInterstitial.mock.calls.map((c) => c[0]);
    expect(new Set(names).size).toBe(2);
  });

  it('Given the ad stalls, When the cap elapses, Then results open anyway', async () => {
    const showInterstitial = vi.fn(() => new Promise<void>(() => {}));
    const { hook, setPhase } = setup({ showInterstitial });

    act(() => hook.result.current.handleComplete(result, meta));
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(setPhase).toHaveBeenCalledWith('completed');
  });

  it('Given a catch-up day already paid with a rewarded ad, When it ends, Then no interstitial runs', () => {
    const showInterstitial = vi.fn(() => Promise.resolve());
    setup({ isCatchup: true, showInterstitial }).hook.result.current.handleComplete(result, meta);
    expect(showInterstitial).not.toHaveBeenCalled();
  });

  it('Given the buzzer beat plays, When it finishes, Then the interstitial runs before results', async () => {
    vi.mocked(shouldPlayFinishBeat).mockReturnValueOnce(true);
    const showInterstitial = vi.fn(() => Promise.resolve());
    const { hook, setPhase } = setup({ showInterstitial });

    act(() => hook.result.current.handleComplete(result, meta));
    expect(showInterstitial).not.toHaveBeenCalled();
    await act(async () => { hook.result.current.finishBeatDone(); await Promise.resolve(); });
    expect(showInterstitial).toHaveBeenCalledWith(expect.stringMatching(/^word-wheel-complete/));
    expect(setPhase).toHaveBeenCalledWith('completed');
  });
});
