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

  it('emits mode_coach_shown once when the coach first appears', () => {
    show();
    expect(capture).toHaveBeenCalledWith('mode_coach_shown', { mode: 'classic' });
    expect(capture.mock.calls.filter((c) => c[0] === 'mode_coach_shown')).toHaveLength(1);
  });

  it('emits nothing on a repeat visit (already seen)', () => {
    window.localStorage.setItem('lc_coach_classic', '1');
    renderHook(() => useModeCoach('classic'));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it('emits mode_coach_dismissed with the given reason on dismiss', () => {
    const { result } = show();
    act(() => result.current.dismiss('skip'));
    expect(capture).toHaveBeenCalledWith('mode_coach_dismissed', {
      mode: 'classic',
      reason: 'skip',
      step: 0,
    });
  });

  it('defaults the dismiss reason to skip', () => {
    const { result } = show();
    act(() => result.current.dismiss());
    expect(capture).toHaveBeenCalledWith('mode_coach_dismissed', {
      mode: 'classic',
      reason: 'skip',
      step: 0,
    });
  });

  it('emits reason=completed when advancing past the last step', () => {
    const { result } = show(); // classic = 2 steps
    act(() => result.current.advance()); // 0 -> 1 (last step), no dismiss yet
    act(() => result.current.advance()); // past last -> completed
    expect(capture).toHaveBeenCalledWith('mode_coach_dismissed', {
      mode: 'classic',
      reason: 'completed',
      step: 1,
    });
  });

  it('emits mode_coach_dismissed at most once per show cycle', () => {
    const { result } = show();
    act(() => result.current.dismiss('escape'));
    act(() => result.current.dismiss('skip'));
    expect(capture.mock.calls.filter((c) => c[0] === 'mode_coach_dismissed')).toHaveLength(1);
  });
});
