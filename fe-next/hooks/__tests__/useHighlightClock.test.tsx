import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHighlightClock } from '../useHighlightClock';

describe('useHighlightClock', () => {
  let rafCallbacks: Array<(t: number) => void> = [];
  let now = 0;

  beforeEach(() => {
    rafCallbacks = [];
    now = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => vi.unstubAllGlobals());

  function tick(deltaMs: number) {
    now += deltaMs;
    const cbs = rafCallbacks;
    rafCallbacks = [];
    act(() => cbs.forEach(cb => cb(now)));
  }

  it('starts in idle phase with elapsed=0 rate=1', () => {
    const { result } = renderHook(() => useHighlightClock());
    expect(result.current.state.phase).toBe('idle');
    expect(result.current.state.elapsed).toBe(0);
  });

  it('start() advances elapsed at rate=1 by default', () => {
    const { result } = renderHook(() => useHighlightClock());
    act(() => result.current.start());
    tick(16);
    tick(16);
    expect(result.current.state.elapsed).toBeGreaterThan(0);
  });

  it('setRate scales elapsed advance', () => {
    const { result } = renderHook(() => useHighlightClock());
    act(() => result.current.start());
    act(() => result.current.setRate(0.5));
    tick(100);
    expect(result.current.state.elapsed).toBeLessThan(100);
  });

  it('stop() halts advance', () => {
    const { result } = renderHook(() => useHighlightClock());
    act(() => result.current.start());
    tick(100);
    const before = result.current.state.elapsed;
    act(() => result.current.stop());
    tick(100);
    expect(result.current.state.elapsed).toBe(before);
  });
});
