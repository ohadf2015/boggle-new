/**
 * growthTracking — rewarded-ad funnel helpers.
 *
 * Funnel: offered → watched (success) or declined (dismiss/error).
 * Each event carries `surface` (which UI exposed the CTA) + `platform`
 * (crazygames | admob | simulation | no-ad-placeholder) so the
 * PostHog funnel can filter by surface and slice fill/reward by network.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    register: vi.fn(),
    register_once: vi.fn(),
    capture: (...a: unknown[]) => captureMock(...a),
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

import {
  trackRewardedAdOffered,
  trackRewardedAdWatched,
  trackRewardedAdDeclined,
} from '../growthTracking';

describe('rewarded-ad growth helpers', () => {
  beforeEach(() => {
    captureMock.mockClear();
  });

  it('trackRewardedAdOffered fires growth:rewarded_ad_offered with surface', () => {
    trackRewardedAdOffered('level_complete');

    const ev = captureMock.mock.calls.find((c) => c[0] === 'growth:rewarded_ad_offered');
    expect(ev).toBeDefined();
    expect(ev![1]).toMatchObject({ surface: 'level_complete' });
  });

  it('trackRewardedAdWatched fires with platform and reward amount', () => {
    trackRewardedAdWatched('crazygames', 50, 'gold_top_up');

    const ev = captureMock.mock.calls.find((c) => c[0] === 'growth:rewarded_ad_watched');
    expect(ev).toBeDefined();
    expect(ev![1]).toMatchObject({
      platform: 'crazygames',
      reward: 50,
      surface: 'gold_top_up',
    });
  });

  it('trackRewardedAdDeclined carries reason + platform for drop-off analysis', () => {
    trackRewardedAdDeclined('dismissed_no_reward', 'admob', 'retry_assist');

    const ev = captureMock.mock.calls.find((c) => c[0] === 'growth:rewarded_ad_declined');
    expect(ev).toBeDefined();
    expect(ev![1]).toMatchObject({
      reason: 'dismissed_no_reward',
      platform: 'admob',
      surface: 'retry_assist',
    });
  });

  it('offered accepts an optional placement for granular cohort slicing', () => {
    trackRewardedAdOffered('boss_rush_results', { placement: 'footer_cta' });

    const ev = captureMock.mock.calls.find((c) => c[0] === 'growth:rewarded_ad_offered');
    expect(ev![1]).toMatchObject({ surface: 'boss_rush_results', placement: 'footer_cta' });
  });
});
