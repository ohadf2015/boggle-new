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

// --- Telemetry mock --------------------------------------------------------
const trackRewardedLifecycle = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackRewardedLifecycle: (...args: unknown[]) => trackRewardedLifecycle(...args),
  trackInterstitialLifecycle: vi.fn(),
}));

// --- repaint mock (native no-op in jsdom) ----------------------------------
vi.mock('@/lib/native/webviewRepaint', () => ({ kickWebViewRepaint: vi.fn() }));

// --- Context mock ----------------------------------------------------------
vi.mock('@/contexts/AdMobContext', () => ({
  useAdMobContext: () => ({
    recordGameEnd: vi.fn(),
    shouldShowInterstitial: () => false,
    recordInterstitialShown: vi.fn(),
    hasNoAds: () => false,
    getConfig: () => ({ rewardedAdId: 'r-1', rewardedUnits: { generic: 'r-1' } }),
    whenReady: () => Promise.resolve(),
    prepareInterstitial: vi.fn(),
    isInterstitialReady: () => false,
    consumeInterstitial: vi.fn(),
  }),
}));

import { useAdMob, VISIBILITY_RECONCILE_GRACE_MS } from './useAdMob';

const flush = () => Promise.resolve();

// Control document.hidden / visibilityState (read-only in jsdom).
function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

function fireNativeEvent(name: string) {
  const call = addListener.mock.calls.find((c) => c[0] === name);
  if (!call) throw new Error(`no listener registered for ${name}`);
  (call[1] as (e?: unknown) => void)();
}

// Drive showRewarded past its prepare/show awaits so the ad is "showing".
async function startShowingAd(showRewarded: (onR: () => void, onE: (m: string) => void) => Promise<void>) {
  const onReward = vi.fn();
  const onError = vi.fn();
  const settled = showRewarded(onReward, onError);
  // Flush listener registration + whenReady + prepare + show (all resolved mocks).
  await vi.advanceTimersByTimeAsync(0);
  await flush();
  await vi.advanceTimersByTimeAsync(0);
  await flush();
  return { onReward, onError, settled };
}

describe('useAdMob.showRewarded — visibility-reconcile watchdog (survives WebView suspension)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    prepareRewardVideoAd.mockReset().mockResolvedValue(undefined);
    showRewardVideoAd.mockReset().mockResolvedValue(undefined);
    addListener.mockClear();
    trackRewardedLifecycle.mockClear();
    setHidden(false);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('frees the UI after the ad closes (visibility returns) but no native terminal event fires', async () => {
    const { result } = renderHook(() => useAdMob());
    const { onReward, onError } = await startShowingAd(result.current.showRewarded);

    // Ad Activity fronts → WebView hidden (JS would suspend on a real device).
    setHidden(true);
    // Ad Activity dismissed → WebView visible again, but the native
    // Rewarded/Dismissed event is dropped (nothing fired).
    setHidden(false);

    // Within the grace window the real (queued) event still has time to arrive.
    await vi.advanceTimersByTimeAsync(VISIBILITY_RECONCILE_GRACE_MS - 1);
    expect(onError).not.toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();

    // Grace elapses with no terminal event → reconcile frees the UI.
    await vi.advanceTimersByTimeAsync(2);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReward).not.toHaveBeenCalled();
  });

  it('does NOT preempt a real reward that arrives shortly after visibility returns', async () => {
    const { result } = renderHook(() => useAdMob());
    const { onReward, onError } = await startShowingAd(result.current.showRewarded);

    setHidden(true);
    setHidden(false);

    // Real reward flushes ~100ms after the WebView regains visibility.
    await vi.advanceTimersByTimeAsync(100);
    fireNativeEvent('Rewarded');
    await flush();

    expect(onReward).toHaveBeenCalledTimes(1);

    // Past the grace window the reconcile must NOT double-settle as an error.
    await vi.advanceTimersByTimeAsync(VISIBILITY_RECONCILE_GRACE_MS + 10);
    expect(onError).not.toHaveBeenCalled();
  });

  it('ignores visibility churn that happens before the ad is shown', async () => {
    // prepare hangs → ad never shows; backgrounding during load must not
    // trip the reconcile (it only guards the post-show window).
    prepareRewardVideoAd.mockReturnValue(new Promise<void>(() => {}));
    const { result } = renderHook(() => useAdMob());
    const onReward = vi.fn();
    const onError = vi.fn();
    void result.current.showRewarded(onReward, onError);
    await vi.advanceTimersByTimeAsync(0);
    await flush();

    // App toggled away and back while prepare is still loading.
    setHidden(true);
    setHidden(false);
    await vi.advanceTimersByTimeAsync(VISIBILITY_RECONCILE_GRACE_MS + 10);

    // No premature settle from the reconcile (the prepare-timeout owns this window).
    expect(onError).not.toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();
  });
});
