import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompleteCardDelay } from '../useCompleteCardDelay';

describe('useCompleteCardDelay', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns show=false while still playing', () => {
    const { result } = renderHook(() => useCompleteCardDelay({ status: 'playing', chainDepth: 0 }));
    expect(result.current.show).toBe(false);
  });

  it('shows after the (shortened) settle delay on a depth-0 completion', () => {
    const { result, rerender } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as const, d: 0 } },
    );
    act(() => { rerender({ s: 'levelComplete' as const, d: 0 }); });
    expect(result.current.show).toBe(false);
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current.show).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.show).toBe(true);
  });

  it('adds a beat per chain depth past 1 but CAPS the total wait', () => {
    const { result, rerender } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as const, d: 0 } },
    );
    // depth 8 would be huge uncapped; capped at 2 beats → 2*250 + 300 = 800ms.
    act(() => { rerender({ s: 'levelComplete' as const, d: 8 }); });
    act(() => { vi.advanceTimersByTime(799); });
    expect(result.current.show).toBe(false);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.show).toBe(true);
  });

  it('skip() reveals the card immediately, before the settle elapses', () => {
    const { result, rerender } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as const, d: 0 } },
    );
    act(() => { rerender({ s: 'levelComplete' as const, d: 4 }); });
    expect(result.current.show).toBe(false);
    act(() => { result.current.skip(); });
    expect(result.current.show).toBe(true);
  });

  it('resets to false when a new level starts (status back to playing)', () => {
    const { result, rerender } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as const, d: 0 } },
    );
    act(() => { rerender({ s: 'levelComplete' as const, d: 2 }); });
    act(() => { vi.advanceTimersByTime(800); });
    expect(result.current.show).toBe(true);
    act(() => { rerender({ s: 'playing' as const, d: 0 }); });
    expect(result.current.show).toBe(false);
  });
});
