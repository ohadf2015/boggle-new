/**
 * Canonical PostHog event names (single-emit).
 *
 * Funnel-critical events emit ONLY their canonical (unprefixed) name. The
 * historical `growth:` dual-emit doubled every key event count and poisoned
 * every funnel ratio in PostHog. Non-whitelisted events keep the `growth:`
 * prefix so internal dashboards stay grouped.
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

describe('trackGrowthEvent — canonical single-emit', () => {
  it('emits ONLY canonical game_started for whitelisted events', async () => {
    const { trackGameStart } = await import('../growthTracking');
    trackGameStart('classic');

    const eventNames = capture.mock.calls.map(c => c[0]);
    expect(eventNames).toContain('game_started');
    expect(eventNames).not.toContain('growth:game_started');

    const canonical = capture.mock.calls.find(c => c[0] === 'game_started');
    expect(canonical?.[1]).toMatchObject({ mode: 'classic' });
  });

  it('emits canonical game_completed (no growth: dupe) with mode + score', async () => {
    const { trackGameEnd } = await import('../growthTracking');
    trackGameEnd('adventure', 1234, 17, true, 90);

    const completedNames = capture.mock.calls.map(c => c[0]).filter(n => n === 'game_completed' || n === 'growth:game_completed');
    expect(completedNames).toEqual(['game_completed']);

    const canonical = capture.mock.calls.find(c => c[0] === 'game_completed');
    expect(canonical?.[1]).toMatchObject({
      mode: 'adventure',
      score: 1234,
      wordCount: 17,
    });
  });

  it('keeps growth: prefix for non-whitelisted events (single-emit)', async () => {
    const { trackGrowthEvent } = await import('../growthTracking');
    trackGrowthEvent('page_view', {});

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('growth:page_view');
    expect(names).not.toContain('page_view');
  });

  // Hole #5 — PostHog Goal "Signup Completed" was wired to a non-existent
  // event name. Existing `trackSignupFunnel('completed')` only fires when the
  // post-game prompt was shown first; users signing up via header/menu never
  // emit a completion. New `trackSignupCompleted(source)` is unconditional —
  // every guest→authed flip emits canonical `signup_completed` so the funnel
  // can attribute by source.
  it('trackSignupCompleted emits canonical signup_completed with source attribution', async () => {
    const { trackSignupCompleted } = await import('../growthTracking');
    trackSignupCompleted('multi_game_prompt');

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('signup_completed');
    const canonical = capture.mock.calls.find(c => c[0] === 'signup_completed');
    expect(canonical?.[1]).toMatchObject({ source: 'multi_game_prompt' });
  });

  it('trackSignupCompleted defaults source to "unknown" when omitted', async () => {
    const { trackSignupCompleted } = await import('../growthTracking');
    trackSignupCompleted();

    const canonical = capture.mock.calls.find(c => c[0] === 'signup_completed');
    expect(canonical?.[1]).toMatchObject({ source: 'unknown' });
  });
});
