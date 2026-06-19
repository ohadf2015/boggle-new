import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useModeCoach } from './useModeCoach';
import { coachStorageKey } from '@/lib/tutorial/modeCoachStore';

describe('useModeCoach', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays hidden until the settle delay, then shows on first visit', () => {
    const { result } = renderHook(() => useModeCoach('classic', { settleMs: 500 }));
    expect(result.current.visible).toBe(false);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.visible).toBe(true);
    expect(result.current.stepIndex).toBe(0);
  });

  it('persists "seen" the moment it shows (abandon-safe) and fires onShown once', () => {
    const onShown = vi.fn();
    renderHook(() => useModeCoach('classic', { settleMs: 100, onShown }));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(window.localStorage.getItem(coachStorageKey('classic'))).toBe('1');
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it('never shows again once seen', () => {
    window.localStorage.setItem(coachStorageKey('classic'), '1');
    const { result } = renderHook(() => useModeCoach('classic', { settleMs: 50 }));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.visible).toBe(false);
  });

  it('advances through steps then closes on the last advance', () => {
    const { result } = renderHook(() => useModeCoach('classic', { settleMs: 10 }));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    // classic has 2 steps
    expect(result.current.stepIndex).toBe(0);
    expect(result.current.isLastStep).toBe(false);
    act(() => result.current.advance());
    expect(result.current.stepIndex).toBe(1);
    expect(result.current.isLastStep).toBe(true);
    act(() => result.current.advance());
    expect(result.current.visible).toBe(false);
  });

  it('dismiss hides it immediately', () => {
    const { result } = renderHook(() => useModeCoach('blast', { settleMs: 10 }));
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.visible).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
  });
});
