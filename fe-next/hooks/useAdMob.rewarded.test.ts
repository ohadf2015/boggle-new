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

// --- Context mock ----------------------------------------------------------
vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({
    recordGameEnd: vi.fn(),
    shouldShowInterstitial: () => false,
    recordInterstitialShown: vi.fn(),
    hasNoAds: () => false,
    getConfig: () => ({ rewardedAdId: 'r-1', rewardedUnits: { generic: 'r-1' } }),
    whenReady: () => Promise.resolve(),
  }),
}));

import { useAdMob, REWARD_PREPARE_TIMEOUT_MS } from './useAdMob';

const flush = () => Promise.resolve();

describe('useAdMob.showRewarded — prepare-phase stall guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    prepareRewardVideoAd.mockReset();
    showRewardVideoAd.mockReset();
    addListener.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not freeze when prepare hangs — settles via timeout with a retry error', async () => {
    // prepare never resolves (AdMob no-fill / cold-start stall)
    prepareRewardVideoAd.mockReturnValue(new Promise<void>(() => {}));
    showRewardVideoAd.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAdMob());
    const onReward = vi.fn();
    const onError = vi.fn();

    result.current.showRewarded(onReward, onError);

    // let listener registration + whenReady() microtasks drain
    await flush();
    await flush();

    // before the timeout: still waiting, no error yet
    expect(onError).not.toHaveBeenCalled();

    // advance to the bounded prepare timeout
    await vi.advanceTimersByTimeAsync(REWARD_PREPARE_TIMEOUT_MS + 10);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReward).not.toHaveBeenCalled();
    // crucially: we never showed an un-listened ad after bailing
    expect(showRewardVideoAd).not.toHaveBeenCalled();
  });

  it('shows the ad normally when prepare resolves before the timeout', async () => {
    prepareRewardVideoAd.mockResolvedValue(undefined);
    showRewardVideoAd.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAdMob());
    const onReward = vi.fn();
    const onError = vi.fn();

    result.current.showRewarded(onReward, onError);

    await flush();
    await flush();
    await flush();
    await flush();

    expect(showRewardVideoAd).toHaveBeenCalledTimes(1);
    // no premature error from the prepare-timeout path
    expect(onError).not.toHaveBeenCalled();
  });
});
