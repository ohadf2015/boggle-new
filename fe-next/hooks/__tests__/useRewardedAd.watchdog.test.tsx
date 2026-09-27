/**
 * useRewardedAd — hook-level stuck-state watchdog
 *
 * The `status` state machine (idle → loading → showing → completed/error →
 * idle) trusts each ad platform to fire a terminal callback. If a provider's
 * SDK hangs and fires NOTHING — no reward, no error, no dismiss — status sticks
 * at 'showing' forever and `showAd`'s in-flight guard permanently disables the
 * button: the user can never watch another ad ("reward ads timer stuck").
 *
 * useAdMob has its own native watchdogs, but they don't cover every hole
 * (e.g. a hanging `whenReady()`), and CrazyGames/H5 paths have NO timeout at
 * all. This hook-level backstop guarantees status always returns to idle no
 * matter which platform stalls. It is a LONG backstop (above AdMob's ~102s
 * worst-case legit path) so it never preempts a genuinely late reward.
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const showRewardedMock = vi.fn();

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showRewardedAd: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: true, showRewarded: showRewardedMock, prepareRewarded: vi.fn() }),
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd: vi.fn().mockResolvedValue({ awarded: 30 }),
    rewards: { WATCH_AD: 30 },
  }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — stuck-state watchdog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    showRewardedMock.mockReset();
    // Simulate a hung provider: never invokes onReward NOR onError.
    showRewardedMock.mockImplementation(() => { /* no callback ever fires */ });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('force-resets status to idle when the provider never fires a callback', () => {
    const { result } = renderHook(() => useRewardedAd());

    act(() => { result.current.showAd(); });
    // Native AdMob path sets 'showing' before delegating to the (hung) provider.
    expect(result.current.status).toBe('showing');

    // Advance past the long backstop.
    act(() => { vi.advanceTimersByTime(125_000); });

    expect(result.current.status).toBe('idle');
  });

  it('re-enables showAd after the watchdog rescues a hung ad', () => {
    const { result } = renderHook(() => useRewardedAd());

    act(() => { result.current.showAd(); });
    expect(showRewardedMock).toHaveBeenCalledTimes(1);

    // While stuck at 'showing', the guard blocks a second attempt.
    act(() => { result.current.showAd(); });
    expect(showRewardedMock).toHaveBeenCalledTimes(1);

    // Watchdog rescues → idle → second attempt now allowed.
    act(() => { vi.advanceTimersByTime(125_000); });
    expect(result.current.status).toBe('idle');

    act(() => { result.current.showAd(); });
    expect(showRewardedMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT preempt a legitimate reward that arrives before the backstop', async () => {
    let capturedOnReward: (() => void) | null = null;
    showRewardedMock.mockImplementation((onReward: () => void) => { capturedOnReward = onReward; });

    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });

    // Reward lands at a realistic time (well under the backstop).
    await act(async () => {
      vi.advanceTimersByTime(20_000);
      capturedOnReward!();
      await Promise.resolve();
    });
    expect(result.current.status).toBe('completed');

    // The backstop firing later must NOT clobber the completed/idle flow into
    // a spurious error or re-trigger.
    act(() => { vi.advanceTimersByTime(125_000); });
    expect(['completed', 'idle']).toContain(result.current.status);
  });
});
