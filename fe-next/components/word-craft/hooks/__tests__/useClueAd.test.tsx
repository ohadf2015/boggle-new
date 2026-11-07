import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClueAd } from '../useClueAd';

const native = vi.hoisted(() => ({ value: true }));
vi.mock('@/utils/platform', () => ({ isNative: () => native.value }));

const showAd = vi.hoisted(() => vi.fn());
const adState = vi.hoisted(() => ({
  status: 'idle' as string,
  onReward: null as null | (() => Promise<void>),
  warm: undefined as boolean | undefined,
  canShowAd: true,
}));
vi.mock('@/hooks/useRewardedAd', () => ({
  useRewardedAd: (o: { onRewardEarned: () => Promise<void>; warm?: boolean }) => {
    adState.onReward = o.onRewardEarned;
    adState.warm = o.warm;
    return { status: adState.status, canShowAd: adState.canShowAd, rewardAmount: 0, isPlaceholder: false, showAd };
  },
}));
vi.mock('@/utils/growthTracking', () => ({ trackRewardedAdOffered: vi.fn() }));

describe('useClueAd', () => {
  beforeEach(() => {
    native.value = true;
    adState.status = 'idle';
    adState.canShowAd = true;
    showAd.mockReset();
  });

  it('native, out of clues, daily ad cap reached: a tap says the ad failed instead of doing nothing', () => {
    adState.canShowAd = false;
    const onFailed = vi.fn();
    const { result } = renderHook(() => useClueAd({ grantClue: vi.fn(), cluesRemaining: 0, onFailed }));

    act(() => result.current.offer());
    expect(showAd).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it('native, out of clues: a double tap shows one ad and grants once', async () => {
    const grantClue = vi.fn();
    const { result, rerender } = renderHook(() => useClueAd({ grantClue, cluesRemaining: 0, onFailed: vi.fn() }));
    expect(result.current.isAdClue).toBe(true);
    expect(result.current.busy).toBe(false);

    act(() => result.current.offer());
    adState.status = 'loading';
    rerender();
    expect(result.current.busy).toBe(true);

    expect(showAd).toHaveBeenCalledTimes(1);
    await act(async () => {
      await adState.onReward?.();
    });
    expect(grantClue).toHaveBeenCalledTimes(1);
  });

  it('web: no ad path, so the caller keeps granting for free', () => {
    native.value = false;
    const { result } = renderHook(() => useClueAd({ grantClue: vi.fn(), cluesRemaining: 0, onFailed: vi.fn() }));
    expect(result.current.isAdClue).toBe(false);
    expect(adState.warm).toBe(false);
  });

  it('free clues left: ad is neither offered nor pre-warmed', () => {
    const { result } = renderHook(() => useClueAd({ grantClue: vi.fn(), cluesRemaining: 1, onFailed: vi.fn() }));
    expect(result.current.isAdClue).toBe(false);
    expect(adState.warm).toBe(false);
  });

  it('reports a failed ad once', () => {
    const onFailed = vi.fn();
    const { rerender } = renderHook(() => useClueAd({ grantClue: vi.fn(), cluesRemaining: 0, onFailed }));
    adState.status = 'error';
    rerender();
    rerender();
    expect(onFailed).toHaveBeenCalledTimes(1);
  });
});
