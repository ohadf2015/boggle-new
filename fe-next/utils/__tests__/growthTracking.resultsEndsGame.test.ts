/**
 * A viewed results screen ends the game, for abandonment purposes.
 *
 * THE DEFECT (Class 3 — asymmetric paths). Two different components decide
 * "this round is over" from two different sources:
 *   - `useGameEndTelemetry` (host/player views) keys off `tournament.finalScores`
 *     / `waitingForResults`, and it alone calls `trackGameEnd` → `markGameInactive()`.
 *   - The results screen itself (`ResultsMainContent`, and the daily/blast/SP
 *     equivalents) renders from its own data and emits `results_viewed`.
 * When the second fires and the first does not, `active` is never cleared, so the
 * in-game view's unmount emits `growth:game_abandoned reason=spa_navigate` for a
 * round the player actually finished.
 *
 * Production (30d, lexiclash.live): 1,218 such abandons, spiking at the exact
 * round length — 302 of classic's 515 in the 90-99s bucket against a 90s round.
 * NOT ONE had a `game_completed` within 15s, yet 96.8% of them reached a results
 * screen within 30s. It made classic/word-hunt/blast/wheel-rush look abandoned
 * two thirds of the time.
 *
 * The fix goes in the shared emit chokepoint rather than in the five results
 * components, so every mode is covered by one guard and no sibling can drift.
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
  },
}));

vi.mock('@/utils/ga4', () => ({ trackGA4Event: vi.fn() }));

vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  if (typeof window !== 'undefined') {
    try { window.localStorage.clear(); } catch { }
  }
});

describe('results_viewed clears the active-game flag', () => {
  it('suppresses the phantom abandon when the player reached a results screen', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const { trackGameStart, trackGrowthEvent } = await import('../growthTracking');
    const { emitAbandonOnSpaNavigate, __resetAbandonStateForTests } = await import('../abandonOnPagehide');
    __resetAbandonStateForTests();

    trackGameStart('classic');
    vi.setSystemTime(new Date('2026-01-01T00:01:30Z')); // full 90s round

    // The results screen rendered — even though useGameEndTelemetry never fired.
    trackGrowthEvent('results_viewed', { mode: 'classic', score: 120 });
    capture.mockClear();

    // ...and now the in-game view unmounts.
    emitAbandonOnSpaNavigate();
    await vi.advanceTimersByTimeAsync(50);

    const abandons = capture.mock.calls.filter((c) => String(c[0]).endsWith('game_abandoned'));
    expect(abandons).toHaveLength(0);
    vi.useRealTimers();
  });

  it('does the same for the multiplayer results event', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const { trackGameStart, trackGrowthEvent } = await import('../growthTracking');
    const { emitAbandonOnSpaNavigate, __resetAbandonStateForTests } = await import('../abandonOnPagehide');
    __resetAbandonStateForTests();

    trackGameStart('word-hunt');
    vi.setSystemTime(new Date('2026-01-01T00:01:30Z'));

    trackGrowthEvent('mp_results_viewed', { mode: 'word-hunt' });
    capture.mockClear();

    emitAbandonOnSpaNavigate();
    await vi.advanceTimersByTimeAsync(50);

    expect(capture.mock.calls.filter((c) => String(c[0]).endsWith('game_abandoned'))).toHaveLength(0);
    vi.useRealTimers();
  });

  it('still reports a genuine mid-round exit, where no results screen was seen', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const { trackGameStart } = await import('../growthTracking');
    const { emitAbandonOnSpaNavigate, __resetAbandonStateForTests } = await import('../abandonOnPagehide');
    __resetAbandonStateForTests();

    trackGameStart('classic');
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z')); // bailed at 30s
    capture.mockClear();

    emitAbandonOnSpaNavigate();
    await vi.advanceTimersByTimeAsync(50);

    const abandons = capture.mock.calls.filter((c) => String(c[0]).endsWith('game_abandoned'));
    expect(abandons.length).toBeGreaterThan(0);
    expect(abandons[0][1]).toMatchObject({ reason: 'spa_navigate', durationSec: 30 });
    vi.useRealTimers();
  });
});
