import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const showRewardedAyet = vi.fn<() => Promise<boolean>>();
const initAyetVideo = vi.fn(() => Promise.resolve());

vi.mock('@/lib/ads/ayetVideoAds', () => ({
  showRewardedAyet: (...a: unknown[]) => showRewardedAyet(...(a as [])),
  initAyetVideo: (...a: unknown[]) => initAyetVideo(...(a as [])),
}));

import { useAyetVideoAds } from '../useAyetVideoAds';

describe('useAyetVideoAds', () => {
  beforeEach(() => {
    showRewardedAyet.mockReset();
    initAyetVideo.mockClear();
  });

  it('calls onReward when the rewarded video is fully watched', async () => {
    showRewardedAyet.mockResolvedValue(true);
    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useAyetVideoAds());

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      await Promise.resolve(); await Promise.resolve();
    });

    expect(onReward).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError when the video is closed before completion', async () => {
    showRewardedAyet.mockResolvedValue(false);
    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useAyetVideoAds());

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      await Promise.resolve(); await Promise.resolve();
    });

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('calls onError when the SDK rejects (no fill)', async () => {
    showRewardedAyet.mockRejectedValue(new Error('ayet-no-fill'));
    const onReward = vi.fn();
    const onError = vi.fn();
    const { result } = renderHook(() => useAyetVideoAds());

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      await Promise.resolve(); await Promise.resolve();
    });

    expect(onError).toHaveBeenCalledWith('ayet-no-fill');
  });

  it('exposes isAvailable true in a browser environment', () => {
    const { result } = renderHook(() => useAyetVideoAds());
    expect(result.current.isAvailable).toBe(true);
  });
});
