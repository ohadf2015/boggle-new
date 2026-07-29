import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { fromTo, to, timeline } = vi.hoisted(() => {
  const fromTo = vi.fn();
  const to = vi.fn();
  const timeline = vi.fn();
  return { fromTo, to, timeline };
});

vi.mock('gsap', () => {
  timeline.mockImplementation(() => ({ fromTo, to, kill: vi.fn() }));
  return { default: { timeline, to, fromTo } };
});

beforeEach(() => {
  fromTo.mockClear();
  timeline.mockClear();
  to.mockClear();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

import { usePracticeJuice } from './usePracticeJuice';

describe('usePracticeJuice', () => {
  it('triggerWordFound creates a timeline with tile-pop fromTo calls', () => {
    const { result } = renderHook(() => usePracticeJuice());
    act(() => {
      result.current.triggerWordFound([
        { x: 10, y: 20, el: document.createElement('div') },
        { x: 30, y: 40, el: document.createElement('div') },
      ]);
    });
    expect(timeline).toHaveBeenCalled();
    expect(fromTo).toHaveBeenCalled();
  });

  it('triggerInvalid creates a shake timeline', () => {
    const { result } = renderHook(() => usePracticeJuice());
    act(() => result.current.triggerInvalid(document.createElement('div')));
    expect(timeline).toHaveBeenCalled();
  });

  it('triggerGoalComplete creates a celebration timeline', () => {
    const { result } = renderHook(() => usePracticeJuice());
    act(() => { result.current.triggerGoalComplete(); });
    expect(timeline).toHaveBeenCalled();
  });

  it('reduced-motion gate skips all triggers', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
    });
    const { result } = renderHook(() => usePracticeJuice());
    act(() => result.current.triggerInvalid(document.createElement('div')));
    expect(timeline).not.toHaveBeenCalled();
  });
});
