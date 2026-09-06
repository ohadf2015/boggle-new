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

// Lifecycle telemetry is the diagnostic surface for the "interstitials show
// blank screens" report — assert the breadcrumbs fire at each stage. Mock the
// module so we observe the calls without driving the real analytics pipeline.
vi.mock('@/utils/growthTracking', () => ({
  trackRewardedLifecycle: vi.fn(),
  trackInterstitialLifecycle: vi.fn(),
}));

// Interstitials are now adult-only (Families Ad Format). These tests exercise
// the show/preload mechanics, so default the provider's tier to a known adult.
const social = vi.hoisted(() => ({ tier: 'adult' as 'adult' | 'child' | 'unknown' }));
vi.mock('@/hooks/useSocialCapabilities', () => ({
  // authResolved true so init fires immediately in these flow tests.
  useSocialCapabilities: () => ({ tier: social.tier, authResolved: true }),
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
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER', BANNER: 'BANNER' },
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
import { trackInterstitialLifecycle } from '@/utils/growthTracking';
import { useAdMob } from '../useAdMob';

function makeWrapper(isNative: boolean, platform: string = 'android') {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(isNative);
  vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
  function Wrapper({ children }: { children: ReactNode }) {
    return <AdMobProvider>{children}</AdMobProvider>;
  }
  return Wrapper;
}

// Wall clock the provider's interstitial fatigue floor reads (2 min between
// confirmed shows). Real play puts a round (~60s+) between game ends;
// drainInterstitial advances this per end so cadence slots 3 ends apart
// clear the floor exactly as they do on device. Tests that fake `Date` via
// vi.useFakeTimers replace the global Date and simply bypass this spy.
const realDateNow = Date.now.bind(Date);
let clockOffsetMs = 0;
const GAME_END_SPACING_MS = 60 * 1000;

describe('useAdMob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
    social.tier = 'adult';
    clockOffsetMs = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => realDateNow() + clockOffsetMs);
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

  // Regression: v8 plugin can silently stall on poor network or backgrounded
  // WebView — no Rewarded/Dismissed/Failed event ever fires, leaving showAd's
  // promise pending forever and the calling UI stuck in 'showing' state with
  // the "Earning..." button label frozen. 90s safety timer must rescue.
  it('showRewarded calls onError after safety timeout when plugin emits no events', async () => {
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
        // No events fire — simulate silent stall. Advance past 90s safety cap.
        await vi.advanceTimersByTimeAsync(91000);
        await p;
      });
      expect(onReward).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('timed out'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('showRewarded does NOT trigger safety timeout when Rewarded fires normally', async () => {
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
        fireEvent('onRewardedVideoAdReward', { type: 'coins', amount: 10 });
        fireEvent('onRewardedVideoAdDismissed');
        await p;
        // Advance well past 90s — safety timer must have been cleared on cleanup.
        await vi.advanceTimersByTimeAsync(91000);
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

  // Flush enough microtasks for the (now multi-await) show pipeline to reach
  // AdMob.showInterstitial before we fire the terminal event. The pipeline is
  // longer than before: whenReady → (maybe prepare) → consume → show.
  const flush = async (n = 10): Promise<void> => {
    for (let i = 0; i < n; i++) await Promise.resolve();
  };

  // Drive showInterstitial through its event-gated promise: the call awaits
  // Dismissed (or FailedToShow/FailedToLoad). Fire Dismissed after each
  // attempt so the loop doesn't hang on the 15s safety timeout.
  const drainInterstitial = async (
    fn: () => Promise<void>,
    count: number,
  ): Promise<void> => {
    for (let i = 0; i < count; i++) {
      const p = fn();
      await flush();
      fireEvent('interstitialAdDismissed');
      await p;
      // Let the fire-and-forget re-warm (settle → prepareInterstitial) run so
      // the next iteration sees a warm ad, mirroring real play.
      await flush();
      // A round of play passes before the next game end.
      clockOffsetMs += GAME_END_SPACING_MS;
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
    // Contract: an ad is shown on the eligible game. (The prepare may have
    // happened ahead of time via preload — it's no longer pinned to show time.)
    expect(AdMob.showInterstitial).toHaveBeenCalled();
  });

  it('eligible interstitial shows a preloaded ad with no cold load at show time', async () => {
    // Revenue/stability: by show time the ad was already warmed during play, so
    // the show is zero-latency and a show-time no-fill can't burn a session slot.
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    // ends 1-5: warmup ends at 3, ad warmed during play.
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 5);
    });
    vi.clearAllMocks();
    await act(async () => {
      const p = result.current.showInterstitial(); // end 6 — eligible
      await flush();
      // Warm ad reused: shown immediately, NO prepare at show time (pre-dismiss).
      expect(AdMob.showInterstitial).toHaveBeenCalledTimes(1);
      expect(AdMob.prepareInterstitial).not.toHaveBeenCalled();
      fireEvent('interstitialAdDismissed');
      await p;
    });
  });

  it('re-warms the next interstitial after a show is dismissed', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 5);
    });
    vi.clearAllMocks();
    await act(async () => {
      const p = result.current.showInterstitial(); // end 6 — eligible, consumes warm ad
      await flush();
      fireEvent('interstitialAdDismissed');
      await p;
      await flush(); // let fire-and-forget re-warm run
    });
    // The consumed slot is re-warmed so the next eligible interstitial is instant.
    expect(AdMob.prepareInterstitial).toHaveBeenCalled();
  });

  it('no-fill interstitial does not show, still resolves, and preserves the slot', async () => {
    // Preload (and cold-fallback) fail → we must NOT call show on an unprepared
    // unit, must resolve so the MP host isn't blocked, and must NOT record a
    // shown impression (which would silently burn one of 4 session slots).
    vi.mocked(AdMob.prepareInterstitial).mockRejectedValue(new Error('no fill'));
    try {
      const wrapper = makeWrapper(true);
      const { result } = renderHook(() => useAdMob(), { wrapper });
      let resolved = false;
      await act(async () => {
        await drainInterstitial(() => result.current.showInterstitial(), 5); // ends 1-5
        const p = result.current
          .showInterstitial()
          .then(() => { resolved = true; }); // end 6 — eligible but no fill
        await flush();
        await p;
      });
      expect(resolved).toBe(true);
      expect(AdMob.showInterstitial).not.toHaveBeenCalled();
    } finally {
      vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined);
    }
  });

  it('no-fills do not consume session slots — full 4 shows still delivered later', async () => {
    // The headline contract: a show-time no-fill must NOT burn a slot. Make the
    // first eligible games (6, 9) no-fill, then restore fill; we must still get
    // the full 4 shows. If no-fills burned slots, the cap would trip early (<4).
    vi.mocked(AdMob.prepareInterstitial).mockRejectedValue(new Error('no fill'));
    try {
      const wrapper = makeWrapper(true);
      const { result } = renderHook(() => useAdMob(), { wrapper });
      await act(async () => {
        // ends 1-9: eligible at 6 and 9, both no-fill → 0 shows, 0 slots used.
        await drainInterstitial(() => result.current.showInterstitial(), 9);
      });
      expect(AdMob.showInterstitial).not.toHaveBeenCalled();

      vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined);
      await act(async () => {
        // ends 10-21: eligible at 12,15,18,21 → fill restored → 4 shows.
        await drainInterstitial(() => result.current.showInterstitial(), 12);
      });
      // Slots survived the no-fills → the cap delivers the full 4 impressions.
      expect(AdMob.showInterstitial).toHaveBeenCalledTimes(4);
    } finally {
      vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined);
    }
  });

  it('reloads a stale preloaded ad before showing (AdMob ~1h expiry)', async () => {
    // A warm ad expires after ~1h. Without a TTL the stale flag is reused: the
    // show consumes + records the slot, then the expired ad fails to render —
    // burning a slot via the expiry door. The warm flag must age out.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      const wrapper = makeWrapper(true);
      const { result } = renderHook(() => useAdMob(), { wrapper });
      await act(async () => {
        // ends 1-5: ad warmed during play (at end 3).
        await drainInterstitial(() => result.current.showInterstitial(), 5);
      });
      vi.clearAllMocks();
      // Idle past the TTL so the warm ad goes stale.
      await act(async () => { await vi.advanceTimersByTimeAsync(60 * 60 * 1000); });
      await act(async () => {
        const p = result.current.showInterstitial(); // end 6 — eligible
        await flush();
        // Assert BEFORE dismiss: the stale ad must be reloaded as part of the
        // show pipeline. (Without a TTL the stale flag is reused and prepare
        // only fires later via the post-dismiss re-warm — so this discriminates
        // the TTL behavior rather than the always-true re-warm.)
        expect(AdMob.prepareInterstitial).toHaveBeenCalled();
        expect(AdMob.showInterstitial).toHaveBeenCalledTimes(1);
        fireEvent('interstitialAdDismissed');
        await p;
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('showInterstitial caps confirmed shows at the session limit (4)', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    // warmup (3) + 4 eligible cycles every 3rd game = 15 game-ends.
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 15);
    });
    // The cap bounds *shown impressions* (loads may be more due to preloading).
    expect(AdMob.showInterstitial).toHaveBeenCalledTimes(4);

    // 5th eligible cycle (game-ends 16-18) — must be blocked by cap: no show,
    // and no wasteful preload of an ad the cap forbids.
    vi.clearAllMocks();
    await act(async () => {
      await drainInterstitial(() => result.current.showInterstitial(), 3);
    });
    expect(AdMob.showInterstitial).not.toHaveBeenCalled();
    expect(AdMob.prepareInterstitial).not.toHaveBeenCalled();
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

  it('showBanner requests a full-width ADAPTIVE_BANNER (native patch caps its height so it cannot occlude)', async () => {
    const wrapper = makeWrapper(true);
    const { result } = renderHook(() => useAdMob(), { wrapper });
    await act(async () => {
      await result.current.showBanner();
    });
    expect(AdMob.showBanner).toHaveBeenCalledWith(
      expect.objectContaining({ adSize: 'ADAPTIVE_BANNER' })
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

  // ── Interstitial lifecycle telemetry ──────────────────────────────────
  // The "interstitials show blank screens" report was undiagnosable because
  // the interstitial path emitted NO telemetry (rewarded has rich breadcrumbs).
  // These breadcrumbs discriminate the failure: a clean show_called →
  // show_resolved → dismissed with a blank still on screen = the WebView didn't
  // repaint; no_fill / failed_* = the ad surface never filled; safety_timeout =
  // the native ad stalled with no terminal event.
  describe('interstitial lifecycle telemetry', () => {
    const stages = () =>
      vi.mocked(trackInterstitialLifecycle).mock.calls.map((c) => c[0]);

    it('emits eligible → show_called → show_resolved → dismissed for a served ad', async () => {
      const wrapper = makeWrapper(true);
      const { result } = renderHook(() => useAdMob(), { wrapper });
      // ends 1-5: warmup ends at 3, ad warmed during play (no eligible show yet).
      await act(async () => {
        await drainInterstitial(() => result.current.showInterstitial(), 5);
      });
      vi.mocked(trackInterstitialLifecycle).mockClear();
      await act(async () => {
        const p = result.current.showInterstitial(); // end 6 — eligible
        await flush();
        // Pre-dismiss: the show was attempted on a warm ad.
        expect(stages()).toContain('eligible');
        expect(stages()).toContain('show_called');
        expect(stages()).toContain('show_resolved');
        expect(stages()).not.toContain('dismissed');
        fireEvent('interstitialAdDismissed');
        await p;
      });
      // Terminal event recorded — a clean teardown breadcrumb.
      expect(stages()).toContain('dismissed');
    });

    it('emits no_fill (and never show_called) when the ad does not fill', async () => {
      vi.mocked(AdMob.prepareInterstitial).mockRejectedValue(new Error('no fill'));
      try {
        const wrapper = makeWrapper(true);
        const { result } = renderHook(() => useAdMob(), { wrapper });
        await act(async () => {
          await drainInterstitial(() => result.current.showInterstitial(), 5);
        });
        vi.mocked(trackInterstitialLifecycle).mockClear();
        await act(async () => {
          const p = result.current.showInterstitial(); // end 6 — eligible, no fill
          await flush();
          await p;
        });
        expect(stages()).toContain('eligible');
        expect(stages()).toContain('no_fill');
        expect(stages()).not.toContain('show_called');
      } finally {
        vi.mocked(AdMob.prepareInterstitial).mockResolvedValue(undefined);
      }
    });

    it('emits failed_to_show when the SDK fires FailedToShow', async () => {
      const wrapper = makeWrapper(true);
      const { result } = renderHook(() => useAdMob(), { wrapper });
      await act(async () => {
        await drainInterstitial(() => result.current.showInterstitial(), 5);
      });
      vi.mocked(trackInterstitialLifecycle).mockClear();
      await act(async () => {
        const p = result.current.showInterstitial(); // end 6 — eligible
        await flush();
        fireEvent('interstitialAdFailedToShow');
        await p;
      });
      expect(stages()).toContain('failed_to_show');
    });
  });
});
