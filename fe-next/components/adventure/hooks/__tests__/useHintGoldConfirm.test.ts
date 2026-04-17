/**
 * useHintGoldConfirm Tests
 *
 * Two-step hint confirmation when a hint costs gold:
 *   1st click → enter "pending" state (5s auto-dismiss).
 *   2nd click → execute hint.
 * Free hints execute immediately.
 */

import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHintGoldConfirm } from '../useHintGoldConfirm';

describe('useHintGoldConfirm', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const baseProps = {
    hasHintsAvailable: true,
    nextHintCost: 10,
    getHint: vi.fn(),
    dismissAutoHint: vi.fn(),
    onHintConsumed: vi.fn(),
  };

  it('executes immediately when hint is free', () => {
    const getHint = vi.fn();
    const onHintConsumed = vi.fn();
    const { result } = renderHook(() =>
      useHintGoldConfirm({ ...baseProps, nextHintCost: 0, getHint, onHintConsumed })
    );
    act(() => result.current.handleHintClick());
    expect(getHint).toHaveBeenCalledTimes(1);
    expect(onHintConsumed).toHaveBeenCalledTimes(1);
    expect(result.current.hintGoldPending).toBe(false);
  });

  it('first paid click sets pending, does not execute', () => {
    const getHint = vi.fn();
    const { result } = renderHook(() => useHintGoldConfirm({ ...baseProps, getHint }));
    act(() => result.current.handleHintClick());
    expect(getHint).not.toHaveBeenCalled();
    expect(result.current.hintGoldPending).toBe(true);
  });

  it('second paid click executes and clears pending', () => {
    const getHint = vi.fn();
    const { result } = renderHook(() => useHintGoldConfirm({ ...baseProps, getHint }));
    act(() => result.current.handleHintClick());
    act(() => result.current.handleHintClick());
    expect(getHint).toHaveBeenCalledTimes(1);
    expect(result.current.hintGoldPending).toBe(false);
  });

  it('auto-dismisses pending after 5s', () => {
    const { result } = renderHook(() => useHintGoldConfirm(baseProps));
    act(() => result.current.handleHintClick());
    expect(result.current.hintGoldPending).toBe(true);
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.hintGoldPending).toBe(false);
  });

  it('does nothing when hints unavailable', () => {
    const getHint = vi.fn();
    const { result } = renderHook(() =>
      useHintGoldConfirm({ ...baseProps, hasHintsAvailable: false, getHint })
    );
    act(() => result.current.handleHintClick());
    expect(getHint).not.toHaveBeenCalled();
    expect(result.current.hintGoldPending).toBe(false);
  });

  it('clears timer on unmount (no late setState)', () => {
    const { result, unmount } = renderHook(() => useHintGoldConfirm(baseProps));
    act(() => result.current.handleHintClick());
    unmount();
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
  });
});
