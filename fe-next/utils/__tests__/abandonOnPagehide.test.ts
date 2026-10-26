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
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    captureBeacon: (...args: unknown[]) => captureMock(...args),
  },
}));

import {
  installAbandonOnPagehide,
  markGameActive,
  markGameInactive,
  emitAbandonOnSpaNavigate,
  emitAbandonOnExit,
  consumeResumedAfterHidden,
  updateActiveGameExtras,
  __resetAbandonStateForTests,
  setPagehideFinalizer,
  clearPagehideFinalizer,
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

  it('includes durationSec, words_found, sp_mode and landing_path on singleplayer abandon', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('singleplayer', {
      sp_mode: 'solo-bots',
      words_found: 0,
      landing_path: '/es/singleplayer',
    });
    updateActiveGameExtras({ words_found: 3, floors: 2 });
    vi.setSystemTime(new Date('2026-01-01T00:00:39Z'));

    fireEvent('pagehide');

    const payload = captureMock.mock.calls.find((c) => c[0] === 'growth:game_abandoned')?.[1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      mode: 'singleplayer',
      durationSec: 39,
      reason: 'pagehide',
      words_found: 3,
      floors: 2,
      sp_mode: 'solo-bots',
      landing_path: '/es/singleplayer',
    });
    vi.useRealTimers();
  });

  it('applies words found before the game was marked active', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    // Mount effect runs before afterLoadIdle trackGameStart. Those words must
    // survive the start payload's words_found: 0.
    updateActiveGameExtras({ words_found: 2, sp_mode: 'solo-bots' });
    markGameActive('singleplayer', { words_found: 0, sp_mode: 'solo-bots' });
    vi.setSystemTime(new Date('2026-01-01T00:00:31Z'));

    fireEvent('pagehide');

    const payload = captureMock.mock.calls.find((c) => c[0] === 'growth:game_abandoned')?.[1] as Record<string, unknown>;
    expect(payload.words_found).toBe(2);
    expect(payload.durationSec).toBe(31);
    vi.useRealTimers();
  });

  it('does not leak a queued word count into the next game', () => {
    updateActiveGameExtras({ words_found: 4 });
    markGameInactive();
    markGameActive('singleplayer', { words_found: 0 });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    // re-mark so duration is measurable; inactive cleared the queue.
    markGameInactive();
    markGameActive('singleplayer', { words_found: 0 });
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));
    fireEvent('pagehide');

    const payload = captureMock.mock.calls.find((c) => c[0] === 'growth:game_abandoned')?.[1] as Record<string, unknown>;
    expect(payload.words_found).toBe(0);
    vi.useRealTimers();
  });

  it('forwards coach_step on a challenge abandon', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('singleplayer', {
      sp_mode: 'challenge',
      words_found: 0,
      landing_path: '/en/singleplayer?autoStart=coach',
    });
    updateActiveGameExtras({ coach_step: 'trace', words_found: 0 });
    vi.setSystemTime(new Date('2026-01-01T00:00:08Z'));

    fireEvent('pagehide');

    const payload = captureMock.mock.calls.find((c) => c[0] === 'growth:game_abandoned')?.[1] as Record<string, unknown>;
    expect(payload.coach_step).toBe('trace');
    expect(payload.sp_mode).toBe('challenge');
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

  it('runs the pagehide finalizer first; a finalizer that ends the game suppresses the abandon', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('word-tower');
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    const finalizer = vi.fn(() => markGameInactive());
    setPagehideFinalizer(finalizer);

    fireEvent('pagehide');

    expect(finalizer).toHaveBeenCalledTimes(1);
    expect(captureMock.mock.calls.map((c) => c[0])).not.toContain('growth:game_abandoned');
    vi.useRealTimers();
  });

  it('a finalizer that does not end the game (or throws) leaves the abandon in place', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('word-tower');
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    setPagehideFinalizer(() => {
      throw new Error('boom');
    });

    fireEvent('pagehide');

    expect(captureMock.mock.calls.map((c) => c[0])).toContain('growth:game_abandoned');
    vi.useRealTimers();
  });

  it('clearPagehideFinalizer only clears the finalizer it was given', () => {
    const mine = vi.fn();
    const theirs = vi.fn();
    setPagehideFinalizer(theirs);
    clearPagehideFinalizer(mine);
    fireEvent('pagehide');
    expect(theirs).toHaveBeenCalledTimes(1);
    clearPagehideFinalizer(theirs);
    fireEvent('pagehide');
    expect(theirs).toHaveBeenCalledTimes(1);
  });

  /**
   * iOS Safari often never fires pagehide when the tab is backgrounded or
   * killed — visibilitychange -> hidden is the last reliable signal. Mobile
   * non-MP starts were losing their outcome at ~5x the desktop rate because
   * only pagehide was listened for (UR audit 2026-10-26, t_19aaab43).
   */
  describe('visibilitychange -> hidden abandon (iOS path)', () => {
    function fireHidden() {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }
    function fireVisible() {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }

    it('emits growth:game_abandoned with reason hidden when the tab is backgrounded mid-game', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('singleplayer', { sp_mode: 'practice' });
      vi.setSystemTime(new Date('2026-01-01T00:00:20Z'));

      fireHidden();

      const calls = captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned');
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toMatchObject({ mode: 'singleplayer', reason: 'hidden', durationSec: 20 });
      vi.useRealTimers();
    });

    it('emits only once when hidden is followed by pagehide', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('daily');
      vi.setSystemTime(new Date('2026-01-01T00:00:20Z'));

      fireHidden();
      fireEvent('pagehide');

      const calls = captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned');
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toMatchObject({ reason: 'hidden' });
      vi.useRealTimers();
    });

    it('does not emit on visibilitychange to visible', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('singleplayer');
      vi.setSystemTime(new Date('2026-01-01T00:00:20Z'));

      fireVisible();

      expect(captureMock).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('arms the resume flag so a later completion can be marked resumed_after_hidden', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('singleplayer');
      vi.setSystemTime(new Date('2026-01-01T00:00:20Z'));

      expect(consumeResumedAfterHidden()).toBe(false);
      fireHidden();

      expect(consumeResumedAfterHidden()).toBe(true);
      // Read-and-clear: a second consume does not leak into the next game.
      expect(consumeResumedAfterHidden()).toBe(false);
      vi.useRealTimers();
    });

    it('a new game resets the resume flag', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('singleplayer');
      vi.setSystemTime(new Date('2026-01-01T00:00:20Z'));
      fireHidden();

      markGameActive('singleplayer');

      expect(consumeResumedAfterHidden()).toBe(false);
      vi.useRealTimers();
    });
  });

  /**
   * Word Tower V2 fires growth:wt2_exit when the player leaves a screen, but
   * the exit never mapped to a terminal growth event — mobile WT2 had 1 of 18
   * starts with any outcome (UR audit 2026-10-26). emitAbandonOnExit closes
   * the loop for unfinished runs.
   */
  describe('emitAbandonOnExit (wt2_exit path)', () => {
    it('emits growth:game_abandoned with reason exit for an unfinished run', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('word-tower', { words_found: 4 });
      updateActiveGameExtras({ floors: 2 });
      vi.setSystemTime(new Date('2026-01-01T00:00:45Z'));

      emitAbandonOnExit();
      await vi.advanceTimersByTimeAsync(50);

      const calls = captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned');
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toMatchObject({ mode: 'word-tower', reason: 'exit', words_found: 4, floors: 2 });
      vi.useRealTimers();
    });

    it('a same-tick completion cancels the exit abandon (run -> results)', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      markGameActive('word-tower');
      vi.setSystemTime(new Date('2026-01-01T00:00:45Z'));

      emitAbandonOnExit();
      markGameInactive(); // results screen ended the round in the same commit
      await vi.advanceTimersByTimeAsync(50);

      expect(captureMock.mock.calls.filter((c) => c[0] === 'growth:game_abandoned')).toHaveLength(0);
      vi.useRealTimers();
    });

    it('does not emit when no game is active (exit from home/results screens)', async () => {
      vi.useFakeTimers();
      emitAbandonOnExit();
      await vi.advanceTimersByTimeAsync(50);

      expect(captureMock).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
