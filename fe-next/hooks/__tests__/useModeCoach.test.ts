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

  function show(mode: 'classic' = 'classic') {
    const view = renderHook(() => useModeCoach(mode));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    return view;
  }

  it('emits nothing on a first visit — coach is disabled', () => {
    show();
    // Coach was removed: visible never becomes true, so no events fire.
    expect(capture).not.toHaveBeenCalled();
  });

  it('emits nothing on a repeat visit (already seen)', () => {
    window.localStorage.setItem('lc_coach_classic', '1');
    renderHook(() => useModeCoach('classic'));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it('dismiss does not emit — coach is disabled, dismiss is a no-op', () => {
    const { result } = show();
    act(() => result.current.dismiss('skip'));
    expect(capture).not.toHaveBeenCalled();
  });

  it('dismiss with no argument does not emit', () => {
    const { result } = show();
    act(() => result.current.dismiss());
    expect(capture).not.toHaveBeenCalled();
  });

  it('advance past the last step does not emit — coach is disabled', () => {
    const { result } = show(); // classic = 2 steps
    act(() => result.current.advance()); // 0 -> 1
    act(() => result.current.advance()); // past last, close() is guarded
    expect(capture).not.toHaveBeenCalled();
  });

  it('multiple dismiss calls never emit (idempotent no-op)', () => {
    const { result } = show();
    act(() => result.current.dismiss('escape'));
    act(() => result.current.dismiss('skip'));
    expect(capture).not.toHaveBeenCalled();
  });
});
