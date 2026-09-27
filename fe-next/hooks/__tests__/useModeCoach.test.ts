import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useModeCoach } from '../useModeCoach';

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => capture(...args) },
}));

// Contract since commit 87653de: the coach is disabled and never shows, so it
// must be analytics-silent — no mode_coach_shown and no mode_coach_dismissed,
// no matter how the user (or a stray caller) pokes dismiss/advance.
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

  it('emits no mode_coach_shown on a first visit (coach never appears)', () => {
    mount();
    expect(capture.mock.calls.filter((c) => c[0] === 'mode_coach_shown')).toHaveLength(0);
  });

  it('emits nothing on a repeat visit (already seen)', () => {
    window.localStorage.setItem('lc_coach_classic', '1');
    renderHook(() => useModeCoach('classic'));
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it('emits no mode_coach_dismissed on dismiss', () => {
    const { result } = mount();
    act(() => result.current.dismiss('skip'));
    act(() => result.current.dismiss('escape'));
    act(() => result.current.dismiss());
    expect(capture.mock.calls.filter((c) => c[0] === 'mode_coach_dismissed')).toHaveLength(0);
  });

  it('emits nothing when advancing past the last step', () => {
    const { result } = mount(); // classic = 2 steps
    act(() => result.current.advance());
    act(() => result.current.advance());
    act(() => result.current.advance());
    expect(capture).not.toHaveBeenCalled();
  });
});
