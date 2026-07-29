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

// --- Telemetry mock --------------------------------------------------------
const trackRewardedLifecycle = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackRewardedLifecycle: (...args: unknown[]) => trackRewardedLifecycle(...args),
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

import { useAdMob, REWARD_PREPARE_TIMEOUT_MS, REWARD_SAFETY_TIMEOUT_MS } from './useAdMob';

const flush = () => Promise.resolve();

describe('useAdMob.showRewarded — prepare-phase stall guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    prepareRewardVideoAd.mockReset();
    showRewardVideoAd.mockReset();
    addListener.mockClear();
    trackRewardedLifecycle.mockClear();
  });

  const stages = () => trackRewardedLifecycle.mock.calls.map((c) => c[0]);
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

  it('recovers when show stalls — settles via the safety timeout after showRewardVideoAd hangs with no event', async () => {
    // The real "stuck in reward ads" bug: prepare resolves (an ad loaded) and
    // we call show, but showRewardVideoAd() never resolves AND no Rewarded/
    // Dismissed/Failed event ever fires (backgrounded WebView, buggy mediation
    // adapter). The UI must not hang in status='showing' forever — the safety
    // watchdog has to cover the show phase, not just the post-show event wait.
    prepareRewardVideoAd.mockResolvedValue(undefined);
    showRewardVideoAd.mockReturnValue(new Promise<void>(() => {}));

    const { result } = renderHook(() => useAdMob());
    const onReward = vi.fn();
    const onError = vi.fn();

    result.current.showRewarded(onReward, onError);

    // drain listener registration + whenReady() + prepare microtasks
    await flush();
    await flush();
    await flush();
    await flush();

    expect(showRewardVideoAd).toHaveBeenCalledTimes(1);
    // before the safety timeout: still showing, neither resolved nor errored
    expect(onError).not.toHaveBeenCalled();
    expect(onReward).not.toHaveBeenCalled();

    // advance past the safety watchdog — UI is freed with a retry error
    await vi.advanceTimersByTimeAsync(REWARD_SAFETY_TIMEOUT_MS + 10);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onReward).not.toHaveBeenCalled();
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
    // immersiveMode MUST be false. On the edge-to-edge MainActivity, immersive
    // sticky system-UI churns window focus while the ad Activity is up, and the
    // SDK pauses the rewarded reward-countdown on focus loss — the universal
    // "Reward in 30 seconds frozen at 30, ad plays fine, no reward, stuck" bug.
    // Regression guard: re-enabling immersive re-freezes every rewarded ad.
    expect(prepareRewardVideoAd).toHaveBeenCalledWith(
      expect.objectContaining({ immersiveMode: false }),
    );
  });

  it('breadcrumbs the lifecycle stages (surface-tagged) for the stuck-ad diagnosis', async () => {
    prepareRewardVideoAd.mockResolvedValue(undefined);
    showRewardVideoAd.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAdMob());
    result.current.showRewarded(vi.fn(), vi.fn(), { surface: 'timeLow' });

    for (let i = 0; i < 6; i++) await flush();

    expect(stages()).toEqual(
      expect.arrayContaining(['prepare_start', 'prepare_resolved', 'show_called', 'show_resolved']),
    );
    // every breadcrumb carries the surface so PostHog can segment stalls
    expect(trackRewardedLifecycle).toHaveBeenCalledWith('show_called', 'timeLow');
  });

  it('records safety_timeout when the show phase hangs with no event', async () => {
    prepareRewardVideoAd.mockResolvedValue(undefined);
    showRewardVideoAd.mockReturnValue(new Promise<void>(() => {}));

    const { result } = renderHook(() => useAdMob());
    result.current.showRewarded(vi.fn(), vi.fn());

    await flush();
    await flush();
    await flush();
    await flush();
    await vi.advanceTimersByTimeAsync(REWARD_SAFETY_TIMEOUT_MS + 10);

    expect(stages()).toContain('safety_timeout');
  });
});
