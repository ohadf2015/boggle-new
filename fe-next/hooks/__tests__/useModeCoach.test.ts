import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useModeCoach } from '../useModeCoach';

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => capture(...args) },
}));

describe('useModeCoach analytics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    capture.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits nothing on mount — coach removed, replaced by contextual overlay', () => {
    renderHook(() => useModeCoach('classic'));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(capture).not.toHaveBeenCalledWith('mode_coach_shown', expect.anything());
  });

  it('emits nothing on a repeat visit (always no-op)', () => {
    window.localStorage.setItem('lc_coach_classic', '1');
    renderHook(() => useModeCoach('classic'));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it('dismiss is a safe no-op (never visible)', () => {
    const { result } = renderHook(() => useModeCoach('classic'));
    act(() => result.current.dismiss('skip'));
    expect(result.current.visible).toBe(false);
  });

  it('advance does not crash (safe to call on removed coach)', () => {
    const { result } = renderHook(() => useModeCoach('classic'));
    act(() => result.current.advance());
    // Coach is never visible regardless of step — no crash is the assertion
    expect(result.current.visible).toBe(false);
  });

  it('marks seen in storage on mount to prevent re-shows', () => {
    renderHook(() => useModeCoach('classic'));
    expect(window.localStorage.getItem('lc_coach_classic')).toBe('1');
  });
});
