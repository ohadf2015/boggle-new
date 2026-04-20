/**
 * Dual-emit canonical PostHog event names.
 *
 * Growth events are sent with a "growth:" prefix for historical reasons, but
 * the dashboards query canonical unprefixed names (e.g. "game_started").
 * This test locks in the dual-emit so both resolve.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture } = vi.hoisted(() => ({
  capture: vi.fn(),
}));

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

vi.mock('@/utils/ga4', () => ({
  trackGA4Event: vi.fn(),
}));

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

describe('trackGrowthEvent — canonical dual-emit', () => {
  it('emits BOTH growth:game_started AND canonical game_started', async () => {
    const { trackGameStart } = await import('../growthTracking');
    trackGameStart('classic');

    const eventNames = capture.mock.calls.map(c => c[0]);
    expect(eventNames).toContain('growth:game_started');
    expect(eventNames).toContain('game_started');

    const canonical = capture.mock.calls.find(c => c[0] === 'game_started');
    expect(canonical?.[1]).toMatchObject({ mode: 'classic' });
  });

  it('emits canonical game_completed with mode + score', async () => {
    const { trackGameEnd } = await import('../growthTracking');
    trackGameEnd('adventure', 1234, 17, true, 90);

    const canonical = capture.mock.calls.find(c => c[0] === 'game_completed');
    expect(canonical).toBeDefined();
    expect(canonical?.[1]).toMatchObject({
      mode: 'adventure',
      score: 1234,
      wordCount: 17,
    });
  });

  it('does NOT dual-emit non-whitelisted events', async () => {
    const { trackGrowthEvent } = await import('../growthTracking');
    trackGrowthEvent('page_view', {});

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('growth:page_view');
    expect(names).not.toContain('page_view');
  });
});
