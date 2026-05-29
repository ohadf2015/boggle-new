import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// --- Plugin mock -----------------------------------------------------------
const prepareRewardVideoAd = vi.fn();
const showRewardVideoAd = vi.fn();
const addListener = vi.fn(() => Promise.resolve({ remove: vi.fn() }));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: (...args: unknown[]) => addListener(...args),
    prepareRewardVideoAd: (...args: unknown[]) => prepareRewardVideoAd(...args),
    showRewardVideoAd: (...args: unknown[]) => showRewardVideoAd(...args),
  },
  RewardAdPluginEvents: {
    Rewarded: 'Rewarded',
    Dismissed: 'Dismissed',
    FailedToShow: 'FailedToShow',
    FailedToLoad: 'FailedToLoad',
  },
  InterstitialAdPluginEvents: {},
  BannerAdSize: {},
  BannerAdPosition: {},
}));

// --- Context mock: whenReady NEVER resolves (AdMob init stalls) -------------
vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({
    recordGameEnd: vi.fn(),
    shouldShowInterstitial: () => false,
    recordInterstitialShown: vi.fn(),
    hasNoAds: () => false,
    getConfig: () => ({ rewardedAdId: 'r-1', rewardedUnits: { generic: 'r-1' } }),
    whenReady: () => new Promise<void>(() => {}), // hangs forever
  }),
}));

import { useAdMob, REWARD_PREPARE_TIMEOUT_MS } from './useAdMob';

const flush = () => Promise.resolve();

describe('useAdMob.showRewarded — hung whenReady() guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    prepareRewardVideoAd.mockReset();
    showRewardVideoAd.mockReset();
    addListener.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not freeze when AdMob init (whenReady) never resolves — settles via the prepare timeout', async () => {
    prepareRewardVideoAd.mockResolvedValue(undefined);
    showRewardVideoAd.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAdMob());
    const onReward = vi.fn();
    const onError = vi.fn();

    result.current.showRewarded(onReward, onError);

    await flush();
    await flush();

    // whenReady() is hung → we never reached prepare/show yet
    expect(prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    // The prepare timeout must still fire even though whenReady() never resolved.
    await vi.advanceTimersByTimeAsync(REWARD_PREPARE_TIMEOUT_MS + 10);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReward).not.toHaveBeenCalled();
    expect(showRewardVideoAd).not.toHaveBeenCalled();
  });
});
