import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompleteCardDelay } from '../useCompleteCardDelay';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('useCompleteCardDelay', () => {
  it('returns false when status is playing', () => {
    const { result } = renderHook(() => useCompleteCardDelay({ status: 'playing', chainDepth: 0 }));
    expect(result.current).toBe(false);
  });

  it('chainDepth=0: 700ms settle then shows', () => {
    const { result, rerender } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as 'playing' | 'levelComplete', d: 0 } },
    );
    rerender({ s: 'levelComplete', d: 0 });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(699); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(2); });
    expect(result.current).toBe(true);
  });

  it('chainDepth=2: 1050ms settle (1 beat + 700ms)', () => {
    const { result, rerender } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as 'playing' | 'levelComplete', d: 0 } },
    );
    rerender({ s: 'levelComplete', d: 2 });
    act(() => { vi.advanceTimersByTime(700); });
    expect(result.current).toBe(false); // not yet — need 1050ms
    act(() => { vi.advanceTimersByTime(360); });
    expect(result.current).toBe(true);
  });

  it('chainDepth=5: 2100ms settle (4 beats + 700ms)', () => {
    const { result, rerender } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as 'playing' | 'levelComplete', d: 0 } },
    );
    rerender({ s: 'levelComplete', d: 5 });
    act(() => { vi.advanceTimersByTime(2099); });
    expect(result.current).toBe(false);
    act(() => { vi.advanceTimersByTime(2); });
    expect(result.current).toBe(true);
  });

  it('resets to false when status returns to playing', () => {
    const { result, rerender } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as 'playing' | 'levelComplete', d: 0 } },
    );
    rerender({ s: 'levelComplete', d: 2 });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current).toBe(true);
    rerender({ s: 'playing', d: 0 });
    expect(result.current).toBe(false);
  });

  it('cancels pending timer on unmount (no leak)', () => {
    const { rerender, unmount } = renderHook(
      ({ s, d }) => useCompleteCardDelay({ status: s, chainDepth: d }),
      { initialProps: { s: 'playing' as 'playing' | 'levelComplete', d: 0 } },
    );
    rerender({ s: 'levelComplete', d: 2 });
    unmount();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });
});
