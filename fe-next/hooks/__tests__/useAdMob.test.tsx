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
    // UMP consent shims — provider calls these before initialize. Default to
    // NOT_REQUIRED so non-EEA path resolves immediately and tests don't hang.
    requestConsentInfo: vi.fn(() =>
      Promise.resolve({ status: 'NOT_REQUIRED', isConsentFormAvailable: false }),
    ),
    showConsentForm: vi.fn(() => Promise.resolve()),
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
  AdmobConsentStatus: {
    NOT_REQUIRED: 'NOT_REQUIRED',
    OBTAINED: 'OBTAINED',
    REQUIRED: 'REQUIRED',
    UNKNOWN: 'UNKNOWN',
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
  InterstitialAdPluginEvents: {
    Loaded: 'interstitialAdLoaded',
    FailedToLoad: 'interstitialAdFailedToLoad',
    Showed: 'interstitialAdShowed',
    FailedToShow: 'interstitialAdFailedToShow',
    Dismissed: 'interstitialAdDismissed',
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

  it('showRewarded calls onError when dismissed without reward (after grace window)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const wrapper = makeWrapper(true);
      const { result } = renderHook(() => useAdMob(), { wrapper });
      const onReward = vi.fn();
      const onError = vi.fn();
      await act(async () => {
        const p = result.current.showRewarded(onReward, onError);
        await Promise.resolve();
        await Promise.resolve();
        fireEvent('onRewardedVideoAdDismissed');
        // Grace window allows late Rewarded events; advance past it
        await vi.advanceTimersByTimeAsync(800);
        await p;
      });
      expect(onReward).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  // Regression: @capacitor-community/admob v8 on certain Android builds fires
  // Dismissed BEFORE Rewarded. The previous implementation read `rewarded`
  // at Dismissed time and silently dropped the payout — players reported
  // "watched ad, didn't get life" on /daily/word-hunt.
  it('showRewarded fires onReward when Rewarded arrives AFTER Dismissed (Android race)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const wrapper = makeWrapper(true);
      const { result } = renderHook(() => useAdMob(), { wrapper });
      const onReward = vi.fn();
      const onError = vi.fn();
      await act(async () => {
        const p = result.current.showRewarded(onReward, onError);
        await Promise.resolve();
        await Promise.resolve();
        // Inverted ordering: Dismissed lands first
        fireEvent('onRewardedVideoAdDismissed');
        // Late Rewarded within grace window
        await vi.advanceTimersByTimeAsync(100);
        fireEvent('onRewardedVideoAdReward', { type: 'coins', amount: 10 });
        await vi.advanceTimersByTimeAsync(800);
        await p;
      });
      expect(onReward).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
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

  // Drive showInterstitial through its event-gated promise: the call awaits
  // Dismissed (or FailedToShow/FailedToLoad). Fire Dismissed after each
  // attempt so the loop doesn't hang on the 15s safety timeout.
  const drainInterstitial = async (
    fn: () => Promise<void>,
    count: number,
  ): Promise<void> => {
    for (let i = 0; i < count; i++) {
      const p = fn();
      // Two microtask flushes: one for listener registration, one for prepare/show.
      await Promise.resolve();
      await Promise.resolve();
      fireEvent('interstitialAdDismissed');
      await p;
    }
  };

  it('showInterstitial calls recordGameEnd and shows ad when conditions met', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    // Need 6 calls to pass warmup (3) and hit first interstitial (6th total = 3rd post-warmup)
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 5);
    });
    vi.clearAllMocks();
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 1);
    });
    expect(AdMob.prepareInterstitial).toHaveBeenCalled();
    expect(AdMob.showInterstitial).toHaveBeenCalled();
  });

  it('showInterstitial stops calling prepare/show after session cap (4) reached', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    // Drive 4 successful interstitial cycles: warmup (3) + 4*(3 cycles) = 15 game-ends.
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 15);
    });
    expect(AdMob.prepareInterstitial).toHaveBeenCalledTimes(4);
    expect(AdMob.showInterstitial).toHaveBeenCalledTimes(4);

    // 5th eligible cycle (game-ends 16-18) — must be blocked by cap.
    vi.clearAllMocks();
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 3);
    });
    expect(AdMob.prepareInterstitial).not.toHaveBeenCalled();
    expect(AdMob.showInterstitial).not.toHaveBeenCalled();
  });

  it('showInterstitial resolves on Dismissed event (gates next-round emits)', async () => {
    // The MP host awaits this promise before emitting startGame so other
    // players stay on results while the fullscreen overlay is showing.
    // Drive through warmup first, then verify the gated cycle.
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 5);
    });

    let resolved = false;
    await act(async () => {
      const p = result.current.showInterstitial().then(() => { resolved = true; });
      await Promise.resolve();
      await Promise.resolve();
      // Before Dismissed: still pending.
      expect(resolved).toBe(false);
      fireEvent('interstitialAdDismissed');
      await p;
    });
    expect(resolved).toBe(true);
  });

  it('showInterstitial resolves on FailedToLoad (no fill must not block the room)', async () => {
    // If AdMob can't fill the ad, the host shouldn't be stuck waiting and the
    // rest of the room shouldn't be frozen on the results page.
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 5);
    });

    let resolved = false;
    await act(async () => {
      const p = result.current.showInterstitial().then(() => { resolved = true; });
      await Promise.resolve();
      await Promise.resolve();
      fireEvent('interstitialAdFailedToLoad');
      await p;
    });
    expect(resolved).toBe(true);
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

  it('showRewarded uses surface-specific unit ID when surface=hint env override is set', async () => {
    process.env.NEXT_PUBLIC_ADMOB_REWARDED_HINT_ANDROID = 'ca-app-pub-x/hint';
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      const p = result.current.showRewarded(vi.fn(), undefined, { surface: 'hint' });
      await Promise.resolve();
      await Promise.resolve();
      fireEvent('onRewardedVideoAdReward', { type: 'coins', amount: 10 });
      fireEvent('onRewardedVideoAdDismissed');
      await p;
    });
    expect(AdMob.prepareRewardVideoAd).toHaveBeenCalledWith(
      expect.objectContaining({ adId: 'ca-app-pub-x/hint' })
    );
    delete process.env.NEXT_PUBLIC_ADMOB_REWARDED_HINT_ANDROID;
  });

  it('showRewarded uses surface-specific default when env not set', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      const p = result.current.showRewarded(vi.fn(), undefined, { surface: 'freeze' });
      await Promise.resolve();
      await Promise.resolve();
      fireEvent('onRewardedVideoAdReward', { type: 'coins', amount: 10 });
      fireEvent('onRewardedVideoAdDismissed');
      await p;
    });
    // Falls back to the freeze surface default (NOT the generic rewarded unit).
    expect(AdMob.prepareRewardVideoAd).toHaveBeenCalledWith(
      expect.objectContaining({ adId: 'ca-app-pub-1896836706464880/5950581279' })
    );
  });

  it('showBanner uses content variant unit when env override is set', async () => {
    process.env.NEXT_PUBLIC_ADMOB_BANNER_CONTENT_ANDROID = 'ca-app-pub-x/banner-content';
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showBanner(BannerAdPosition.BOTTOM_CENTER, undefined, { variant: 'content' });
    });
    expect(AdMob.showBanner).toHaveBeenCalledWith(
      expect.objectContaining({ adId: 'ca-app-pub-x/banner-content' })
    );
    delete process.env.NEXT_PUBLIC_ADMOB_BANNER_CONTENT_ANDROID;
  });

  it('showBanner with default variant uses game banner unit', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showBanner();
    });
    expect(AdMob.showBanner).toHaveBeenCalledWith(
      expect.objectContaining({ adId: 'ca-app-pub-1896836706464880/7714920248' })
    );
  });

  it('hideBanner calls plugin even when no prior showBanner (race-safe)', async () => {
    // Regression: prior bannerShownRef early-return raced with in-flight
    // showBanner — hide on route change was a no-op while plugin was still
    // about to paint a banner, leaving banner visible on disallowed routes
    // (e.g., /daily/word-wheel after navigating from /word-of-the-day).
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.hideBanner();
    });
    expect(AdMob.hideBanner).toHaveBeenCalled();
  });

  it('hideBanner during in-flight showBanner reaches the plugin (race fix)', async () => {
    // Simulates rapid pathname change: showBanner await is still pending when
    // user navigates and hideBanner fires. Both must reach AdMob.* — without
    // the optimistic ref flip + early-return removal, hide was skipped.
    let resolveShow: (() => void) | null = null;
    vi.mocked(AdMob.showBanner).mockImplementationOnce(
      () => new Promise<void>((res) => { resolveShow = () => res(); })
    );
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    let showP: Promise<void>;
    await act(async () => {
      showP = result.current.showBanner();
      await Promise.resolve();
    });
    // Hide arrives mid-show — must NOT be a no-op.
    await act(async () => {
      await result.current.hideBanner();
    });
    expect(AdMob.hideBanner).toHaveBeenCalled();
    await act(async () => {
      resolveShow!();
      await showP!;
    });
  });

  it('showBanner failure resets bannerShownRef so subsequent hide is still callable', async () => {
    vi.mocked(AdMob.showBanner).mockRejectedValueOnce(new Error('boom'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showBanner();
    });
    // Even after failed show, hide must still attempt the plugin call.
    await act(async () => {
      await result.current.hideBanner();
    });
    expect(AdMob.hideBanner).toHaveBeenCalled();
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
