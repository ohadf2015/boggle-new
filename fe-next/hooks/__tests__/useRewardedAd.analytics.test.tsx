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
  trackRewardedAdOffered: vi.fn(),
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
import { trackRewardedAdOffered, trackRewardedAdWatched, trackRewardedAdDeclined } from '@/utils/growthTracking';

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
      'generic',
    );
    expect(trackRewardedAdWatched).not.toHaveBeenCalled();
  });

  it('threads explicit surface into the declined event', () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(
      'lexiclash_daily_ad_views',
      JSON.stringify({ date: today, count: 10 }),
    );

    const { result } = renderHook(() => useRewardedAd({ analyticsSurface: 'blast_wave_continue' }));
    act(() => {
      result.current.showAd();
    });

    expect(trackRewardedAdDeclined).toHaveBeenCalledWith(
      'daily_limit_reached',
      expect.any(String),
      'blast_wave_continue',
    );
  });

  it('does not fire trackRewardedAdOffered when declined at no_ad_provider gate', async () => {
    const { result } = renderHook(() => useRewardedAd());
    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });
    // offered fires only after all guards pass; no_ad_provider is an early return
    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
    expect(trackRewardedAdDeclined).toHaveBeenCalledWith('no_ad_provider', expect.any(String), expect.any(String));
  });

  it('does not fire trackRewardedAdOffered when declined at daily_limit gate', () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('lexiclash_daily_ad_views', JSON.stringify({ date: today, count: 10 }));
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    expect(trackRewardedAdOffered).not.toHaveBeenCalled();
  });
});
