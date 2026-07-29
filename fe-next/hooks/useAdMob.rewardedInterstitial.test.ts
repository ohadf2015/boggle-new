import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// --- Plugin mock (both video + interstitial APIs) --------------------------
const prepareRewardVideoAd = vi.fn();
const showRewardVideoAd = vi.fn();
const prepareRewardInterstitialAd = vi.fn();
const showRewardInterstitialAd = vi.fn();
const addListener = vi.fn(() => Promise.resolve({ remove: vi.fn() }));
// Capture registered listeners so the test can fire a Rewarded event.
const listeners: Record<string, (arg?: unknown) => void> = {};

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: (event: string, fn: (arg?: unknown) => void) => {
      listeners[event] = fn;
      return addListener(event, fn);
    },
    prepareRewardVideoAd: (...args: unknown[]) => prepareRewardVideoAd(...args),
    showRewardVideoAd: (...args: unknown[]) => showRewardVideoAd(...args),
    prepareRewardInterstitialAd: (...args: unknown[]) => prepareRewardInterstitialAd(...args),
    showRewardInterstitialAd: (...args: unknown[]) => showRewardInterstitialAd(...args),
  },
  RewardAdPluginEvents: {
    Rewarded: 'Rewarded',
    Dismissed: 'Dismissed',
    FailedToShow: 'FailedToShow',
    FailedToLoad: 'FailedToLoad',
  },
  RewardInterstitialAdPluginEvents: {
    Rewarded: 'RI_Rewarded',
    Dismissed: 'RI_Dismissed',
    FailedToShow: 'RI_FailedToShow',
    FailedToLoad: 'RI_FailedToLoad',
  },
  InterstitialAdPluginEvents: {},
  BannerAdSize: {},
  BannerAdPosition: {},
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedLifecycle: vi.fn(),
}));

const getConfig = vi.fn();
vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({
    recordGameEnd: vi.fn(),
    shouldShowInterstitial: () => false,
    recordInterstitialShown: vi.fn(),
    hasNoAds: () => false,
    getConfig: () => getConfig(),
    whenReady: () => Promise.resolve(),
  }),
}));

import { useAdMob } from './useAdMob';

const flush = () => Promise.resolve();

describe('useAdMob.showRewarded — rewarded-interstitial routing', () => {
  beforeEach(() => {
    prepareRewardVideoAd.mockReset().mockResolvedValue(undefined);
    showRewardVideoAd.mockReset().mockResolvedValue(undefined);
    prepareRewardInterstitialAd.mockReset().mockResolvedValue(undefined);
    showRewardInterstitialAd.mockReset().mockResolvedValue(undefined);
    addListener.mockClear();
    for (const k of Object.keys(listeners)) delete listeners[k];
    getConfig.mockReturnValue({
      rewardedAdId: 'r-1',
      rewardedUnits: { generic: 'r-1', doubleGold: 'ri-2' },
      rewardedInterstitialSurfaces: ['doubleGold'],
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('uses the VIDEO API for a non-flagged surface (proven path unchanged)', async () => {
    const { result } = renderHook(() => useAdMob());
    result.current.showRewarded(vi.fn(), vi.fn(), { surface: 'hint' });
    for (let i = 0; i < 6; i++) await flush();

    expect(prepareRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(showRewardVideoAd).toHaveBeenCalledTimes(1);
    expect(prepareRewardInterstitialAd).not.toHaveBeenCalled();
    expect(showRewardInterstitialAd).not.toHaveBeenCalled();
  });

  it('uses the INTERSTITIAL API for a flagged surface, with its unit id', async () => {
    const { result } = renderHook(() => useAdMob());
    result.current.showRewarded(vi.fn(), vi.fn(), { surface: 'doubleGold' });
    for (let i = 0; i < 6; i++) await flush();

    expect(prepareRewardInterstitialAd).toHaveBeenCalledTimes(1);
    // immersiveMode false on the interstitial path too — immersive sticky UI
    // churns window focus on the edge-to-edge MainActivity and the SDK pauses
    // the reward countdown on focus loss (the frozen "Reward in 30s" bug).
    expect(prepareRewardInterstitialAd).toHaveBeenCalledWith(
      expect.objectContaining({ adId: 'ri-2', immersiveMode: false }),
    );
    expect(showRewardInterstitialAd).toHaveBeenCalledTimes(1);
    expect(prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(showRewardVideoAd).not.toHaveBeenCalled();
  });

  it('grants the reward when the interstitial Rewarded event fires', async () => {
    const onReward = vi.fn();
    const { result } = renderHook(() => useAdMob());
    result.current.showRewarded(onReward, vi.fn(), { surface: 'doubleGold' });
    for (let i = 0; i < 6; i++) await flush();

    // Fire the interstitial-namespace reward event the SDK emits for "Ad 1 of 2".
    expect(listeners['RI_Rewarded']).toBeTypeOf('function');
    listeners['RI_Rewarded']();
    for (let i = 0; i < 3; i++) await flush();

    expect(onReward).toHaveBeenCalledTimes(1);
  });
});
