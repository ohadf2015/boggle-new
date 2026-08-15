import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const trackGameEnd = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameEnd: (...args: unknown[]) => trackGameEnd(...args),
}));

import { useGameEndTelemetry } from '../useGameEndTelemetry';

describe('useGameEndTelemetry', () => {
  beforeEach(() => { trackGameEnd.mockClear(); });

  it('does not fire while results are not yet shown', () => {
    renderHook(() => useGameEndTelemetry({
      mode: 'blast', resultsShown: false, score: 100, wordCount: 5,
    }));
    expect(trackGameEnd).not.toHaveBeenCalled();
  });

  it('fires trackGameEnd once on the rising edge of resultsShown with mode + extras', () => {
    const { rerender } = renderHook(
      ({ shown }: { shown: boolean }) => useGameEndTelemetry({
        mode: 'blast', resultsShown: shown, score: 250, wordCount: 9,
        durationSec: 90, extras: { isMultiplayer: true, gameMode: 'blast', playerCount: 3 },
      }),
      { initialProps: { shown: false } },
    );
    rerender({ shown: true });
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    const [mode, score, wordCount, completed, durationSec, extras] = trackGameEnd.mock.calls[0];
    expect(mode).toBe('blast');
    expect(score).toBe(250);
    expect(wordCount).toBe(9);
    expect(completed).toBe(true);
    expect(durationSec).toBe(90);
    expect(extras).toMatchObject({ isMultiplayer: true, gameMode: 'blast', playerCount: 3 });
  });

  it('does not double-fire if resultsShown stays true across re-renders', () => {
    const { rerender } = renderHook(
      ({ s }: { s: number }) => useGameEndTelemetry({
        mode: 'classic', resultsShown: true, score: s, wordCount: 1,
      }),
      { initialProps: { s: 10 } },
    );
    rerender({ s: 20 });
    rerender({ s: 30 });
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
  });

  it('skips emit when mode is null/undefined (never pollute funnel with mode=null)', () => {
    const { rerender } = renderHook(
      ({ shown }: { shown: boolean }) => useGameEndTelemetry({
        mode: null, resultsShown: shown, score: 0, wordCount: 0,
      }),
      { initialProps: { shown: false } },
    );
    rerender({ shown: true });
    expect(trackGameEnd).not.toHaveBeenCalled();
  });
});

/**
 * Symmetry with useGameStartTelemetry (Class 3 — asymmetric paths).
 *
 * MP rolls `random` server-side, so the resolved mode and `gameModeConfirmed`
 * arrive AFTER the game goes active. The START hook already gates on
 * `ready: gameModeConfirmed` to avoid capturing the unresolved mode — but the
 * END hook had no such gate, so it emitted `game_completed` with mode='random'
 * while no `game_started` for 'random' ever existed. PostHog 30d: random showed
 * **0 starts against 8 completions**. Both ends must gate on the same signal or
 * they will keep drifting.
 */
describe('useGameEndTelemetry — ready gate mirrors the start hook', () => {
  it('does NOT emit while the mode is still unresolved', () => {
    renderHook(() =>
      useGameEndTelemetry({ mode: 'random', resultsShown: true, score: 10, wordCount: 2, ready: false }),
    );
    expect(trackGameEnd).not.toHaveBeenCalled();
  });

  it('emits once the mode is confirmed, with the resolved mode', () => {
    const { rerender } = renderHook(
      ({ mode, ready }) => useGameEndTelemetry({ mode, resultsShown: true, score: 10, wordCount: 2, ready }),
      { initialProps: { mode: 'random', ready: false } },
    );
    expect(trackGameEnd).not.toHaveBeenCalled();

    rerender({ mode: 'blast', ready: true });

    expect(trackGameEnd).toHaveBeenCalledTimes(1);
    expect(trackGameEnd.mock.calls[0][0]).toBe('blast');
  });

  it('defaults to ready so non-MP callers are unaffected', () => {
    renderHook(() =>
      useGameEndTelemetry({ mode: 'classic', resultsShown: true, score: 5, wordCount: 1 }),
    );
    expect(trackGameEnd).toHaveBeenCalledTimes(1);
  });
});
