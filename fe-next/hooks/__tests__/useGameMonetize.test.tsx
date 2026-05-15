/**
 * useGameMonetize — wraps GameMonetize SDK rewarded video for web surface.
 *
 * Mirrors useH5GamesAds shape: initialize() + showRewarded(onReward,onError,opts).
 *
 * Settle model:
 *   - sdk.showAd('rewarded') returns Promise that resolves on ad-complete
 *     (user watched full rewarded video) → fire onReward
 *   - Promise rejects on no-fill / dismiss / error → fire onError
 *   - Single-fire: late events ignored
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { initCalls } = vi.hoisted(() => ({
  initCalls: [] as string[],
}));

const showAdMock = vi.fn();

vi.mock('@/lib/ads/gameMonetizeSdk', () => ({
  initGameMonetizeAds: vi.fn(() => {
    initCalls.push('init');
    return Promise.resolve();
  }),
  getGameMonetizeId: vi.fn(() => 'test-gid'),
}));

import { useGameMonetize } from '@/hooks/useGameMonetize';

beforeEach(() => {
  initCalls.length = 0;
  showAdMock.mockReset();
  // Stub a minimal window.sdk surface — the hook drives it.
  (window as unknown as { sdk?: unknown }).sdk = {
    showAd: showAdMock,
    preloadAd: vi.fn(),
    AdType: { Rewarded: 'rewarded', Interstitial: 'interstitial' },
  };
});

describe('useGameMonetize', () => {
  it('initialize() calls initGameMonetizeAds at least once', async () => {
    const { result } = renderHook(() => useGameMonetize());
    await act(async () => { await result.current.initialize(); });
    await act(async () => { await result.current.initialize(); });
    expect(initCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('showRewarded calls sdk.showAd with rewarded type after init', async () => {
    showAdMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGameMonetize());
    const onReward = vi.fn();
    const onError = vi.fn();

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'hint' });
      // Let init promise + showAd Promise resolve.
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(showAdMock).toHaveBeenCalledTimes(1);
    expect(showAdMock).toHaveBeenCalledWith('rewarded');
  });

  it('reward granted when sdk.showAd promise resolves', async () => {
    showAdMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useGameMonetize());
    const onReward = vi.fn();
    const onError = vi.fn();

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'r1' });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onReward).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it('no reward when sdk.showAd promise rejects (no-fill / dismiss / error)', async () => {
    showAdMock.mockRejectedValue(new Error('no-ad-available'));
    const { result } = renderHook(() => useGameMonetize());
    const onReward = vi.fn();
    const onError = vi.fn();

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'r2' });
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onReward).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('settle is single-fire — second resolution ignored', async () => {
    let resolveA: (() => void) | null = null;
    showAdMock.mockImplementation(() => new Promise<void>((res) => { resolveA = res; }));
    const { result } = renderHook(() => useGameMonetize());
    const onReward = vi.fn();
    const onError = vi.fn();

    await act(async () => {
      result.current.showRewarded(onReward, onError, { name: 'r3' });
      await new Promise((r) => setTimeout(r, 0));
    });
    await act(async () => {
      resolveA!();
      resolveA!(); // double-fire of underlying resolution should not double-pay
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onReward).toHaveBeenCalledTimes(1);
  });

  it('isAvailable reflects browser environment', () => {
    const { result } = renderHook(() => useGameMonetize());
    expect(result.current.isAvailable).toBe(true);
  });
});
