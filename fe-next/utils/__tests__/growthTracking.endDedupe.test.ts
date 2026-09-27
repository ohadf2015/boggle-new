// @vitest-environment jsdom
/**
 * `game_completed` must not out-count `game_started`.
 *
 * Production, 90d, $host-filtered:
 *   brain-drill  79 starts / 123 completions = 6.47 completions per session vs 3.95 starts
 *   word-craft   34 starts / 121 completions = 24.2 completions per session vs 4.86 starts
 *
 * Neither is a missing start — both modes do call `trackGameStart`. They emit the
 * END more than once per game: `useSaveDrillResult` fires `emitBrainDrillGameEnd`
 * on every call with no client-side guard, and word-craft's `gameEndTrackedRef`
 * is per component instance, so a remount re-arms it.
 *
 * Guarding each caller would leave the next mode to rediscover this, so the
 * dedupe lives at the shared chokepoint: one end per start.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => capture(...args),
    get_distinct_id: () => 'test-distinct-id',
    people: { set: vi.fn(), set_once: vi.fn() },
    setPersonProperties: vi.fn(),
    identify: vi.fn(),
    __loaded: true,
  },
}));
// Network sinks — irrelevant to the dedupe contract, and a real fetch would
// make this test depend on the analytics API being up.
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })));

// `game_completed` is dual-emitted under both `growth:game_completed` and the
// bare name (CANONICAL_DUAL_EMIT). Count the prefixed form only — it is the one
// every mode emits, and the one the triage queries above were built on.
const endEvents = (mode: string) =>
  capture.mock.calls.filter(
    ([name, props]: [string, Record<string, unknown> | undefined]) =>
      name === 'growth:game_completed' && props?.gameMode === mode
  );

describe('trackGameEnd — one end per start', () => {
  beforeEach(() => {
    vi.resetModules();
    capture.mockClear();
  });

  it('emits a single completion when a mode reports the same game twice', async () => {
    const { trackGameStart, trackGameEnd } = await import(
      '../growthTracking'
    );

    // Given one started game
    trackGameStart('word-craft', {});
    // When the end is reported twice for that same game (remount / retry)
    trackGameEnd('word-craft', 42, 7, true, 60);
    trackGameEnd('word-craft', 42, 7, true, 60);

    // Then it is counted once
    expect(endEvents('word-craft')).toHaveLength(1);
  });

  it('counts each genuinely new game, so back-to-back drills both land', async () => {
    const { trackGameStart, trackGameEnd } = await import(
      '../growthTracking'
    );

    // A drill session legitimately plays several drills in a row — 3.95 starts
    // per session in production. Dedupe must not collapse those.
    trackGameStart('brain-drill', {});
    trackGameEnd('brain-drill', 10, 3, true, 30);
    trackGameStart('brain-drill', {});
    trackGameEnd('brain-drill', 20, 5, true, 30);
    trackGameStart('brain-drill', {});
    trackGameEnd('brain-drill', 30, 8, true, 30);

    expect(endEvents('brain-drill')).toHaveLength(3);
  });

  it('still reports a mode that never called trackGameStart', async () => {
    const { trackGameEnd } = await import('../growthTracking');

    // Silencing an un-started mode would trade a double-count for a missing
    // count — the worse of the two failures, and invisible. First end still emits.
    trackGameEnd('legacy-mode-without-start', 5, 1, true, 20);

    expect(endEvents('legacy-mode-without-start')).toHaveLength(1);
  });

  it('counts distinct modes ending in a row — the guard is per mode, not global', async () => {
    // A single global flag ate the 2nd and 3rd of these, which
    // `growthTracking.pushPromptGamesPlayed.test.ts` caught: an undercount is a
    // worse failure than the double-count this dedupe exists to stop, because it
    // is invisible.
    const { trackGameEnd } = await import('../growthTracking');
    trackGameEnd('daily-challenge', 0, 1, true);
    trackGameEnd('word-wheel', 0, 2, true);
    trackGameEnd('blast', 0, 3, true);
    expect(endEvents('daily-challenge')).toHaveLength(1);
    expect(endEvents('word-wheel')).toHaveLength(1);
    expect(endEvents('blast')).toHaveLength(1);
  });
});
