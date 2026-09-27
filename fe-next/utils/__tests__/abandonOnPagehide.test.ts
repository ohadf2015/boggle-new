/**
 * Pagehide-driven `growth:game_abandoned` emit.
 *
 * Currently no caller passes `completed: false` to `trackGameEnd`, so the
 * "Game Abandoned" PostHog goal sees zero conversions. This module emits
 * abandon when the user navigates away mid-game so churn becomes measurable.
 */

import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

import {
  installAbandonOnPagehide,
  markGameActive,
  markGameInactive,
  emitAbandonOnSpaNavigate,
  __resetAbandonStateForTests,
} from '../abandonOnPagehide';

function fireEvent(name: string) {
  window.dispatchEvent(new Event(name));
}

describe('abandonOnPagehide', () => {
  let uninstall: () => void;

  beforeEach(() => {
    captureMock.mockClear();
    __resetAbandonStateForTests();
    uninstall = installAbandonOnPagehide();
  });

  afterEach(() => {
    uninstall();
  });

  it('emits growth:game_abandoned on pagehide when a game is active', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('singleplayer');
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));

    fireEvent('pagehide');

    const eventNames = captureMock.mock.calls.map((c) => c[0] as string);
    expect(eventNames).toContain('growth:game_abandoned');
    const payload = captureMock.mock.calls.find((c) => c[0] === 'growth:game_abandoned')?.[1];
    expect((payload as { mode?: string })?.mode).toBe('singleplayer');
    vi.useRealTimers();
  });

  it('does not emit when no game is active', () => {
    fireEvent('pagehide');

    expect(captureMock).not.toHaveBeenCalled();
  });

  it('does not emit after markGameInactive', () => {
    markGameActive('daily');
    markGameInactive();

    fireEvent('pagehide');

    expect(captureMock).not.toHaveBeenCalled();
  });

  it('does not double-emit if pagehide fires twice', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('multiplayer');
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));

    fireEvent('pagehide');
    fireEvent('pagehide');

    const abandonCalls = captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned');
    expect(abandonCalls).toHaveLength(1);
    vi.useRealTimers();
  });

  it('skips abandon if the active game lasted < 2s (treats as misclick, not engagement)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    markGameActive('blast');
    vi.setSystemTime(new Date('2026-01-01T00:00:01Z')); // 1s later

    fireEvent('pagehide');

    expect(captureMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  /**
   * Regression: a round that ended NORMALLY was being logged as abandoned.
   *
   * React runs a component's cleanup BEFORE the effects of the same commit, so
   * when the round ends and the in-game view unmounts, `emitAbandonOnSpaNavigate`
   * ran while `markGameInactive()` (called from the end-of-game effect) was still
   * one tick away. The `active` guard had not been cleared yet, so a completed
   * game emitted `growth:game_abandoned`.
   *
   * Production (30d, lexiclash.live): 1,218 of these, clustered at the exact
   * round length — 302 of classic's 515 landed in the 90-99s bucket against a
   * 90s round, and NOT ONE had a `game_completed` within 15s. It made classic,
   * word-hunt, blast and wheel-rush look like they were abandoned two thirds of
   * the time while word-wheel and survival — which never call this hook — sat at
   * ~65% completion. Same asymmetric-path class as Class 3 in the pitfalls rules.
   */
  describe('spa_navigate abandon vs a game that just completed', () => {
    it('does NOT emit when markGameInactive lands in the same commit', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('classic');
      vi.setSystemTime(new Date('2026-01-01T00:01:30Z')); // full 90s round

      emitAbandonOnSpaNavigate(); // cleanup runs first...
      markGameInactive();         // ...then the end-of-game effect

      await vi.advanceTimersByTimeAsync(50);

      expect(captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned')).toHaveLength(0);
      vi.useRealTimers();
    });

    it('still emits for a genuine mid-round navigation away', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('classic');
      vi.setSystemTime(new Date('2026-01-01T00:00:30Z')); // bailed at 30s

      emitAbandonOnSpaNavigate();
      await vi.advanceTimersByTimeAsync(50);

      const calls = captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned');
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toMatchObject({ reason: 'spa_navigate', mode: 'classic', durationSec: 30 });
      vi.useRealTimers();
    });
  });
});
