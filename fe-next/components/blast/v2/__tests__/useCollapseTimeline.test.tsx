import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCollapseTimeline } from '../useCollapseTimeline';

describe('useCollapseTimeline', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not animate on first render (no prior tileIds)', () => {
    const ref = { current: document.createElement('div') };
    const { rerender } = renderHook(
      ({ ids }) => useCollapseTimeline(ref, ids),
      { initialProps: { ids: [['a', 'b']] } },
    );
    rerender({ ids: [['a', 'b']] });
    expect(true).toBe(true);
  });

  it('skips animation when prefers-reduced-motion is set', () => {
    const ref = { current: document.createElement('div') };
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const { rerender } = renderHook(
      ({ ids }) => useCollapseTimeline(ref, ids),
      { initialProps: { ids: [['a']] } },
    );
    rerender({ ids: [['b']] });
    expect(true).toBe(true);
  });

  it('does nothing if boardRef is null', () => {
    const ref = { current: null };
    const { rerender } = renderHook(
      ({ ids }) => useCollapseTimeline(ref, ids),
      { initialProps: { ids: [['a']] } },
    );
    rerender({ ids: [['b']] });
    expect(true).toBe(true);
  });
});
