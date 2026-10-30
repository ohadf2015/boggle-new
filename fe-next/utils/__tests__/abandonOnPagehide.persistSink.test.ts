/**
 * The abandon emit used to reach PostHog only. PostHog is consent-gated, so for
 * most players a mid-game exit left no trace in analytics_events (3 rows in 30d
 * against PostHog's 320 from its opted-in slice). A registered persist sink gets
 * every abandon too, so the first-party table sees quits.
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
  setAbandonPersistSink,
  __resetAbandonStateForTests,
} from '../abandonOnPagehide';

describe('abandonOnPagehide persist sink', () => {
  let uninstall: () => void;
  const sink = vi.fn();

  beforeEach(() => {
    captureMock.mockClear();
    sink.mockClear();
    __resetAbandonStateForTests();
    setAbandonPersistSink(sink);
    uninstall = installAbandonOnPagehide();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    uninstall();
    setAbandonPersistSink(null);
    vi.useRealTimers();
  });

  it('hands a pagehide abandon to the sink with the same payload PostHog gets', () => {
    markGameActive('classic', { words_found: 3 });
    vi.setSystemTime(new Date('2026-01-01T00:00:20Z'));

    window.dispatchEvent(new Event('pagehide'));

    expect(sink).toHaveBeenCalledTimes(1);
    const [event, payload] = sink.mock.calls[0];
    expect(event).toBe('game_abandoned');
    expect(payload).toMatchObject({ mode: 'classic', gameMode: 'classic', durationSec: 20, reason: 'pagehide', words_found: 3 });
    const posthogPayload = captureMock.mock.calls.find((c) => c[0] === 'growth:game_abandoned')?.[1];
    expect(posthogPayload).toEqual(payload);
  });

  it('stamps the MP room code on an MP leave so the admin log files it under its room', async () => {
    markGameActive('word-hunt', { gameCode: 'SE4SFB', isMultiplayer: true });
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));

    emitAbandonOnSpaNavigate();
    await vi.advanceTimersByTimeAsync(5);

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][1]).toMatchObject({ reason: 'spa_navigate', gameCode: 'SE4SFB', isMultiplayer: true });
  });

  it('leaves gameCode and isMultiplayer off a solo leave', async () => {
    markGameActive('classic', {});
    vi.setSystemTime(new Date('2026-01-01T00:00:05Z'));

    emitAbandonOnSpaNavigate();
    await vi.advanceTimersByTimeAsync(5);

    const payload = sink.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('gameCode');
    expect(payload).not.toHaveProperty('isMultiplayer');
  });

  it('hands SPA-navigation and exit abandons to the sink', async () => {
    markGameActive('blast');
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));
    emitAbandonOnSpaNavigate();
    await vi.advanceTimersByTimeAsync(5);
    expect(sink.mock.calls.map((c) => (c[1] as { reason: string }).reason)).toEqual(['spa_navigate']);

    __resetAbandonStateForTests();
    setAbandonPersistSink(sink);
    markGameActive('word-tower-v2');
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    emitAbandonOnExit();
    await vi.advanceTimersByTimeAsync(5);
    expect(sink.mock.calls.map((c) => (c[1] as { reason: string }).reason)).toEqual(['spa_navigate', 'exit']);
  });

  it('does not call the sink for a completed game', async () => {
    markGameActive('classic');
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));
    emitAbandonOnSpaNavigate();
    markGameInactive();
    await vi.advanceTimersByTimeAsync(5);

    expect(sink).not.toHaveBeenCalled();
  });

  it('keeps emitting to PostHog when the sink throws', () => {
    sink.mockImplementation(() => { throw new Error('beacon refused'); });
    markGameActive('classic');
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));

    window.dispatchEvent(new Event('pagehide'));

    expect(captureMock.mock.calls.some((c) => c[0] === 'growth:game_abandoned')).toBe(true);
  });
});
