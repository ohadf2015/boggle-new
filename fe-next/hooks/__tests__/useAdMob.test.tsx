import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: vi.fn(() => Promise.resolve()),
    prepareRewardVideoAd: vi.fn(() => Promise.resolve()),
    showRewardVideoAd: vi.fn(() => Promise.resolve()),
    prepareInterstitial: vi.fn(() => Promise.resolve()),
    showInterstitial: vi.fn(() => Promise.resolve()),
    showBanner: vi.fn(() => Promise.resolve()),
    hideBanner: vi.fn(() => Promise.resolve()),
  },
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
}));

import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition } from '@capacitor-community/admob';
import { AdMobProvider } from '@/contexts/AdMobContext';
import { useAdMob } from '../useAdMob';

function makeWrapper(isNative: boolean, platform: string = 'android') {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(isNative);
  vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
  function Wrapper({ children }: { children: ReactNode }) {
    return <AdMobProvider>{children}</AdMobProvider>;
  }
  return Wrapper;
}

describe('useAdMob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('showRewarded calls onReward on native', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    const onReward = vi.fn();
    await act(async () => {
      await result.current.showRewarded(onReward);
    });
    expect(AdMob.prepareRewardVideoAd).toHaveBeenCalled();
    expect(AdMob.showRewardVideoAd).toHaveBeenCalled();
    expect(onReward).toHaveBeenCalledTimes(1);
  });

  it('showRewarded is no-op on web (getConfig returns null)', async () => {
    const wrapper = makeWrapper(false);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    const onReward = vi.fn();
    await act(async () => {
      await result.current.showRewarded(onReward);
    });
    expect(AdMob.prepareRewardVideoAd).not.toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();
  });

  it('showInterstitial calls recordGameEnd and shows ad when conditions met', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    // Need 6 calls to pass warmup (3) and hit first interstitial (6th total = 3rd post-warmup)
    await act(async () => {
      for (let i = 0; i < 5; i++) await result.current.showInterstitial();
    });
    vi.clearAllMocks();
    await act(async () => {
      await result.current.showInterstitial();
    });
    expect(AdMob.prepareInterstitial).toHaveBeenCalled();
    expect(AdMob.showInterstitial).toHaveBeenCalled();
  });

  it('showInterstitial skips ad during warmup', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showInterstitial();
    });
    expect(AdMob.prepareInterstitial).not.toHaveBeenCalled();
  });

  it('showBanner calls AdMob.showBanner with default BOTTOM_CENTER on native', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showBanner();
    });
    expect(AdMob.showBanner).toHaveBeenCalledWith(
      expect.objectContaining({ position: BannerAdPosition.BOTTOM_CENTER })
    );
  });

  it('hideBanner calls AdMob.hideBanner', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.hideBanner();
    });
    expect(AdMob.hideBanner).toHaveBeenCalled();
  });
});
