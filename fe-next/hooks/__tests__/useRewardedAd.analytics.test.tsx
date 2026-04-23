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

  it('fires trackRewardedAdWatched when reward is granted (placeholder path)', async () => {
    const { result } = renderHook(() => useRewardedAd());

    await act(async () => {
      result.current.showAd();
      // Placeholder path awards synchronously via awardCoinsAndNotify promise chain.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(trackRewardedAdWatched).toHaveBeenCalledTimes(1);
    const args = (trackRewardedAdWatched as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0]).toBe('no-ad-placeholder');
    expect(args[1]).toBe(30);
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
