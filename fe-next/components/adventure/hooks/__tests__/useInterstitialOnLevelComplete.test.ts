/**
 * useInterstitialOnLevelComplete Tests
 *
 * Fires showInterstitial once on the rising edge of isComplete; no repeat
 * fires while isComplete stays true or flips back and re-completes for the
 * same rising edge within a single mount.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInterstitialOnLevelComplete } from '../useInterstitialOnLevelComplete';

type Props = Parameters<typeof useInterstitialOnLevelComplete>[0];

describe('useInterstitialOnLevelComplete', () => {
  it('fires showInterstitial when isComplete becomes true', () => {
    const showInterstitial = vi.fn();
    const { rerender } = renderHook(
      (p: Props) => useInterstitialOnLevelComplete(p),
      { initialProps: { isComplete: false, showInterstitial, worldNumber: 1, levelNumber: 2 } as Props },
    );
    expect(showInterstitial).not.toHaveBeenCalled();
    rerender({ isComplete: true, showInterstitial, worldNumber: 1, levelNumber: 2 });
    expect(showInterstitial).toHaveBeenCalledWith('adventure-level-complete-1-2');
  });

  it('does not re-fire while isComplete stays true', () => {
    const showInterstitial = vi.fn();
    const { rerender } = renderHook(
      (p: Props) => useInterstitialOnLevelComplete(p),
      { initialProps: { isComplete: true, showInterstitial, worldNumber: 1, levelNumber: 2 } as Props },
    );
    expect(showInterstitial).toHaveBeenCalledTimes(1);
    rerender({ isComplete: true, showInterstitial, worldNumber: 1, levelNumber: 2 });
    expect(showInterstitial).toHaveBeenCalledTimes(1);
  });

  it('fires again on a fresh rising edge after reset to false', () => {
    const showInterstitial = vi.fn();
    const { rerender } = renderHook(
      (p: Props) => useInterstitialOnLevelComplete(p),
      { initialProps: { isComplete: false, showInterstitial, worldNumber: 1, levelNumber: 2 } as Props },
    );
    rerender({ isComplete: true, showInterstitial, worldNumber: 1, levelNumber: 2 });
    rerender({ isComplete: false, showInterstitial, worldNumber: 1, levelNumber: 2 });
    rerender({ isComplete: true, showInterstitial, worldNumber: 1, levelNumber: 2 });
    expect(showInterstitial).toHaveBeenCalledTimes(2);
  });
});
