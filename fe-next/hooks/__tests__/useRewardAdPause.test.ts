/**
 * useRewardAdPause Hook Tests
 *
 * Mirrors useGiftModalPause: an event-bus pause so a fullscreen rewarded ad
 * can freeze the game clock (via useGameTimer's isExternallyPaused) without
 * tripping the user-pause flag. Without it the timer ticks to 0 behind the ad
 * → premature game-over and a reward that lands too late to matter.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRewardAdPause, emitRewardAdActive } from '../useRewardAdPause';

describe('useRewardAdPause', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false initially', () => {
    const { result } = renderHook(() => useRewardAdPause());
    expect(result.current).toBe(false);
  });

  it('returns true after emitRewardAdActive(true)', () => {
    const { result } = renderHook(() => useRewardAdPause());

    act(() => { emitRewardAdActive(true); });

    expect(result.current).toBe(true);
  });

  it('returns false again after emitRewardAdActive(false)', () => {
    const { result } = renderHook(() => useRewardAdPause());

    act(() => { emitRewardAdActive(true); });
    expect(result.current).toBe(true);

    act(() => { emitRewardAdActive(false); });
    expect(result.current).toBe(false);
  });

  it('handles multiple active/inactive cycles', () => {
    const { result } = renderHook(() => useRewardAdPause());

    act(() => { emitRewardAdActive(true); });
    expect(result.current).toBe(true);
    act(() => { emitRewardAdActive(false); });
    expect(result.current).toBe(false);

    act(() => { emitRewardAdActive(true); });
    expect(result.current).toBe(true);
    act(() => { emitRewardAdActive(false); });
    expect(result.current).toBe(false);
  });

  it('cleans up its event listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useRewardAdPause());
    expect(addSpy).toHaveBeenCalledWith('rewardAdActiveChange', expect.any(Function));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('rewardAdActiveChange', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
