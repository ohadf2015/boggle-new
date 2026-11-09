import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useHoldToClear, CLEAR_HOLD_MS } from '../useHoldToClear';

describe('useHoldToClear', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('a tap removes one letter', () => {
    const onTap = vi.fn(); const onHold = vi.fn();
    const { result } = renderHook(() => useHoldToClear({ onTap, onHold }));
    act(() => { result.current.onPointerDown(); result.current.onClick(); });
    expect(onTap).toHaveBeenCalledTimes(1);
    expect(onHold).not.toHaveBeenCalled();
  });

  it('a hold clears the word and the release does not also remove a letter', () => {
    const onTap = vi.fn(); const onHold = vi.fn();
    const { result } = renderHook(() => useHoldToClear({ onTap, onHold }));
    act(() => { result.current.onPointerDown(); vi.advanceTimersByTime(CLEAR_HOLD_MS + 10); });
    act(() => { result.current.onClick(); });
    expect(onHold).toHaveBeenCalledTimes(1);
    expect(onTap).not.toHaveBeenCalled();
    act(() => { result.current.onPointerDown(); result.current.onClick(); });
    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('sliding off the key cancels the hold', () => {
    const onHold = vi.fn();
    const { result } = renderHook(() => useHoldToClear({ onTap: vi.fn(), onHold }));
    act(() => { result.current.onPointerDown(); result.current.onPointerLeave(); vi.advanceTimersByTime(CLEAR_HOLD_MS * 2); });
    expect(onHold).not.toHaveBeenCalled();
  });

  it('without onHold every press is a tap', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useHoldToClear({ onTap }));
    act(() => { result.current.onPointerDown(); vi.advanceTimersByTime(CLEAR_HOLD_MS * 2); result.current.onClick(); });
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
