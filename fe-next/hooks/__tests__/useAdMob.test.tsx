import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
    isPluginAvailable: vi.fn(() => true),
  },
}));

type Listener = (payload?: unknown) => void;
const { listeners, fireEvent } = vi.hoisted(() => {
  const ls: Record<string, Listener[]> = {};
  return {
    listeners: ls,
    fireEvent: (name: string, payload?: unknown) => (ls[name] || []).forEach((fn) => fn(payload)),
  };
});

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    initialize: vi.fn(() => Promise.resolve()),
    prepareRewardVideoAd: vi.fn(() => Promise.resolve()),
    showRewardVideoAd: vi.fn(() => Promise.resolve()),
    prepareInterstitial: vi.fn(() => Promise.resolve()),
    showInterstitial: vi.fn(() => Promise.resolve()),
    showBanner: vi.fn(() => Promise.resolve()),
    hideBanner: vi.fn(() => Promise.resolve()),
    addListener: vi.fn((name: string, fn: Listener) => {
      (listeners[name] ||= []).push(fn);
      return Promise.resolve({
        remove: () => {
          listeners[name] = (listeners[name] || []).filter((f) => f !== fn);
          return Promise.resolve();
        },
      });
    }),
  },
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
  RewardAdPluginEvents: {
    Loaded: 'onRewardedVideoAdLoaded',
    FailedToLoad: 'onRewardedVideoAdFailedToLoad',
    Showed: 'onRewardedVideoAdShowed',
    FailedToShow: 'onRewardedVideoAdFailedToShow',
    Dismissed: 'onRewardedVideoAdDismissed',
    Rewarded: 'onRewardedVideoAdReward',
  },
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
    Object.keys(listeners).forEach((k) => delete listeners[k]);
  });

  it('showRewarded fires onReward only after Rewarded event (not on resolve)', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    const onReward = vi.fn();
    await act(async () => {
      const p = result.current.showRewarded(onReward);
      await Promise.resolve();
      await Promise.resolve();
      // Plugin resolves showRewardVideoAd, but no Rewarded event yet → must NOT call onReward
      expect(onReward).not.toHaveBeenCalled();
      fireEvent('onRewardedVideoAdReward', { type: 'coins', amount: 10 });
      fireEvent('onRewardedVideoAdDismissed');
      await p;
    });
    expect(onReward).toHaveBeenCalledTimes(1);
  });

  it('showRewarded calls onError when dismissed without reward', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    const onReward = vi.fn();
    const onError = vi.fn();
    await act(async () => {
      const p = result.current.showRewarded(onReward, onError);
      await Promise.resolve();
      await Promise.resolve();
      fireEvent('onRewardedVideoAdDismissed');
      await p;
    });
    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('showRewarded calls onError on FailedToShow', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    const onReward = vi.fn();
    const onError = vi.fn();
    await act(async () => {
      const p = result.current.showRewarded(onReward, onError);
      await Promise.resolve();
      await Promise.resolve();
      fireEvent('onRewardedVideoAdFailedToShow', { message: 'no fill' });
      await p;
    });
    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('no fill'));
  });

  it('showRewarded calls onError when AdMob.showRewardVideoAd throws', async () => {
    vi.mocked(AdMob.showRewardVideoAd).mockRejectedValueOnce(new Error('boom'));
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    const onReward = vi.fn();
    const onError = vi.fn();
    await act(async () => {
      await result.current.showRewarded(onReward, onError);
    });
    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('boom');
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

  it('showInterstitial stops calling prepare/show after session cap (4) reached', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    // Drive 4 successful interstitial cycles: warmup (3) + 4*(3 cycles) = 15 game-ends.
    await act(async () => {
      for (let i = 0; i < 15; i++) await result.current.showInterstitial();
    });
    expect(AdMob.prepareInterstitial).toHaveBeenCalledTimes(4);
    expect(AdMob.showInterstitial).toHaveBeenCalledTimes(4);

    // 5th eligible cycle (game-ends 16-18) — must be blocked by cap.
    vi.clearAllMocks();
    await act(async () => {
      for (let i = 0; i < 3; i++) await result.current.showInterstitial();
    });
    expect(AdMob.prepareInterstitial).not.toHaveBeenCalled();
    expect(AdMob.showInterstitial).not.toHaveBeenCalled();
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

  it('showBanner awaits AdMob.initialize before calling showBanner (fixes NPE race)', async () => {
    const order: string[] = [];
    let resolveInit: (() => void) | null = null;
    vi.mocked(AdMob.initialize).mockImplementationOnce(
      () => new Promise<void>((res) => {
        resolveInit = () => { order.push('init'); res(); };
      })
    );
    vi.mocked(AdMob.showBanner).mockImplementationOnce(async () => { order.push('showBanner'); });
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    let bannerPromise: Promise<void>;
    await act(async () => {
      bannerPromise = result.current.showBanner();
      await Promise.resolve();
    });
    expect(order).not.toContain('showBanner');
    await act(async () => {
      resolveInit!();
      await bannerPromise!;
    });
    expect(order).toEqual(['init', 'showBanner']);
  });

  it('hideBanner awaits AdMob.initialize before calling hideBanner', async () => {
    const order: string[] = [];
    let resolveInit: (() => void) | null = null;
    vi.mocked(AdMob.initialize).mockImplementationOnce(
      () => new Promise<void>((res) => {
        resolveInit = () => { order.push('init'); res(); };
      })
    );
    vi.mocked(AdMob.hideBanner).mockImplementationOnce(async () => { order.push('hideBanner'); });
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    let hidePromise: Promise<void>;
    await act(async () => {
      hidePromise = result.current.hideBanner();
      await Promise.resolve();
    });
    expect(order).not.toContain('hideBanner');
    await act(async () => {
      resolveInit!();
      await hidePromise!;
    });
    expect(order).toEqual(['init', 'hideBanner']);
  });

  it('hideBanner calls AdMob.hideBanner', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showBanner();
    });
    await act(async () => {
      await result.current.hideBanner();
    });
    expect(AdMob.hideBanner).toHaveBeenCalled();
  });

  it('hideBanner suppresses "banner that was never shown" plugin error', async () => {
    vi.mocked(AdMob.hideBanner).mockRejectedValueOnce({
      message: 'You tried to hide a banner that was never shown',
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showBanner();
    });
    await act(async () => {
      await result.current.hideBanner();
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('hideBanner still logs genuine errors', async () => {
    vi.mocked(AdMob.hideBanner).mockRejectedValueOnce({ message: 'internal SDK failure' });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showBanner();
    });
    await act(async () => {
      await result.current.hideBanner();
    });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
