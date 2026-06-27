/**
 * useGameStartTelemetry — fires trackGameStart on isGameActive rising edge.
 *
 * Why: PostHog 30d showed `growth:game_started` 56 vs `growth:game_completed`
 * 120 — multiplayer surfaces never emit `trackGameStart`, only `trackGameEnd`,
 * so funnels are blinded. This hook centralizes the rising-edge detection so
 * each MP view (host/player) just passes `isGameActive` + `mode`.
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackGameStart = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStart(...args),
}));

import { useGameStartTelemetry } from '../useGameStartTelemetry';

describe('useGameStartTelemetry', () => {
  beforeEach(() => trackGameStart.mockClear());

  it('does not fire while isGameActive=false', () => {
    renderHook(() => useGameStartTelemetry({ mode: 'multiplayer', isGameActive: false }));
    expect(trackGameStart).not.toHaveBeenCalled();
  });

  it('fires exactly once when isGameActive flips false → true', () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useGameStartTelemetry({ mode: 'multiplayer', isGameActive: active }),
      { initialProps: { active: false } },
    );
    expect(trackGameStart).not.toHaveBeenCalled();

    rerender({ active: true });
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('multiplayer', expect.any(Object));

    // Subsequent renders with active=true must not refire.
    rerender({ active: true });
    rerender({ active: true });
    expect(trackGameStart).toHaveBeenCalledTimes(1);
  });

  it('fires once on mount if isGameActive starts true (deep-link / re-entry)', () => {
    renderHook(() => useGameStartTelemetry({ mode: 'word-hunt', isGameActive: true }));
    expect(trackGameStart).toHaveBeenCalledTimes(1);
    expect(trackGameStart).toHaveBeenCalledWith('word-hunt', expect.any(Object));
  });

  it('does not refire after isGameActive cycles true → false → true within same mount', () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useGameStartTelemetry({ mode: 'blast', isGameActive: active }),
      { initialProps: { active: true } },
    );
    expect(trackGameStart).toHaveBeenCalledTimes(1);

    rerender({ active: false });
    rerender({ active: true });
    expect(trackGameStart).toHaveBeenCalledTimes(1);
  });

  it('passes extras through', () => {
    renderHook(() =>
      useGameStartTelemetry({
        mode: 'multiplayer',
        isGameActive: true,
        extras: { gameCode: 'ABC123', botCount: 0 },
      }),
    );
    expect(trackGameStart).toHaveBeenCalledWith(
      'multiplayer',
      expect.objectContaining({ gameCode: 'ABC123', botCount: 0 }),
    );
  });

  it('does not fire when mode is null/undefined (avoids polluting funnel with mode=null)', () => {
    renderHook(() =>
      useGameStartTelemetry({
        mode: undefined as unknown as string,
        isGameActive: true,
      }),
    );
    expect(trackGameStart).not.toHaveBeenCalled();
  });

  // ready-gate: MP rolls `random` server-side; the resolved mode + gameModeConfirmed
  // land atomically AFTER the game goes active. Gating on `ready` (=gameModeConfirmed)
  // makes game_started capture the RESOLVED mode, matching game_completed.
  describe('ready gate', () => {
    it('does not fire while active but not ready (resolved mode not yet confirmed)', () => {
      renderHook(() =>
        useGameStartTelemetry({ mode: 'random', isGameActive: true, ready: false }),
      );
      expect(trackGameStart).not.toHaveBeenCalled();
    });

    it('fires with the resolved mode once ready flips true (not the stale requested mode)', () => {
      const { rerender } = renderHook(
        ({ mode, ready }: { mode: string; ready: boolean }) =>
          useGameStartTelemetry({ mode, isGameActive: true, ready }),
        { initialProps: { mode: 'random', ready: false } },
      );
      expect(trackGameStart).not.toHaveBeenCalled();

      // Server confirms: resolved mode + ready arrive together.
      rerender({ mode: 'word-hunt', ready: true });
      expect(trackGameStart).toHaveBeenCalledTimes(1);
      expect(trackGameStart).toHaveBeenCalledWith('word-hunt', expect.any(Object));
    });

    it('defaults ready=true so non-MP callers are unaffected', () => {
      renderHook(() => useGameStartTelemetry({ mode: 'word-wheel', isGameActive: true }));
      expect(trackGameStart).toHaveBeenCalledTimes(1);
    });
  });
});
