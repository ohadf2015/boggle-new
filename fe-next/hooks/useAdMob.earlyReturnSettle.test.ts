import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// --- Plugin mock -----------------------------------------------------------
const prepareRewardVideoAd = vi.fn(() => Promise.resolve());
const showRewardVideoAd = vi.fn(() => Promise.resolve());
const addListener = vi.fn(() => Promise.resolve({ remove: vi.fn() }));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: (...args: unknown[]) => addListener(...args),
    prepareRewardVideoAd: (...args: unknown[]) => prepareRewardVideoAd(...args),
    showRewardVideoAd: (...args: unknown[]) => showRewardVideoAd(...args),
  },
  RewardAdPluginEvents: { Rewarded: 'Rewarded', Dismissed: 'Dismissed', FailedToShow: 'FailedToShow', FailedToLoad: 'FailedToLoad' },
  RewardInterstitialAdPluginEvents: { Rewarded: 'RI_Rewarded', Dismissed: 'RI_Dismissed', FailedToShow: 'RI_FailedToShow', FailedToLoad: 'RI_FailedToLoad' },
  InterstitialAdPluginEvents: {},
  BannerAdSize: {},
  BannerAdPosition: {},
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedLifecycle: vi.fn(),
}));

// --- Configurable context mock --------------------------------------------
// Mutable so each test can simulate "ads removed" or "config not loaded yet".
const ctx = {
  hasNoAds: false,
  config: { rewardedAdId: 'r-1', rewardedUnits: { generic: 'r-1' } } as unknown,
};
vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({
    recordGameEnd: vi.fn(),
    shouldShowInterstitial: () => false,
    recordInterstitialShown: vi.fn(),
    hasNoAds: () => ctx.hasNoAds,
    getConfig: () => ctx.config,
    whenReady: () => Promise.resolve(),
    prepareInterstitial: vi.fn(),
    isInterstitialReady: () => false,
    consumeInterstitial: vi.fn(),
  }),
}));

import { useAdMob } from './useAdMob';

const flush = () => Promise.resolve();

describe('useAdMob.showRewarded — early-return paths must settle the caller', () => {
  beforeEach(() => {
    ctx.hasNoAds = false;
    ctx.config = { rewardedAdId: 'r-1', rewardedUnits: { generic: 'r-1' } };
    prepareRewardVideoAd.mockClear();
    showRewardVideoAd.mockClear();
  });

  it('config not loaded (getConfig null) → signals onError, never strands the caller silently', async () => {
    ctx.config = null;
    const { result } = renderHook(() => useAdMob());
    const onReward = vi.fn();
    const onError = vi.fn();

    await result.current.showRewarded(onReward, onError);
    await flush();

    expect(onReward).not.toHaveBeenCalled();
    // The bug: showRewarded returned silently, leaving the caller pinned at
    // status='showing' with the game clock paused until the 120s watchdog.
    expect(onError).toHaveBeenCalledTimes(1);
    // It must NOT have tried to load/show an ad with a null config.
    expect(prepareRewardVideoAd).not.toHaveBeenCalled();
  });

  it('ads removed (hasNoAds) → signals onError, never strands the caller silently', async () => {
    ctx.hasNoAds = true;
    const { result } = renderHook(() => useAdMob());
    const onReward = vi.fn();
    const onError = vi.fn();

    await result.current.showRewarded(onReward, onError);
    await flush();

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(showRewardVideoAd).not.toHaveBeenCalled();
  });
});
