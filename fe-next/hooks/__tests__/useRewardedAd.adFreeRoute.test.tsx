import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const showRewarded = vi.fn(async () => true);
const trackRewardedAdDeclined = vi.fn();

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: true, showRewarded, prepareRewarded: vi.fn() }),
}));
vi.mock('@/hooks/useH5GamesAds', () => ({ useH5GamesAds: () => ({ isAvailable: false }) }));
vi.mock('@/hooks/useGameDistributionAds', () => ({ useGameDistributionAds: () => ({ isAvailable: false }) }));
vi.mock('@/hooks/useAyetVideoAds', () => ({ useAyetVideoAds: () => ({ isAvailable: false }) }));
vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isAvailable: false, isOnCrazyGamesPlatform: false }),
}));
vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: vi.fn(),
  trackRewardedAdWatched: vi.fn(),
  trackRewardedAdDeclined: (...a: unknown[]) => trackRewardedAdDeclined(...a),
  trackGrowthEvent: vi.fn(),
}));
vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd: vi.fn(async () => ({ awarded: 25 })),
    rewards: { WATCH_AD: 25 },
  }),
}));

import { useRewardedAd } from '../useRewardedAd';

describe('useRewardedAd — teacher/education surfaces never show ads', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
    showRewarded.mockClear();
    trackRewardedAdDeclined.mockClear();
  });

  it.each([
    '/en/teacher/classes',
    '/he/student',
    '/en/join/AB3K9Z',
    '/en/multiplayer?room=ABC&classroom=true',
  ])('hides the CTA and refuses to show an ad on %s', async (url) => {
    window.history.replaceState({}, '', url);
    const { result } = renderHook(() => useRewardedAd({ rewardKind: 'feature', surface: 'retry' }));
    expect(result.current.canShowAd).toBe(false);
    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });
    expect(showRewarded).not.toHaveBeenCalled();
    expect(trackRewardedAdDeclined.mock.calls.map((c) => c[0])).toContain('ad_free_route');
  });

  it('still offers ads on consumer multiplayer', () => {
    window.history.replaceState({}, '', '/en/multiplayer?room=ABC');
    const { result } = renderHook(() => useRewardedAd({ rewardKind: 'feature' }));
    expect(result.current.canShowAd).toBe(true);
  });
});
