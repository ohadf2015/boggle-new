/**
 * useRewardedAd — segmented surfaces
 *
 * Each rewarded surface (hint, doubleGold, freeze, retry, timeLow) routes to
 * its own AdMob unit ID so AdMob's mediation can optimize per-surface eCPM.
 * The hook accepts an optional `surface` option that is forwarded to
 * useAdMob.showRewarded. When omitted, surface defaults to 'generic' and the
 * legacy unit ID is used (zero-regression for existing callers).
 */
import { renderHook, act } from '@testing-library/react';

const showRewardedMock = vi.fn();

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({
    isAvailable: false,
    isOnCrazyGamesPlatform: false,
    showRewardedAd: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdMob', () => ({
  useAdMob: () => ({ isAvailable: true, showRewarded: showRewardedMock }),
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

describe('useRewardedAd — surface routing', () => {
  beforeEach(() => {
    showRewardedMock.mockReset();
    // showRewarded(onReward, onError, opts) — invoke onReward to settle promise
    showRewardedMock.mockImplementation((onReward: () => void) => {
      onReward();
    });
    localStorage.clear();
  });

  it('forwards surface=hint to useAdMob.showRewarded', () => {
    const { result } = renderHook(() => useRewardedAd({ surface: 'hint' }));
    act(() => { result.current.showAd(); });
    expect(showRewardedMock).toHaveBeenCalled();
    const call = showRewardedMock.mock.calls[0];
    // 3rd arg is the options bag — surface lives there.
    expect(call[2]).toMatchObject({ surface: 'hint' });
  });

  it('forwards surface=doubleGold', () => {
    const { result } = renderHook(() => useRewardedAd({ surface: 'doubleGold' }));
    act(() => { result.current.showAd(); });
    expect(showRewardedMock.mock.calls[0][2]).toMatchObject({ surface: 'doubleGold' });
  });

  it('forwards surface=freeze', () => {
    const { result } = renderHook(() => useRewardedAd({ surface: 'freeze' }));
    act(() => { result.current.showAd(); });
    expect(showRewardedMock.mock.calls[0][2]).toMatchObject({ surface: 'freeze' });
  });

  it('forwards surface=retry', () => {
    const { result } = renderHook(() => useRewardedAd({ surface: 'retry' }));
    act(() => { result.current.showAd(); });
    expect(showRewardedMock.mock.calls[0][2]).toMatchObject({ surface: 'retry' });
  });

  it('forwards surface=timeLow', () => {
    const { result } = renderHook(() => useRewardedAd({ surface: 'timeLow' }));
    act(() => { result.current.showAd(); });
    expect(showRewardedMock.mock.calls[0][2]).toMatchObject({ surface: 'timeLow' });
  });

  it('defaults to surface=generic when omitted', () => {
    const { result } = renderHook(() => useRewardedAd());
    act(() => { result.current.showAd(); });
    const opts = showRewardedMock.mock.calls[0][2] || {};
    expect(opts.surface ?? 'generic').toBe('generic');
  });
});
