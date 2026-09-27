import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModeCoach } from './useModeCoach';
import { coachStorageKey } from '@/lib/tutorial/modeCoachStore';

// Contract since commit 87653de ("remove blocking tutorial flow"): the FTUE
// coach is disabled — it NEVER becomes visible. On the first visit it only
// marks the mode as seen (so a re-enabled coach won't re-pop) and fires the
// onShown callback once so cross-device DB backfill keeps working.
describe('useModeCoach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays hidden on first visit — before AND after the settle delay', () => {
    const { result } = renderHook(() => useModeCoach('classic', { settleMs: 500 }));
    expect(result.current.visible).toBe(false);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.visible).toBe(false);
    expect(result.current.stepIndex).toBe(0);
  });

  it('marks the mode as seen on mount and fires onShown once (DB backfill)', () => {
    const onShown = vi.fn();
    renderHook(() => useModeCoach('classic', { settleMs: 100, onShown }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(window.localStorage.getItem(coachStorageKey('classic'))).toBe('1');
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('does not fire onShown again on a repeat visit (already seen)', () => {
    window.localStorage.setItem(coachStorageKey('classic'), '1');
    const onShown = vi.fn();
    const { result } = renderHook(() => useModeCoach('classic', { settleMs: 50, onShown }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.visible).toBe(false);
    expect(onShown).not.toHaveBeenCalled();
  });

  it('dismiss and advance never make it visible', () => {
    const { result } = renderHook(() => useModeCoach('blast', { settleMs: 10 }));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.visible).toBe(false);
    act(() => result.current.advance());
    expect(result.current.visible).toBe(false);
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
  });
});
