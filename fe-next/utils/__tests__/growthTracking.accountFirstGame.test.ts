/**
 * account_first_game — once per fresh account, on the first completed game,
 * both experiment arms (t_3b095edf). Not game_started.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    register: vi.fn(),
    register_once: vi.fn(),
    capture: (...args: unknown[]) => captureMock(...args),
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
import { ACCOUNT_FIRST_GAME_DONE_KEY, ACCOUNT_FIRST_GAME_PENDING_KEY } from '@/lib/retention/signupFirstGame';

function installStorage() {
  const local = new Map<string, string>();
  const box = {
    getItem: (key: string) => local.get(key) ?? null,
    setItem: (key: string, value: string) => { local.set(key, value); },
    removeItem: (key: string) => { local.delete(key); },
    clear: () => { local.clear(); },
    key: (index: number) => [...local.keys()][index] ?? null,
    get length() { return local.size; },
  };
  const g = globalThis as Record<string, unknown>;
  g.localStorage = box;
  g.sessionStorage = box;
  g.window = {
    localStorage: box,
    sessionStorage: box,
    location: { search: '' },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

beforeEach(() => {
  installStorage();
  captureMock.mockClear();
});

describe('trackGameEnd — account_first_game', () => {
  it('fires growth:account_first_game once when a fresh account finishes, then never again', () => {
    window.localStorage.setItem(
      ACCOUNT_FIRST_GAME_PENDING_KEY,
      JSON.stringify({ userId: 'u1', surface: 'header_or_menu' }),
    );
    trackGameStart('signup-first-game-mode', {});
    trackGameEnd('signup-first-game-mode', 10, 1, true);
    trackGameStart('signup-first-game-mode', {});
    trackGameEnd('signup-first-game-mode', 20, 2, true);

    const goals = captureMock.mock.calls.filter(([name]) => name === 'growth:account_first_game');
    expect(goals).toHaveLength(1);
    expect(goals[0][1]).toMatchObject({ mode: 'signup-first-game-mode', signup_surface: 'header_or_menu' });
    expect(window.localStorage.getItem(ACCOUNT_FIRST_GAME_PENDING_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCOUNT_FIRST_GAME_DONE_KEY)).toBe('u1');
  });

  it('does not fire on an abandoned game or when no signup armed the goal', () => {
    trackGameStart('signup-first-game-abandon', {});
    trackGameEnd('signup-first-game-abandon', 0, 0, false);
    expect(captureMock.mock.calls.some(([name]) => name === 'growth:account_first_game')).toBe(false);
  });
});
