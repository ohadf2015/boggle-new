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

  function mount(mode: 'classic' = 'classic') {
    const view = renderHook(() => useModeCoach(mode));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    return view;
  }
  const events = (name: string) => capture.mock.calls.filter((c) => c[0] === name);

  it('emits mode_coach_shown once on a first visit', () => {
    mount();
    expect(events('mode_coach_shown')).toEqual([['mode_coach_shown', { mode: 'classic' }]]);
  });

  it('emits nothing on a repeat visit (already seen)', () => {
    window.localStorage.setItem('lc_coach_classic', '1');
    renderHook(() => useModeCoach('classic'));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it('emits exactly one mode_coach_dismissed however many closes race', () => {
    const { result } = mount();
    act(() => result.current.dismiss('skip'));
    act(() => result.current.dismiss('escape'));
    act(() => result.current.dismiss());
    expect(events('mode_coach_dismissed')).toEqual([['mode_coach_dismissed', { mode: 'classic', reason: 'skip', step: 0 }]]);
  });

  it('reports completed when advancing past the last step', () => {
    const { result } = mount(); // classic = 2 steps
    act(() => result.current.advance());
    act(() => result.current.advance());
    act(() => result.current.advance());
    expect(events('mode_coach_dismissed')).toEqual([['mode_coach_dismissed', { mode: 'classic', reason: 'completed', step: 1 }]]);
  });
});
