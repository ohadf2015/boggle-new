/**
 * useRewardedAd — `warm` option (preload at intent moments)
 *
 * AdMob 30d audit (2026-07-03): user-initiated surfaces like retry loaded the
 * ad COLD on tap — 100% match but only 64% show rate (the 12s prepare timeout
 * or modal close killed 36% of taps). `warm: true` pre-loads the surface's
 * rewarded slot once, as soon as the hook can actually serve (native AdMob +
 * daily cap not hit), so tap→show is instant at high-intent moments (retry
 * modals, results doubling). Callers on passive surfaces (lobby gold button)
 * omit it — that placement wasted 198 loads for 2 shows.
 */
import { renderHook } from '@testing-library/react';

const showRewardedMock = vi.fn();
const prepareRewardedMock = vi.fn();

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showRewardedAd: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({
    isAvailable: true,
    showRewarded: showRewardedMock,
    prepareRewarded: prepareRewardedMock,
  }),
}));

vi.mock('@/contexts/CoinContext', () => ({
  useCoinContext: () => ({
    awardWatchedAd: vi.fn().mockResolvedValue({ awarded: 30 }),
    rewards: { WATCH_AD: 30 },
  }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
}));

import { useRewardedAd } from '../useRewardedAd';

const todayKey = () => new Date().toISOString().slice(0, 10);

describe('useRewardedAd — warm option', () => {
  beforeEach(() => {
    showRewardedMock.mockReset();
    prepareRewardedMock.mockReset();
    localStorage.clear();
  });

  it('warm: true pre-loads the surface unit once on mount', () => {
    const { rerender } = renderHook(() =>
      useRewardedAd({ surface: 'retry', warm: true }),
    );
    expect(prepareRewardedMock).toHaveBeenCalledTimes(1);
    expect(prepareRewardedMock).toHaveBeenCalledWith({ surface: 'retry' });
    // Re-render must not re-warm (one load per mount, not per render).
    rerender();
    expect(prepareRewardedMock).toHaveBeenCalledTimes(1);
  });

  it('does not pre-load when warm is omitted', () => {
    renderHook(() => useRewardedAd({ surface: 'retry' }));
    expect(prepareRewardedMock).not.toHaveBeenCalled();
  });

  it('does not pre-load when warm is false', () => {
    renderHook(() => useRewardedAd({ surface: 'doubleGold', warm: false }));
    expect(prepareRewardedMock).not.toHaveBeenCalled();
  });

  it('does not pre-load when the daily view cap is reached', () => {
    localStorage.setItem(
      'lexiclash_daily_ad_views',
      JSON.stringify({ date: todayKey(), count: 10 }),
    );
    renderHook(() => useRewardedAd({ surface: 'retry', warm: true }));
    expect(prepareRewardedMock).not.toHaveBeenCalled();
  });

  it('warms when warm flips from false to true (e.g. earnings arrive)', () => {
    const { rerender } = renderHook(
      ({ warm }: { warm: boolean }) => useRewardedAd({ surface: 'doubleGold', warm }),
      { initialProps: { warm: false } },
    );
    expect(prepareRewardedMock).not.toHaveBeenCalled();
    rerender({ warm: true });
    expect(prepareRewardedMock).toHaveBeenCalledTimes(1);
    expect(prepareRewardedMock).toHaveBeenCalledWith({ surface: 'doubleGold' });
    // Flipping again must not double-warm.
    rerender({ warm: false });
    rerender({ warm: true });
    expect(prepareRewardedMock).toHaveBeenCalledTimes(1);
  });
});
