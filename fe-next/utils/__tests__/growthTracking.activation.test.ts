/**
 * markFirstGameActivation — extracted helper for activation funnel.
 *
 * Fires first_game_played + first_game_won dual-emit (growth: prefix + canonical)
 * at most once per device via localStorage dedup. Callable from useGameEnd AND
 * tutorial completion so the engineered win counts as activation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock('posthog-js', () => ({
  __esModule: true,
  default: {
    capture,
    identify: vi.fn(),
    register: vi.fn(),
    register_once: vi.fn(),
    people: { set: vi.fn(), set_once: vi.fn() },
  },
}));

vi.mock('@/utils/ga4', () => ({ trackGA4Event: vi.fn() }));

vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  if (typeof window !== 'undefined') {
    try { window.localStorage.clear(); } catch { /* noop */ }
  }
});

describe('markFirstGameActivation', () => {
  it('dual-emits first_game_played with mode=tutorial on first call', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    markFirstGameActivation({ won: false, score: 60, wordCount: 3, mode: 'tutorial' });

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('growth:first_game_played');
    expect(names).toContain('first_game_played');

    const canonical = capture.mock.calls.find(c => c[0] === 'first_game_played');
    expect(canonical?.[1]).toMatchObject({ gameMode: 'tutorial', score: 60, wordCount: 3 });
  });

  it('dual-emits first_game_won when won=true', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    markFirstGameActivation({ won: true, score: 60, wordCount: 3, mode: 'tutorial' });

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('growth:first_game_won');
    expect(names).toContain('first_game_won');
  });

  it('does NOT emit first_game_won when won=false', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    markFirstGameActivation({ won: false, score: 10, wordCount: 1, mode: 'singleplayer' });

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).not.toContain('first_game_won');
    expect(names).not.toContain('growth:first_game_won');
  });

  it('dedupes first_game_played across repeated calls', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    markFirstGameActivation({ won: false, score: 60, wordCount: 3, mode: 'tutorial' });
    capture.mockClear();
    markFirstGameActivation({ won: false, score: 999, wordCount: 99, mode: 'singleplayer' });

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).not.toContain('first_game_played');
    expect(names).not.toContain('growth:first_game_played');
  });

  it('dedupes first_game_won across repeated winning calls', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    markFirstGameActivation({ won: true, score: 60, wordCount: 3, mode: 'tutorial' });
    capture.mockClear();
    markFirstGameActivation({ won: true, score: 999, wordCount: 99, mode: 'singleplayer' });

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).not.toContain('first_game_won');
    expect(names).not.toContain('growth:first_game_won');
  });

  it('allows first_game_won on later call if first call was not a win', async () => {
    const { markFirstGameActivation } = await import('../growthTracking');
    markFirstGameActivation({ won: false, score: 60, wordCount: 3, mode: 'singleplayer' });
    capture.mockClear();
    markFirstGameActivation({ won: true, score: 120, wordCount: 8, mode: 'singleplayer' });

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('first_game_won');
    expect(names).toContain('growth:first_game_won');
    expect(names).not.toContain('first_game_played');
  });
});
