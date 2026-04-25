/**
 * Tests for useSpendAnimation hook
 *
 * Encapsulates the coin-spend overlay state triple:
 *   visibility, origin point, amount.
 *
 * Previously inlined in DailyWordHuntResults; extracted to stay under file cap
 * and centralize the trigger/dismiss handshake so analytics or accessibility
 * concerns can attach at one seam later.
 */

import { act, renderHook } from '@testing-library/react';
import { useSpendAnimation } from '../useSpendAnimation';

describe('useSpendAnimation', () => {
  it('starts hidden with zero amount and origin at (0,0)', () => {
    const { result } = renderHook(() => useSpendAnimation());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.amount).toBe(0);
    expect(result.current.position).toEqual({ x: 0, y: 0 });
  });

  it('start() shows the animation with caller-provided origin and amount', () => {
    const { result } = renderHook(() => useSpendAnimation());

    act(() => {
      result.current.start({ x: 120, y: 240 }, 50);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.position).toEqual({ x: 120, y: 240 });
    expect(result.current.amount).toBe(50);
  });

  it('hide() clears visibility without resetting amount/position', () => {
    const { result } = renderHook(() => useSpendAnimation());

    act(() => {
      result.current.start({ x: 10, y: 20 }, 15);
    });
    act(() => {
      result.current.hide();
    });

    expect(result.current.isVisible).toBe(false);
    // amount/position are retained so the fade-out animation can finish
    // reading its final frame without a visual jump
    expect(result.current.position).toEqual({ x: 10, y: 20 });
    expect(result.current.amount).toBe(15);
  });

  it('start() is a stable reference across renders (safe for useCallback consumers)', () => {
    const { result, rerender } = renderHook(() => useSpendAnimation());
    const firstStart = result.current.start;
    const firstHide = result.current.hide;

    rerender();

    expect(result.current.start).toBe(firstStart);
    expect(result.current.hide).toBe(firstHide);
  });
});
