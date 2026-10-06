// @vitest-environment jsdom
/**
 * Ordered funnels (PostHog + Growth Radar) need first_game_played BEFORE
 * game_completed on the same tick. trackGameEnd used to emit game_completed
 * first, then markFirstGameActivation — so 23/24 dual-event users inverted
 * (~ -0.03s) and the funnel read as a fake 94% drop.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  __esModule: true,
  default: {
    capture,
    identify: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
    get_distinct_id: () => 'test-distinct-id',
    __loaded: true,
  },
}));

vi.mock('@/utils/ga4', () => ({ trackGA4Event: vi.fn() }));

vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/utils/authFetch', () => ({
  postWithAuth: vi.fn(() => Promise.resolve({ ok: true, status: 200 })),
}));

vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({}) })));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  if (typeof window !== 'undefined') {
    try { window.localStorage.clear(); } catch { /* noop */ }
  }
});

function eventNames(): string[] {
  return capture.mock.calls.map((c) => c[0] as string);
}

function firstIndex(names: string[], needles: string[]): number {
  return names.findIndex((n) => needles.includes(n));
}

function lastIndex(names: string[], needles: string[]): number {
  let last = -1;
  names.forEach((n, i) => {
    if (needles.includes(n)) last = i;
  });
  return last;
}

const FIRST_PLAYED = ['first_game_played', 'growth:first_game_played'];
const COMPLETED = ['game_completed', 'growth:game_completed'];

describe('trackGameEnd — first_game_played before game_completed', () => {
  it('emits first_game_played before game_completed on a fresh device, then only game_completed on the next game', async () => {
    const { trackGameStart, trackGameEnd } = await import('../growthTracking');

    trackGameStart('singleplayer');
    capture.mockClear();
    trackGameEnd('singleplayer', 100, 5, true, 60);

    const firstCall = eventNames();
    const lastPlayed = lastIndex(firstCall, FIRST_PLAYED);
    const firstCompleted = firstIndex(firstCall, COMPLETED);
    expect(lastPlayed).toBeGreaterThanOrEqual(0);
    expect(firstCompleted).toBeGreaterThanOrEqual(0);
    expect(lastPlayed).toBeLessThan(firstCompleted);

    trackGameStart('singleplayer');
    capture.mockClear();
    trackGameEnd('singleplayer', 80, 4, true, 50);

    const secondCall = eventNames();
    expect(firstIndex(secondCall, COMPLETED)).toBeGreaterThanOrEqual(0);
    expect(secondCall).not.toContain('first_game_played');
    expect(secondCall).not.toContain('growth:first_game_played');
  });
});
