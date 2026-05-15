/**
 * Pagehide + visibilitychange-driven `game_abandoned` emit.
 *
 * Currently no caller passes `completed: false` to `trackGameEnd`, so the
 * "Game Abandoned" PostHog goal sees zero conversions. This module emits
 * abandon when the user navigates away mid-game so churn becomes measurable.
 *
 * Capacitor webviews and modern browsers pause on `visibilitychange` not
 * `pagehide`, so both events are wired. `sendBeacon` transport ensures the
 * capture survives unload.
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

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });
  document.dispatchEvent(new Event('visibilitychange'));
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

  it('emits canonical game_abandoned on pagehide when a game is active', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('singleplayer');
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));

    fireEvent('pagehide');

    const eventNames = captureMock.mock.calls.map((c) => c[0] as string);
    expect(eventNames).toContain('game_abandoned');
    expect(eventNames).not.toContain('growth:game_abandoned');
    const payload = captureMock.mock.calls.find((c) => c[0] === 'game_abandoned')?.[1];
    expect((payload as { mode?: string; reason?: string })?.mode).toBe('singleplayer');
    expect((payload as { reason?: string })?.reason).toBe('pagehide');
    vi.useRealTimers();
  });

  it('emits canonical game_abandoned on visibilitychange when document hidden', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('classic');
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));

    setHidden(true);

    const eventNames = captureMock.mock.calls.map((c) => c[0] as string);
    expect(eventNames).toContain('game_abandoned');
    const payload = captureMock.mock.calls.find((c) => c[0] === 'game_abandoned')?.[1];
    expect((payload as { reason?: string })?.reason).toBe('visibilitychange');
    vi.useRealTimers();
  });

  it('does not emit on visibilitychange when document becomes visible again', () => {
    markGameActive('classic');
    setHidden(false);
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('uses sendBeacon transport for reliable unload delivery', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('classic');
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));

    fireEvent('pagehide');

    const call = captureMock.mock.calls.find((c) => c[0] === 'game_abandoned');
    expect(call?.[2]).toMatchObject({ transport: 'sendBeacon' });
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

  it('does not double-emit if pagehide and visibilitychange both fire', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    markGameActive('multiplayer');
    vi.setSystemTime(new Date('2026-01-01T00:00:10Z'));

    fireEvent('pagehide');
    setHidden(true);

    const abandonCalls = captureMock.mock.calls.filter((c) => c[0] === 'game_abandoned');
    expect(abandonCalls).toHaveLength(1);
    vi.useRealTimers();
  });

  it('skips abandon if active game lasted < 5s (rapid tab-switch is not engagement)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    markGameActive('blast');
    vi.setSystemTime(new Date('2026-01-01T00:00:04Z')); // 4s later

    fireEvent('pagehide');

    expect(captureMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
