import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const trackRewardedAdDeclined = vi.fn();

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: true, showRewarded: vi.fn(async () => true), prepareRewarded: vi.fn() }),
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

const DAILY_KEY = 'lexiclash_daily_ad_views';

/**
 * The cap exists to protect the COIN economy — it stops a player minting unlimited
 * gold from `rewardKind: 'coins'` ads. But it was one global counter, so it also
 * throttled `rewardKind: 'feature'` ads (retry, extra life, hint reveal, streak
 * freeze — 23 call sites), which mint no coins at all. Rewarded is by far the
 * highest-eCPM format we serve (~20x banner per impression), so capping the format
 * that doesn't inflate anything was pure lost revenue AND a worse player experience.
 */
describe('useRewardedAd — daily cap is a COIN budget, not an ad budget', () => {
  beforeEach(() => {
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 10 }),
    );
    trackRewardedAdDeclined.mockClear();
  });

  afterEach(() => {
    localStorage.removeItem(DAILY_KEY);
  });

  it('still caps coin-granting ads once the daily budget is spent', () => {
    const { result } = renderHook(() => useRewardedAd({ rewardKind: 'coins' }));
    expect(result.current.isDailyLimitReached).toBe(true);
    expect(result.current.canShowAd).toBe(false);
  });

  it('does NOT cap feature unlocks — they mint no coins', () => {
    const { result } = renderHook(() => useRewardedAd({ rewardKind: 'feature' }));
    expect(result.current.isDailyLimitReached).toBe(false);
    expect(result.current.canShowAd).toBe(true);
  });

  it('does not decline a feature ad with daily_limit_reached', async () => {
    const { result } = renderHook(() =>
      useRewardedAd({ rewardKind: 'feature', surface: 'retry' }),
    );
    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });
    const reasons = trackRewardedAdDeclined.mock.calls.map((c) => c[0]);
    expect(reasons).not.toContain('daily_limit_reached');
  });

  it('does not spend the coin budget on a feature unlock', async () => {
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 0 }),
    );
    const { result } = renderHook(() =>
      useRewardedAd({ rewardKind: 'feature', surface: 'retry' }),
    );
    await act(async () => {
      result.current.showAd();
      await Promise.resolve();
    });
    const stored = JSON.parse(localStorage.getItem(DAILY_KEY) ?? '{"count":0}');
    expect(stored.count).toBe(0);
  });

  it('still bounds feature unlocks at a much higher abuse ceiling', () => {
    // Removing the coin cap from feature ads must not leave them globally
    // unbounded — some surfaces (blast_wave_continue, daily_retry) are per-wave
    // or per-attempt, not per-day, so game rules alone are not a day bound.
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 0, featureCount: 40 }),
    );
    const { result } = renderHook(() => useRewardedAd({ rewardKind: 'feature' }));
    expect(result.current.isDailyLimitReached).toBe(true);
  });

  it('leaves the coin budget untouched when the feature ceiling is hit', () => {
    localStorage.setItem(
      DAILY_KEY,
      JSON.stringify({ date: new Date().toISOString().slice(0, 10), count: 0, featureCount: 40 }),
    );
    const { result } = renderHook(() => useRewardedAd({ rewardKind: 'coins' }));
    expect(result.current.isDailyLimitReached).toBe(false);
  });
});

