/**
 * useRewardedAd — rewardKind option (coins vs feature).
 *
 * Bug: the hook unconditionally called awardWatchedAd() (+250g) on ad-complete,
 * even when the caller was using the ad to unlock a non-coin feature (retry,
 * continue, avatar part, streak-freeze). Result: feature unlocks silently also
 * granted 250g on top of the advertised reward, inflating the economy.
 *
 * Fix: rewardKind option (default 'coins' for back-compat). When 'feature',
 * the hook invokes onRewardEarned without calling awardWatchedAd.
 */
import { renderHook, act } from '@testing-library/react';

const awardWatchedAdMock = vi.fn().mockResolvedValue({ awarded: 250 });

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showRewardedAd: vi.fn(),
  }),
}));

// Mock AdMob as a working real provider so the hook routes through the
// AdMob branch (not the now-blocked placeholder branch). These tests verify
// the rewardKind logic, which is independent of the web-no-provider block.
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({
    isAvailable: true,
    showRewarded: vi.fn((onReward: () => void) => onReward()),
  }),
}));

vi.mock('@/hooks/useAdPlacement', () => ({
  useAdPlacement: () => ({ isReady: false, showRewarded: vi.fn() }),
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd: awardWatchedAdMock,
    rewards: { WATCH_AD: 250 },
  }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdWatched: vi.fn(),
  trackRewardedAdDeclined: vi.fn(),
  trackRewardedAdOffered: vi.fn(),
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — rewardKind', () => {
  beforeEach(() => {
    awardWatchedAdMock.mockClear();
    // NODE_ENV='test' (vitest default) → isPlaceholder path grants reward synchronously
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it("defaults rewardKind to 'coins' and calls awardWatchedAd on reward", async () => {
    const onRewardEarned = vi.fn();
    const { result } = renderHook(() => useRewardedAd({ onRewardEarned }));

    await act(async () => {
      result.current.showAd();
      // flush placeholder-path microtasks
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(awardWatchedAdMock).toHaveBeenCalledTimes(1);
    expect(onRewardEarned).toHaveBeenCalledTimes(1);
  });

  it("with rewardKind='feature', does NOT call awardWatchedAd but still fires onRewardEarned", async () => {
    const onRewardEarned = vi.fn();
    const { result } = renderHook(() =>
      useRewardedAd({ onRewardEarned, rewardKind: 'feature' }),
    );

    await act(async () => {
      result.current.showAd();
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(awardWatchedAdMock).not.toHaveBeenCalled();
    expect(onRewardEarned).toHaveBeenCalledTimes(1);
  });

  it('when awardWatchedAd returns null (DB failure), fires onAdError and suppresses onRewardEarned + analytics', async () => {
    // Simulate a server-side rejection (e.g. daily cap reached, DB error)
    awardWatchedAdMock.mockResolvedValueOnce(null);

    const onRewardEarned = vi.fn();
    const onAdError = vi.fn();
    const { trackRewardedAdWatched } = await import('@/utils/growthTracking');
    const trackMock = vi.mocked(trackRewardedAdWatched);
    trackMock.mockClear();

    const { result } = renderHook(() =>
      useRewardedAd({ onRewardEarned, onAdError }),
    );

    await act(async () => {
      result.current.showAd();
      await new Promise((r) => setTimeout(r, 0));
    });

    // Reward must NOT be reported as successful
    expect(onRewardEarned).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
    // Caller must be notified of the failure
    expect(onAdError).toHaveBeenCalledTimes(1);
  });
});
