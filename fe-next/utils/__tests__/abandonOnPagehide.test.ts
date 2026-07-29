/**
 * Pagehide-driven `growth:game_abandoned` emit.
 *
 * Currently no caller passes `completed: false` to `trackGameEnd`, so the
 * "Game Abandoned" PostHog goal sees zero conversions. This module emits
 * abandon when the user navigates away mid-game so churn becomes measurable.
 */

import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

import {
  installAbandonOnPagehide,
  markGameActive,
  markGameInactive,
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
});
