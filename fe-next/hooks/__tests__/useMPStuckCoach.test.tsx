import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { TAP_MIN, FRUITLESS_MS, SUBMIT_MIN } from '../../lib/ftue/mpStuckCoach';

// Mock analytics + storage so the hook can run in jsdom with no PostHog/localStorage.
const shownSpy = vi.fn();
const outcomeSpy = vi.fn();
vi.mock('../../utils/posthogEngagement', () => ({
  trackMpStuckCoachShown: (...a: unknown[]) => shownSpy(...a),
  trackMpStuckCoachOutcome: (...a: unknown[]) => outcomeSpy(...a),
}));

let storedShown = false;
const markGuidanceShownSpy = vi.fn(() => {
  storedShown = true;
});
vi.mock('../../utils/contextualGuidanceStorage', () => ({
  shouldShowGuidance: () => !storedShown,
  markGuidanceShown: (...a: unknown[]) => markGuidanceShownSpy(...a),
}));

import { useMPStuckCoach, AUTO_HIDE_MS } from '../useMPStuckCoach';

function args(overrides = {}) {
  return {
    active: true,
    isClassic: true,
    totalGamesPlayed: 0,
    isDesktop: false,
    ...overrides,
  };
}

describe('useMPStuckCoach', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storedShown = false;
    shownSpy.mockClear();
    outcomeSpy.mockClear();
    markGuidanceShownSpy.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows tap-hint after repeated single taps and fires the shown event', () => {
    const { result } = renderHook(() => useMPStuckCoach(args()));

    act(() => {
      for (let i = 0; i < TAP_MIN; i++) result.current.markTap();
      vi.advanceTimersByTime(2000); // let the ticker re-evaluate
    });

    expect(result.current.visible).toBe(true);
    expect(result.current.stage).toBe('tap-hint');
    expect(shownSpy).toHaveBeenCalledTimes(1);
    expect(markGuidanceShownSpy).toHaveBeenCalledWith('stuckCoachShown');
  });

  it('fires a "helped" outcome and hides when a word is accepted after showing', () => {
    const { result } = renderHook(() => useMPStuckCoach(args()));
    act(() => {
      for (let i = 0; i < TAP_MIN; i++) result.current.markTap();
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
      result.current.markAccepted();
    });

    expect(result.current.visible).toBe(false);
    expect(outcomeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'tap-hint', outcome: 'helped' })
    );
  });

  it('fires a "dismissed" outcome on manual dismiss', () => {
    const { result } = renderHook(() => useMPStuckCoach(args()));
    act(() => {
      for (let i = 0; i < TAP_MIN; i++) result.current.markTap();
      vi.advanceTimersByTime(2000);
    });

    act(() => result.current.dismiss('manual'));

    expect(result.current.visible).toBe(false);
    expect(outcomeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'dismissed' })
    );
  });

  it('auto-hides with an "ignored" outcome after AUTO_HIDE_MS with no word', () => {
    const { result } = renderHook(() => useMPStuckCoach(args()));
    act(() => {
      for (let i = 0; i < TAP_MIN; i++) result.current.markTap();
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(AUTO_HIDE_MS + 1000);
    });

    expect(result.current.visible).toBe(false);
    expect(outcomeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'ignored' })
    );
  });

  it('never shows for veterans (one-shot, competent player)', () => {
    const { result } = renderHook(() =>
      useMPStuckCoach(args({ totalGamesPlayed: 5 }))
    );
    act(() => {
      for (let i = 0; i < TAP_MIN + 3; i++) result.current.markTap();
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.visible).toBe(false);
    expect(shownSpy).not.toHaveBeenCalled();
  });

  it('never re-arms after it has shown once in a game', () => {
    const { result } = renderHook(() => useMPStuckCoach(args()));
    // First trigger: tap-hint.
    act(() => {
      for (let i = 0; i < TAP_MIN; i++) result.current.markTap();
      vi.advanceTimersByTime(2000);
    });
    act(() => result.current.dismiss('manual'));
    shownSpy.mockClear();

    // Now produce a fruitless-fiddle pattern; coach must stay silent.
    act(() => {
      for (let i = 0; i < SUBMIT_MIN + 2; i++) result.current.markSubmit();
      vi.advanceTimersByTime(FRUITLESS_MS + 2000);
    });
    expect(result.current.visible).toBe(false);
    expect(shownSpy).not.toHaveBeenCalled();
  });

  it('stays silent on non-classic modes', () => {
    const { result } = renderHook(() =>
      useMPStuckCoach(args({ isClassic: false }))
    );
    act(() => {
      for (let i = 0; i < TAP_MIN + 2; i++) result.current.markTap();
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.visible).toBe(false);
  });

  // Perf guard: object feeds grid callback deps; must stay stable to hold the
  // grid's memo across timer-tick re-renders.
  it('returns a stable reference across renders when stage is unchanged', () => {
    const { result, rerender } = renderHook(() => useMPStuckCoach(args()));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
