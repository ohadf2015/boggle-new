/**
 * useRewardedAd — rewarded-ad funnel tracking.
 *
 * Funnel: offered (caller-side) → watched (reward granted) | declined (dismiss/error).
 * The hook fires watched/declined because it's the single chokepoint for all
 * platforms (CrazyGames, AdMob, simulation, no-ad-placeholder).
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdWatched: vi.fn(),
  trackRewardedAdDeclined: vi.fn(),
}));

const awardWatchedAd = vi.fn().mockResolvedValue({ awarded: 30 });

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showRewardedAd: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: false, showRewarded: vi.fn() }),
}));


vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd,
    rewards: { WATCH_AD: 30 },
  }),
}));

import { useRewardedAd } from '../useRewardedAd';
import { trackRewardedAdWatched, trackRewardedAdDeclined } from '@/utils/growthTracking';

describe('useRewardedAd analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset daily ad view storage so daily cap doesn't block tests
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lexiclash_daily_ad_views');
      localStorage.removeItem('lexiclash_placeholder_ad_timestamps');
    }
  });

  it('fires trackRewardedAdDeclined with no_ad_provider when no real provider on web', async () => {
    // NODE_ENV='test' in vitest → isDev=false → placeholder is blocked, not granted.
    // The hook must decline with reason='no_ad_provider' so analytics see the
    // shadow demand (button taps that find no provider).
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(trackRewardedAdWatched).not.toHaveBeenCalled();
    expect(trackRewardedAdDeclined).toHaveBeenCalled();
    const args = (trackRewardedAdDeclined as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0]).toBe('no_ad_provider');
    expect(args[1]).toBe('no-ad-placeholder');
  });

  it('fires trackRewardedAdDeclined with reason=daily_limit when cap reached', () => {
    // Seed localStorage to simulate daily cap reached.
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      'lexiclash_daily_ad_views',
      JSON.stringify({ date: today, count: 10 }),
    );

    const { result } = renderHook(() => useRewardedAd());
    act(() => {
      result.current.showAd();
    });

    expect(trackRewardedAdDeclined).toHaveBeenCalledWith(
      'daily_limit_reached',
      expect.any(String),
      undefined,
    );
    expect(trackRewardedAdWatched).not.toHaveBeenCalled();
  });
});
