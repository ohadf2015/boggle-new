/**
 * useIdleDetection Hook Tests
 *
 * Phase 2E growth instrumentation: detect dead time in a round.
 * Fires onIdle once per session after `thresholdMs` of inactivity.
 * reportActivity() resets the timer. sessionKey change re-arms.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleDetection } from '../useIdleDetection';

describe('useIdleDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires onIdle after thresholdMs when enabled', () => {
    const onIdle = vi.fn();
    renderHook(() =>
      useIdleDetection({ enabled: true, thresholdMs: 12000, onIdle, sessionKey: 's1' })
    );

    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('does not fire if disabled', () => {
    const onIdle = vi.fn();
    renderHook(() =>
      useIdleDetection({ enabled: false, thresholdMs: 12000, onIdle, sessionKey: 's1' })
    );

    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(onIdle).not.toHaveBeenCalled();
  });

  it('resets timer on reportActivity', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleDetection({ enabled: true, thresholdMs: 12000, onIdle, sessionKey: 's1' })
    );

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    act(() => {
      result.current.reportActivity();
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onIdle).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('fires only once per session', () => {
    const onIdle = vi.fn();
    const { result } = renderHook(() =>
      useIdleDetection({ enabled: true, thresholdMs: 12000, onIdle, sessionKey: 's1' })
    );

    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.reportActivity();
    });
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it('re-arms when sessionKey changes', () => {
    const onIdle = vi.fn();
    const { rerender } = renderHook(
      ({ sessionKey }) =>
        useIdleDetection({ enabled: true, thresholdMs: 12000, onIdle, sessionKey }),
      { initialProps: { sessionKey: 's1' } }
    );

    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(onIdle).toHaveBeenCalledTimes(1);

    rerender({ sessionKey: 's2' });
    act(() => {
      vi.advanceTimersByTime(12000);
    });
    expect(onIdle).toHaveBeenCalledTimes(2);
  });

  it('does not fire when document is hidden', () => {
    const onIdle = vi.fn();
    const spy = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden');

    renderHook(() =>
      useIdleDetection({ enabled: true, thresholdMs: 12000, onIdle, sessionKey: 's1' })
    );

    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(onIdle).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});
