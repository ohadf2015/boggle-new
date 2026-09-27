/**
 * useRewardedAd — every completed ad ends with the shared celebration
 * (haptic + confetti + thank-you) so no placement feels like a dead end.
 */
import { renderHook, act } from '@testing-library/react';

const { celebrateAdReward } = vi.hoisted(() => ({ celebrateAdReward: vi.fn() }));
vi.mock('@/lib/ads/rewardCelebration', () => ({ celebrateAdReward }));

const awardWatchedAdMock = vi.fn().mockResolvedValue({ awarded: 250 });

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isAvailable: false, isOnCrazyGamesPlatform: false, showRewardedAd: vi.fn() }),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));
vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: true, showRewarded: vi.fn((onReward: () => void) => onReward()) }),
}));
vi.mock('@/hooks/useAdPlacement', () => ({
  useAdPlacement: () => ({ isReady: false, showRewarded: vi.fn() }),
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({ awardWatchedAd: awardWatchedAdMock, rewards: { WATCH_AD: 250 } }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdWatched: vi.fn(),
  trackRewardedAdDeclined: vi.fn(),
  trackRewardedAdOffered: vi.fn(),
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — reward celebration', () => {
  beforeEach(() => {
    celebrateAdReward.mockClear();
    awardWatchedAdMock.mockClear();
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('Given a feature ad completes, When the reward lands, Then the celebration fires with the surface', async () => {
    const { result } = renderHook(() => useRewardedAd({ rewardKind: 'feature', surface: 'timeLow' }));
    await act(async () => {
      result.current.showAd();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(celebrateAdReward).toHaveBeenCalledTimes(1);
    expect(celebrateAdReward).toHaveBeenCalledWith(expect.objectContaining({ rewardKind: 'feature', surface: 'timeLow', awarded: 0 }));
  });

  it('Given a coin ad completes, When the reward lands, Then the celebration carries the awarded amount', async () => {
    const { result } = renderHook(() => useRewardedAd({}));
    await act(async () => {
      result.current.showAd();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(celebrateAdReward).toHaveBeenCalledWith(expect.objectContaining({ rewardKind: 'coins', awarded: 250 }));
  });

  it('Given the coin grant fails, When the ad completes, Then nothing is celebrated', async () => {
    awardWatchedAdMock.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useRewardedAd({}));
    await act(async () => {
      result.current.showAd();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(celebrateAdReward).not.toHaveBeenCalled();
  });
});
