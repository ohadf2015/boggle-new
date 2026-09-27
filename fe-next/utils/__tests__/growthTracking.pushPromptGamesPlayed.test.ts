/**
 * `lexiclash_games_played` — the counter `shouldShowPushPrompt` gates on
 * (MIN_GAMES_BEFORE_PROMPT=3). Its only incrementer was `coinManager.addCoins`,
 * so the push prompt's "games played" was really "coin-earning events" — a
 * game that completes without awarding coins never counts. Lane-12 flagged
 * `push_prompt_shown` CRATERED 20→3 (7d) two nights running (2026-07-29/30);
 * this is the likely root cause.
 *
 * Fix: increment inside `trackGameEnd` — the single funnel every mode already
 * routes completion through (mirrors the `games_completed_count` fix).
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

import { trackGameEnd } from '../growthTracking';

const KEY = 'lexiclash_games_played';

const read = () => window.localStorage.getItem(KEY);

beforeEach(() => {
  window.localStorage.clear();
});

describe('trackGameEnd — lexiclash_games_played (push prompt gate)', () => {
  it('increments from absent to 1 on a completed game', () => {
    trackGameEnd('singleplayer', 100, 5, true);
    expect(read()).toBe('1');
  });

  it('does NOT increment on an abandoned game', () => {
    trackGameEnd('singleplayer', 0, 0, false);
    expect(read()).toBeNull();
  });

  it('reaches MIN_GAMES_BEFORE_PROMPT=3 after 3 completed games with zero coin awards', () => {
    trackGameEnd('daily-challenge', 0, 1, true);
    trackGameEnd('word-wheel', 0, 2, true);
    trackGameEnd('blast', 0, 3, true);
    expect(parseInt(read() ?? '0', 10)).toBeGreaterThanOrEqual(3);
  });

  it('builds on a pre-existing stored count', () => {
    window.localStorage.setItem(KEY, '2');
    trackGameEnd('adventure', 50, 6, true);
    expect(read()).toBe('3');
  });
});
