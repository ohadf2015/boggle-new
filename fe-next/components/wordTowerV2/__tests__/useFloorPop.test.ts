import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFloorPop } from '../useFloorPop';

describe('useFloorPop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('given heightM increases (floor built), when rerendered, then delta is captured and isActive is true', () => {
    const { result, rerender } = renderHook((h: number) => useFloorPop(h), {
      initialProps: 3.5,
    });

    // Initial render: no animation
    expect(result.current.isActive).toBe(false);
    expect(result.current.delta).toBe(0);

    // Height increases (floor built)
    rerender(4.2);

    // Now isActive should be true and delta should be the increase
    expect(result.current.isActive).toBe(true);
    expect(result.current.delta).toBeGreaterThan(0.6);
    expect(result.current.delta).toBeLessThan(0.8);
    expect(result.current.shouldAnimate).toBe(true);
  });

  it('given the animation times out (600ms), when timeout fires, then isActive becomes false but delta persists', async () => {
    const { result, rerender } = renderHook((h: number) => useFloorPop(h), {
      initialProps: 3.5,
    });

    rerender(4.2);
    expect(result.current.isActive).toBe(true);
    const capturedDelta = result.current.delta;

    // Advance 600ms
    vi.advanceTimersByTime(600);

    // Wait for the state update
    await waitFor(() => {
      expect(result.current.isActive).toBe(false);
    });

    // Delta should still show the increase (for the +Nm display to keep showing briefly if needed)
    expect(result.current.delta).toBe(capturedDelta);
  });

  it('given heightM decreases (floor lost), when rerendered, then no pop animation fires', () => {
    const { result, rerender } = renderHook((h: number) => useFloorPop(h), {
      initialProps: 5.0,
    });

    rerender(4.1);

    // Should remain inactive on decrease
    expect(result.current.isActive).toBe(false);
    expect(result.current.delta).toBeCloseTo(0, 1);
  });

  it('given multiple floors built in succession, when each lands, then each fires its own pop', async () => {
    const { result, rerender } = renderHook((h: number) => useFloorPop(h), {
      initialProps: 3.0,
    });

    // First floor
    rerender(3.7);
    expect(result.current.isActive).toBe(true);
    const delta1 = result.current.delta;
    expect(delta1).toBeGreaterThan(0.6);

    vi.advanceTimersByTime(600);

    // Wait for isActive to become false
    await waitFor(() => {
      expect(result.current.isActive).toBe(false);
    });

    // Second floor with different height delta
    rerender(4.6);
    expect(result.current.isActive).toBe(true);
    const delta2 = result.current.delta;
    expect(delta2).toBeGreaterThan(0.8); // This is different from delta1
    expect(delta2).not.toBeCloseTo(delta1); // Different delta
  });

  it('given reducedMotion is true, when floor is built, then shouldAnimate is false but isActive is true', () => {
    const { result, rerender } = renderHook((h: number) => useFloorPop(h, true), {
      initialProps: 3.5,
    });

    rerender(4.2);
    expect(result.current.isActive).toBe(true);
    expect(result.current.delta).toBeGreaterThan(0);
    // With reducedMotion, shouldAnimate is false even though isActive is true
    expect(result.current.shouldAnimate).toBe(false);
  });

  it('given the hook is mounted with floors already present, when first render, then no pop fires', () => {
    const { result } = renderHook((h: number) => useFloorPop(h), {
      initialProps: 5.0,
    });

    // On mount with non-zero height, should not animate
    expect(result.current.isActive).toBe(false);
    expect(result.current.delta).toBe(0);
  });
});
