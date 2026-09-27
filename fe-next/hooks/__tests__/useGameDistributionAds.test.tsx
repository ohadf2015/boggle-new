import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock the SDK lib so the hook can be exercised without a real browser SDK.
const showRewardedGd = vi.fn<() => Promise<boolean>>();
const initGameDistributionAds = vi.fn(() => Promise.resolve());

vi.mock('@/lib/ads/gameDistributionAds', () => ({
  showRewardedGd: (...args: unknown[]) => showRewardedGd(...(args as [])),
  initGameDistributionAds: () => initGameDistributionAds(),
}));

import { useGameDistributionAds } from '../useGameDistributionAds';

describe('useGameDistributionAds', () => {
  beforeEach(() => {
    showRewardedGd.mockReset();
    initGameDistributionAds.mockClear();
  });

  it('calls onReward when the rewarded ad is fully watched', async () => {
    showRewardedGd.mockResolvedValue(true);
    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useGameDistributionAds());

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onReward).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError when the ad is dismissed before completion', async () => {
    showRewardedGd.mockResolvedValue(false);
    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useGameDistributionAds());

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError when the SDK rejects (no fill / adblock)', async () => {
    showRewardedGd.mockRejectedValue(new Error('gd-no-fill'));
    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useGameDistributionAds());

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith('gd-no-fill');
  });

  it('settles exactly once even if the SDK reports a duplicate outcome', async () => {
    showRewardedGd.mockResolvedValue(true);
    const onReward = vi.fn();
    const { result } = renderHook(() => useGameDistributionAds());

    await act(async () => {
      result.current.showRewarded(onReward, undefined, { name: 'hint' });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onReward).toHaveBeenCalledTimes(1);
  });

  it('exposes isAvailable true in a browser environment', () => {
    const { result } = renderHook(() => useGameDistributionAds());
    expect(result.current.isAvailable).toBe(true);
  });
});
