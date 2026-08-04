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

  // nightly collect-revenue.sh queries for unprefixed 'rewarded_ad_watched'
  // but trackRewardedAdWatched only emits 'growth:rewarded_ad_watched' unless
  // the event is in CANONICAL_DUAL_EMIT — causing 0/7d in the revenue brief.
  it('trackRewardedAdWatched dual-emits canonical rewarded_ad_watched for nightly collector', async () => {
    const { trackRewardedAdWatched } = await import('../growthTracking');
    trackRewardedAdWatched('admob', 50, 'results');

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('growth:rewarded_ad_watched');
    expect(names).toContain('rewarded_ad_watched');
  });

  // D1-retention lever (t_ced821bf): FTUE → auto-start practice game.
  // The retention funnel queries the canonical unprefixed event, so
  // onboarding_quick_play must dual-emit like the other funnel anchors.
  it('trackOnboardingQuickPlay dual-emits canonical onboarding_quick_play with source', async () => {
    const { trackOnboardingQuickPlay } = await import('../growthTracking');
    trackOnboardingQuickPlay({ source: 'quick_start' });

    const names = capture.mock.calls.map(c => c[0]);
    expect(names).toContain('growth:onboarding_quick_play');
    expect(names).toContain('onboarding_quick_play');
    const canonical = capture.mock.calls.find(c => c[0] === 'onboarding_quick_play');
    expect(canonical?.[1]).toMatchObject({ source: 'quick_start' });
  });
});
