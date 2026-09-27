/**
 * useRewardedFeatureUnlock — per-placement rewarded-ad wrapper.
 *
 * Wraps useRewardedAd to (a) tag every offer with a placement surface for
 * analytics and (b) invoke a feature-unlock callback on reward, separate
 * from the default coin-grant flow that the underlying hook already does.
 */
import { renderHook, act } from '@testing-library/react';

const showAdMock = vi.fn();
const trackOfferedMock = vi.fn();
const trackDeclinedMock = vi.fn();

let mockRewardedAdReturn: {
  status: string;
  canShowAd: boolean;
  rewardAmount: number;
  isPlaceholder: boolean;
  showAd: (...args: unknown[]) => void;
  // capture onRewardEarned so tests can fire it
  _capturedOnReward?: (coins: number) => void | Promise<void>;
  // capture the full options bag so tests can assert passthrough (warm, surface)
  _capturedOpts?: Record<string, unknown>;
};

vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (opts: { onRewardEarned?: (n: number) => void } = {}) => {
    mockRewardedAdReturn._capturedOnReward = opts.onRewardEarned;
    mockRewardedAdReturn._capturedOpts = opts;
    return {
      status: mockRewardedAdReturn.status,
      canShowAd: mockRewardedAdReturn.canShowAd,
      rewardAmount: mockRewardedAdReturn.rewardAmount,
      isPlaceholder: mockRewardedAdReturn.isPlaceholder,
      showAd: showAdMock,
    };
  },
}));

vi.mock('@/utils/growthTracking', () => ({
  trackRewardedAdOffered: (...args: unknown[]) => trackOfferedMock(...args),
  trackRewardedAdDeclined: (...args: unknown[]) => trackDeclinedMock(...args),
}));

import { useRewardedFeatureUnlock } from '../useRewardedFeatureUnlock';

describe('useRewardedFeatureUnlock', () => {
  beforeEach(() => {
    showAdMock.mockClear();
    trackOfferedMock.mockClear();
    trackDeclinedMock.mockClear();
    mockRewardedAdReturn = {
      status: 'idle',
      canShowAd: true,
      rewardAmount: 30,
      isPlaceholder: false,
      showAd: showAdMock,
    };
  });

  it('fires trackRewardedAdOffered once when mounted and ad is available', () => {
    renderHook(() =>
      useRewardedFeatureUnlock({ placement: 'blast_wave_continue', onUnlock: vi.fn() }),
    );
    expect(trackOfferedMock).toHaveBeenCalledTimes(1);
    expect(trackOfferedMock).toHaveBeenCalledWith('blast_wave_continue', expect.any(Object));
  });

  it('does not fire trackRewardedAdOffered when canShowAd is false', () => {
    mockRewardedAdReturn.canShowAd = false;
    renderHook(() =>
      useRewardedFeatureUnlock({ placement: 'blast_wave_continue', onUnlock: vi.fn() }),
    );
    expect(trackOfferedMock).not.toHaveBeenCalled();
  });

  it('does not fire offered when disabled=true', () => {
    renderHook(() =>
      useRewardedFeatureUnlock({
        placement: 'blast_wave_continue',
        onUnlock: vi.fn(),
        disabled: true,
      }),
    );
    expect(trackOfferedMock).not.toHaveBeenCalled();
  });

  it('calls showAd when offer() is invoked', () => {
    const { result } = renderHook(() =>
      useRewardedFeatureUnlock({ placement: 'blast_wave_continue', onUnlock: vi.fn() }),
    );
    act(() => {
      result.current.offer();
    });
    expect(showAdMock).toHaveBeenCalledTimes(1);
  });

  it('does not call showAd when disabled', () => {
    const { result } = renderHook(() =>
      useRewardedFeatureUnlock({
        placement: 'blast_wave_continue',
        onUnlock: vi.fn(),
        disabled: true,
      }),
    );
    act(() => {
      result.current.offer();
    });
    expect(showAdMock).not.toHaveBeenCalled();
  });

  it('invokes onUnlock when the underlying ad rewards', async () => {
    const onUnlock = vi.fn();
    renderHook(() =>
      useRewardedFeatureUnlock({ placement: 'blast_wave_continue', onUnlock }),
    );
    await act(async () => {
      await mockRewardedAdReturn._capturedOnReward?.(30);
    });
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('exposes status, canShowAd, and rewardAmount from underlying hook', () => {
    mockRewardedAdReturn.status = 'showing';
    mockRewardedAdReturn.rewardAmount = 50;
    const { result } = renderHook(() =>
      useRewardedFeatureUnlock({ placement: 'blast_wave_continue', onUnlock: vi.fn() }),
    );
    expect(result.current.status).toBe('showing');
    expect(result.current.canShowAd).toBe(true);
    expect(result.current.rewardAmount).toBe(50);
  });

  // Every feature-unlock CTA is a high-intent placement (continue/retry
  // modals, hint buttons at the moment of need), so the wrapper pre-warms the
  // underlying rewarded slot whenever it is enabled — tap→ad must be instant
  // (cold loads on tap lost 36% of retry watches, AdMob audit 2026-07-03).
  describe('warm passthrough', () => {
    it('passes warm: true to useRewardedAd when enabled', () => {
      renderHook(() =>
        useRewardedFeatureUnlock({ placement: 'blast_wave_continue', onUnlock: vi.fn() }),
      );
      expect(mockRewardedAdReturn._capturedOpts).toMatchObject({ warm: true });
    });

    it('passes warm: false while disabled (modal closed)', () => {
      renderHook(() =>
        useRewardedFeatureUnlock({
          placement: 'blast_wave_continue',
          onUnlock: vi.fn(),
          disabled: true,
        }),
      );
      expect(mockRewardedAdReturn._capturedOpts).toMatchObject({ warm: false });
    });
  });
});
