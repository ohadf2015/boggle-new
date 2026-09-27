/**
 * `games_completed_count` — the localStorage counter three install/engagement
 * gates read from:
 *   - PWAInstallPrompt desktop banner (>= 2)
 *   - PWAInstallPrompt iOS Add-to-Home-Screen hint (>= 2)
 *   - EmailCaptureModal (>= 5)
 *
 * It had THREE readers and ZERO writers: the only incrementer was
 * `useTrackGameCompletion`, an exported-but-never-mounted hook listening for a
 * `window` 'game_completed' event that nothing dispatches. So the counter was
 * permanently '0' and every gate above was dead. Class-4 silent failure: a
 * no-op indistinguishable from "not engaged enough yet".
 *
 * Fix: increment inside `trackGameEnd` — the single funnel every mode
 * (singleplayer, multiplayer, daily, word-wheel, survival, connections,
 * word-craft, blast, adventure) already routes completion through.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    register: vi.fn(),
    register_once: vi.fn(),
    capture: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
    get_distinct_id: () => 'test-distinct-id',
    __loaded: true,
  },
}));

vi.mock('@/utils/posthogEngagement', () => ({
  setPostHogUserProps: vi.fn(),
  setPostHogUserPropsOnce: vi.fn(),
  setPostHogSuperProps: vi.fn(),
  setPostHogSuperPropsOnce: vi.fn(),
  incrementPostHogUserProp: vi.fn(),
  trackRageQuit: vi.fn(),
  trackSessionDepth: vi.fn(),
}));

vi.mock('@/components/GoogleAnalytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { trackGameEnd, trackGameStart } from '../growthTracking';

const KEY = 'games_completed_count';

const read = () => window.localStorage.getItem(KEY);

beforeEach(() => {
  window.localStorage.clear();
});

describe('trackGameEnd — games_completed_count', () => {
  it('increments from absent to 1 on a completed game', () => {
    trackGameEnd('singleplayer', 100, 5, true);
    expect(read()).toBe('1');
  });

  it('accumulates across completed games', () => {
    trackGameEnd('daily-challenge', 10, 1, true);
    trackGameEnd('word-wheel', 20, 2, true);
    trackGameEnd('blast', 30, 3, true);
    expect(read()).toBe('3');
  });

  it('does NOT increment on an abandoned game', () => {
    trackGameEnd('singleplayer', 0, 0, false);
    expect(read()).toBeNull();
  });

  it('leaves an existing count untouched when a game is abandoned', () => {
    trackGameEnd('connections', 40, 4, true);
    trackGameEnd('connections', 0, 0, false);
    expect(read()).toBe('1');
  });

  it('builds on a pre-existing stored count', () => {
    window.localStorage.setItem(KEY, '7');
    trackGameEnd('adventure', 50, 6, true);
    expect(read()).toBe('8');
  });

  it('treats a corrupt stored value as zero rather than producing NaN', () => {
    window.localStorage.setItem(KEY, 'not-a-number');
    trackGameEnd('word-craft', 10, 1, true);
    expect(read()).toBe('1');
  });

  it('reaches the PWA/iOS install-hint threshold after 2 completed games', () => {
    // A game is a START and an END. This used to call trackGameEnd twice with no
    // start between, which no code path produces: both singleplayer start
    // emitters are mount-only effects (`SinglePlayerGame.tsx:70`,
    // `useSinglePlayerEffects.ts:92`, both `[]` deps, commented "remount = new
    // game"). trackGameEnd now ignores a second end for the same mode without an
    // intervening start, because word-craft was reporting 24.2 completions per
    // session against 4.86 starts and inflating this very counter.
    trackGameStart('singleplayer', {});
    trackGameEnd('singleplayer', 10, 1, true);
    trackGameStart('singleplayer', {});
    trackGameEnd('singleplayer', 10, 1, true);
    expect(parseInt(read() ?? '0', 10)).toBeGreaterThanOrEqual(2);
  });

  it('does NOT count a mode that reports the same finished game twice', () => {
    // The guard this counter depends on. One start, two ends -> one game.
    trackGameStart('word-craft', {});
    trackGameEnd('word-craft', 10, 1, true);
    trackGameEnd('word-craft', 10, 1, true);
    expect(read()).toBe('1');
  });
});
