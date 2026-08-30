/**
 * The interstitial safety timeout must bound the WAIT FOR A TERMINAL EVENT, not
 * the user's viewing time.
 *
 * It used to be armed before `prepare`, so its 15s budget was spent on
 * prepare (observed at 2.1s and 4.0s in production) plus the whole time the ad
 * was on screen (observed 6-9s). A cold load followed by a normal view crosses
 * 15s, and when the timer fires `settle()` resolves the awaiting caller — the MP
 * host emits `startGame` and round 2 begins BEHIND a still-fullscreen ad, and the
 * WebView repaint kick fires while the ad Activity still owns the surface.
 *
 * Arming it after `show` is called keeps the stall protection (a hung native
 * show still resolves) without racing the user.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const listeners: Record<string, () => void> = {};

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    addListener: vi.fn((event: string, cb: () => void) => {
      listeners[event] = cb;
      return Promise.resolve({ remove: vi.fn() });
    }),
    showInterstitial: vi.fn(() => Promise.resolve()),
    prepareInterstitial: vi.fn(() => Promise.resolve()),
  },
  InterstitialAdPluginEvents: {
    Dismissed: 'interstitialAdDismissed',
    FailedToShow: 'interstitialAdFailedToShow',
    FailedToLoad: 'interstitialAdFailedToLoad',
  },
  RewardAdPluginEvents: {},
  RewardInterstitialAdPluginEvents: {},
  BannerAdSize: {},
  BannerAdPosition: {},
}));

vi.mock('@/lib/native/webviewRepaint', () => ({ kickWebViewRepaint: vi.fn() }));
vi.mock('@/utils/growthTracking', () => ({
  trackRewardedLifecycle: vi.fn(),
  trackInterstitialLifecycle: vi.fn(),
}));

// Slow cold load: prepare takes 6s, then the user views the ad for 12s.
const PREPARE_MS = 6000;
let ready = false;

vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({
    recordGameEnd: vi.fn(),
    shouldShowInterstitial: () => true,
    recordInterstitialShown: vi.fn(),
    hasNoAds: () => false,
    getConfig: () => ({ interstitialAdId: 'unit', rewardedUnits: {}, bannerUnits: {} }),
    whenReady: () => Promise.resolve(),
    prepareInterstitial: () =>
      new Promise<void>((res) => {
        setTimeout(() => { ready = true; res(); }, PREPARE_MS);
      }),
    isInterstitialReady: () => ready,
    consumeInterstitial: vi.fn(),
  }),
}));

import { useAdMob } from './useAdMob';

describe('interstitial safety timeout is armed at show, not at prepare', () => {
  beforeEach(() => {
    ready = false;
    vi.useFakeTimers();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
  });
  afterEach(() => { vi.useRealTimers(); });

  it('does not resolve while the user is still watching a normally-dismissed ad', async () => {
    const { result } = renderHook(() => useAdMob());

    let settled = false;
    act(() => { void result.current.showInterstitial().then(() => { settled = true; }); });

    // 6s cold load, then the ad is on screen.
    await act(async () => { await vi.advanceTimersByTimeAsync(PREPARE_MS + 100); });
    expect(settled).toBe(false);

    // 12s of viewing. Under the old arm-before-prepare timer this crossed the
    // 15s budget and stranded the caller behind a live fullscreen ad.
    await act(async () => { await vi.advanceTimersByTimeAsync(12000); });
    expect(settled).toBe(false);

    // The real dismiss settles it.
    await act(async () => { listeners['interstitialAdDismissed']?.(); await Promise.resolve(); });
    expect(settled).toBe(true);
  });

  it('still settles when the native show hangs and no terminal event arrives', async () => {
    const { result } = renderHook(() => useAdMob());

    let settled = false;
    act(() => { void result.current.showInterstitial().then(() => { settled = true; }); });

    await act(async () => { await vi.advanceTimersByTimeAsync(PREPARE_MS + 100); });
    expect(settled).toBe(false);

    // No Dismissed / FailedToShow ever fires — the watchdog must still fire.
    await act(async () => { await vi.advanceTimersByTimeAsync(31000); });
    expect(settled).toBe(true);
  });
});
