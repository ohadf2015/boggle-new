import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWheelTimer } from '../useWheelTimer';

const handlers = () => ({ onExpire: vi.fn(), onTick: vi.fn(), onWarning: vi.fn() });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useWheelTimer', () => {
  it('counts down on the wall clock and expires once', () => {
    const h = handlers();
    const { result } = renderHook(() => useWheelTimer({ duration: 3, running: true, ...h }));
    expect(result.current.clock.timeLeft()).toBe(3);
    act(() => { vi.advanceTimersByTime(3100); });
    expect(result.current.clock.timeLeft()).toBe(0);
    expect(h.onExpire).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(h.onExpire).toHaveBeenCalledTimes(1);
  });

  it('a background gap does not buy time and beeps only the current second', () => {
    const h = handlers();
    const { result } = renderHook(() => useWheelTimer({ duration: 20, running: true, ...h }));
    // Throttled tab: the wall clock moves 15s while intervals barely fire.
    act(() => { vi.setSystemTime(Date.now() + 15_000); vi.advanceTimersByTime(300); });
    expect(result.current.clock.timeLeft()).toBe(5);
    expect(h.onTick).toHaveBeenCalledTimes(1);
    expect(h.onTick).toHaveBeenLastCalledWith(5);
  });

  it('pausing freezes the remaining time', () => {
    const h = handlers();
    const { result, rerender } = renderHook(
      ({ running }) => useWheelTimer({ duration: 10, running, ...h }),
      { initialProps: { running: true } },
    );
    act(() => { vi.advanceTimersByTime(2000); });
    rerender({ running: false });
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(result.current.clock.timeLeft()).toBe(8);
    rerender({ running: true });
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.clock.timeLeft()).toBe(6);
    expect(h.onExpire).not.toHaveBeenCalled();
  });

  it('fires the warning once at ten seconds left', () => {
    const h = handlers();
    renderHook(() => useWheelTimer({ duration: 12, running: true, ...h }));
    act(() => { vi.advanceTimersByTime(4000); });
    expect(h.onWarning).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers when the shown second changes', () => {
    const h = handlers();
    const { result } = renderHook(() => useWheelTimer({ duration: 5, running: true, ...h }));
    const listener = vi.fn();
    result.current.clock.subscribe(listener);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
