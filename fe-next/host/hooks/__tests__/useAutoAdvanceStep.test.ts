import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoAdvanceStep } from '../useAutoAdvanceStep';

describe('useAutoAdvanceStep', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts at index 0', () => {
    const { result } = renderHook(() => useAutoAdvanceStep({ count: 3, intervalMs: 1000 }));
    expect(result.current[0]).toBe(0);
  });

  it('auto-advances to the next step after the interval', () => {
    const { result } = renderHook(() => useAutoAdvanceStep({ count: 3, intervalMs: 1000 }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current[0]).toBe(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current[0]).toBe(2);
  });

  it('wraps around from the last step back to the first', () => {
    const { result } = renderHook(() => useAutoAdvanceStep({ count: 3, intervalMs: 1000 }));
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current[0]).toBe(0);
  });

  it('does not advance while paused', () => {
    const { result } = renderHook(() => useAutoAdvanceStep({ count: 3, intervalMs: 1000, paused: true }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current[0]).toBe(0);
  });

  it('resumes advancing when pause is lifted', () => {
    const { result, rerender } = renderHook(
      ({ paused }) => useAutoAdvanceStep({ count: 3, intervalMs: 1000, paused }),
      { initialProps: { paused: true } },
    );
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current[0]).toBe(0);
    rerender({ paused: false });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current[0]).toBe(1);
  });

  it('does not advance when there is only one step', () => {
    const { result } = renderHook(() => useAutoAdvanceStep({ count: 1, intervalMs: 1000 }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current[0]).toBe(0);
  });

  it('resets to 0 when resetKey changes', () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useAutoAdvanceStep({ count: 3, intervalMs: 1000, resetKey }),
      { initialProps: { resetKey: 'a' } },
    );
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current[0]).toBe(2);
    rerender({ resetKey: 'b' });
    expect(result.current[0]).toBe(0);
  });

  it('manual setIndex jumps and restarts the interval', () => {
    const { result } = renderHook(() => useAutoAdvanceStep({ count: 3, intervalMs: 1000 }));
    // 600ms into the cycle, user manually jumps to step 2
    act(() => { vi.advanceTimersByTime(600); });
    act(() => { result.current[1](2); });
    expect(result.current[0]).toBe(2);
    // old cycle's remaining 400ms must NOT fire an advance
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current[0]).toBe(2);
    // a full fresh interval advances (wraps 2 -> 0)
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current[0]).toBe(0);
  });
});
