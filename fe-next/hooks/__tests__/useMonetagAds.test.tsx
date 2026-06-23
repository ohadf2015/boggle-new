import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the SDK lib so the hook can be exercised without a real browser SDK.
const showRewardedMonetag = vi.fn<() => Promise<boolean>>();
const initMonetagAds = vi.fn(() => Promise.resolve());

vi.mock('@/lib/ads/monetagAds', () => ({
  showRewardedMonetag: (...args: unknown[]) => showRewardedMonetag(...(args as [])),
  initMonetagAds: () => initMonetagAds(),
}));

import { useMonetagAds } from '../useMonetagAds';

describe('useMonetagAds', () => {
  beforeEach(() => {
    showRewardedMonetag.mockReset();
    initMonetagAds.mockClear();
  });

  it('calls onReward when the rewarded ad is watched (promise resolves)', async () => {
    showRewardedMonetag.mockResolvedValue(true);
    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useMonetagAds());

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onReward).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError when the SDK rejects (dismissed / no fill / native-blocked)', async () => {
    showRewardedMonetag.mockRejectedValue(new Error('monetag-native-blocked'));
    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useMonetagAds());

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('monetag-native-blocked');
  });

  it('settles exactly once', async () => {
    showRewardedMonetag.mockResolvedValue(true);
    const onReward = vi.fn();
    const { result } = renderHook(() => useMonetagAds());

    await act(async () => {
      result.current.showRewarded(onReward, undefined, { name: 'hint' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onReward).toHaveBeenCalledTimes(1);
  });

  it('exposes isAvailable true in a browser environment', () => {
    const { result } = renderHook(() => useMonetagAds());
    expect(result.current.isAvailable).toBe(true);
  });
});
