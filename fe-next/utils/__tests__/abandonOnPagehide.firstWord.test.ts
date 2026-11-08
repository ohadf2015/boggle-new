/**
 * `first_word_sec` + `score` on the abandon payload — lets the admin game log
 * tell "left before finding anything" from "played a while, then left".
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
  updateActiveGameExtras,
  activeGameTiming,
  __resetAbandonStateForTests,
} from '../abandonOnPagehide';

const payload = () =>
  captureMock.mock.calls.find((c) => c[0] === 'growth:game_abandoned')?.[1] as Record<string, unknown> | undefined;

describe('abandon payload: first word + score', () => {
  let uninstall: () => void;

  beforeEach(() => {
    captureMock.mockClear();
    __resetAbandonStateForTests();
    uninstall = installAbandonOnPagehide();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T10:00:00Z'));
  });

  afterEach(() => {
    uninstall();
    vi.useRealTimers();
  });

  it('stamps seconds to the first word and the running score', () => {
    markGameActive('singleplayer');
    vi.setSystemTime(new Date('2026-11-08T10:00:07Z'));
    updateActiveGameExtras({ words_found: 1, score: 3 });
    vi.setSystemTime(new Date('2026-11-08T10:00:20Z'));
    updateActiveGameExtras({ words_found: 2, score: 8 });
    vi.setSystemTime(new Date('2026-11-08T10:00:30Z'));

    window.dispatchEvent(new Event('pagehide'));

    expect(payload()).toMatchObject({ first_word_sec: 7, words_found: 2, score: 8, durationSec: 30 });
  });

  it('omits first_word_sec when no word was found', () => {
    markGameActive('singleplayer');
    updateActiveGameExtras({ words_found: 0 });
    vi.setSystemTime(new Date('2026-11-08T10:00:03Z'));

    window.dispatchEvent(new Event('pagehide'));

    expect(payload()).toBeDefined();
    expect(payload()).not.toHaveProperty('first_word_sec');
  });

  it('a word found before the deferred start counts as second 0', () => {
    updateActiveGameExtras({ words_found: 1 });
    markGameActive('singleplayer');
    expect(activeGameTiming()).toEqual({ first_word_sec: 0 });
  });

  it('activeGameTiming is empty with no running game', () => {
    expect(activeGameTiming()).toEqual({});
  });
});
