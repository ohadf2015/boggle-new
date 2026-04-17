/**
 * useAdventureTimerReport Tests
 *
 * Reports timer state to parent only on significant changes:
 * play/pause/phase flip, 5s-bucket crossing, or final-10s countdown.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAdventureTimerReport } from '../useAdventureTimerReport';

describe('useAdventureTimerReport', () => {
  const baseProps = {
    timeRemaining: 60,
    totalTime: 90,
    isPlaying: true,
    isPaused: false,
    entryPhase: 'playing' as const,
    onTimerStateChange: undefined as undefined | ((s: unknown) => void),
  };

  it('fires once on mount when actively playing', () => {
    const cb = vi.fn();
    renderHook(() => useAdventureTimerReport({ ...baseProps, onTimerStateChange: cb }));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ timeRemaining: 60, totalTime: 90, isPlaying: true, isPaused: false });
  });

  it('suppresses reports for sub-5s tick drift within a bucket', () => {
    const cb = vi.fn();
    // 58→57→56: all floor(.../5) = 11, no bucket crossing
    const { rerender } = renderHook(
      (p: typeof baseProps) => useAdventureTimerReport({ ...p, onTimerStateChange: cb }),
      { initialProps: { ...baseProps, timeRemaining: 58 } }
    );
    cb.mockClear();
    rerender({ ...baseProps, timeRemaining: 57 });
    rerender({ ...baseProps, timeRemaining: 56 });
    expect(cb).not.toHaveBeenCalled();
  });

  it('fires on 5s-bucket crossing', () => {
    const cb = vi.fn();
    const { rerender } = renderHook(
      (p: typeof baseProps) => useAdventureTimerReport({ ...p, onTimerStateChange: cb }),
      { initialProps: { ...baseProps, timeRemaining: 60 } }
    );
    rerender({ ...baseProps, timeRemaining: 54 });
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('fires every tick in final-10s window', () => {
    const cb = vi.fn();
    const { rerender } = renderHook(
      (p: typeof baseProps) => useAdventureTimerReport({ ...p, onTimerStateChange: cb }),
      { initialProps: { ...baseProps, timeRemaining: 11 } }
    );
    cb.mockClear();
    rerender({ ...baseProps, timeRemaining: 10 });
    rerender({ ...baseProps, timeRemaining: 9 });
    rerender({ ...baseProps, timeRemaining: 8 });
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('fires on pause flip', () => {
    const cb = vi.fn();
    const { rerender } = renderHook(
      (p: typeof baseProps) => useAdventureTimerReport({ ...p, onTimerStateChange: cb }),
      { initialProps: { ...baseProps, isPaused: false } }
    );
    cb.mockClear();
    rerender({ ...baseProps, isPaused: true });
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isPaused: true }));
  });

  it('reports isPlaying=false when entryPhase !== playing even if isPlaying=true', () => {
    const cb = vi.fn();
    renderHook(() =>
      useAdventureTimerReport({ ...baseProps, entryPhase: 'entering', onTimerStateChange: cb })
    );
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ isPlaying: false }));
  });

  it('is a no-op when onTimerStateChange is undefined', () => {
    expect(() => renderHook(() => useAdventureTimerReport(baseProps))).not.toThrow();
  });
});
