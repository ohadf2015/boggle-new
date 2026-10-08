import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModeCoach } from './useModeCoach';
import { coachStorageKey, isCoachOnScreen } from '@/lib/tutorial/modeCoachStore';

// Non-blocking FTUE: shows once per mode on a device's first visit, after a settle delay.
describe('useModeCoach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows on a first visit after the settle delay', () => {
    const { result } = renderHook(() => useModeCoach('classic', { settleMs: 500 }));
    expect(result.current.visible).toBe(false);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.visible).toBe(true);
    expect(result.current.stepIndex).toBe(0);
  });

  it('marks the mode as seen when it shows and fires onShown once', () => {
    const onShown = vi.fn();
    renderHook(() => useModeCoach('classic', { settleMs: 100, onShown }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(window.localStorage.getItem(coachStorageKey('classic'))).toBe('1');
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('stays hidden on a repeat visit (already seen)', () => {
    window.localStorage.setItem(coachStorageKey('classic'), '1');
    const onShown = vi.fn();
    const { result } = renderHook(() => useModeCoach('classic', { settleMs: 50, onShown }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.visible).toBe(false);
    expect(onShown).not.toHaveBeenCalled();
  });

  it('advances through the steps and closes after the last', () => {
    const { result } = renderHook(() => useModeCoach('blast', { settleMs: 10 }));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    act(() => result.current.advance());
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.isLastStep).toBe(true);
    act(() => result.current.advance());
    expect(result.current.visible).toBe(false);
  });

  it('dismiss hides it', () => {
    const { result } = renderHook(() => useModeCoach('blast', { settleMs: 10 }));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
  });

  it('flags the card as on screen while visible, and clears it on dismiss and unmount', () => {
    const { result, unmount } = renderHook(() => useModeCoach('classic', { settleMs: 10 }));
    act(() => { vi.advanceTimersByTime(10); });
    expect(isCoachOnScreen()).toBe(true);
    act(() => { result.current.dismiss(); });
    expect(isCoachOnScreen()).toBe(false);
    window.localStorage.clear();
    const second = renderHook(() => useModeCoach('blast', { settleMs: 10 }));
    act(() => { vi.advanceTimersByTime(10); });
    expect(isCoachOnScreen()).toBe(true);
    second.unmount();
    expect(isCoachOnScreen()).toBe(false);
    unmount();
  });
});
