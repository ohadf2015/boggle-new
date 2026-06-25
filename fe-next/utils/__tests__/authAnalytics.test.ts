/**
 * authAnalytics — identifyUserForAnalytics
 *
 * Combines posthog.identify + user_identified capture + first-touch
 * acquisition person-props. Acquisition props lock in via $set_once so
 * later touches don't overwrite the original source.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { capture, identify, people_set_once, reset, posthogMock } = vi.hoisted(() => {
  const c = vi.fn();
  const i = vi.fn();
  const pso = vi.fn();
  const r = vi.fn();
  // `__loaded` is mutated per-test to simulate init state.
  // `isLoaded` reads __loaded so guard tests still work via posthogMock.__loaded = false.
  const mock: Record<string, unknown> = {
    __loaded: true,
    isLoaded: () => (mock as Record<string, boolean>).__loaded === true,
    capture: c,
    identify: i,
    reset: r,
    register: vi.fn(),
    register_once: vi.fn(),
    people: { set: vi.fn(), set_once: pso },
  };
  return { capture: c, identify: i, people_set_once: pso, reset: r, posthogMock: mock };
});

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  __esModule: true,
  default: posthogMock,
}));

const mockUtm = vi.fn();
vi.mock('@/utils/utmCapture', () => ({
  getStoredUtmData: () => mockUtm(),
}));

import {
  captureUserLoggedOut,
  identifyUserForAnalytics,
  resetUserAnalytics,
  syncAuthAnalyticsTransition,
} from '../authAnalytics';

describe('identifyUserForAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUtm.mockReturnValue(null);
  });

  it('calls posthog.identify with core profile fields', () => {
    identifyUserForAnalytics({
      userId: 'user-1',
      displayName: 'Alice',
      isAdmin: false,
      isTeacher: false,
      locale: 'en',
    });

    expect(identify).toHaveBeenCalledWith('user-1', {
      display_name: 'Alice',
      is_admin: false,
      is_teacher: false,
    });
  });

  it('includes email in identify when provided (for flag targeting)', () => {
    identifyUserForAnalytics({
      userId: 'user-1',
      displayName: 'Alice',
      isAdmin: false,
      isTeacher: false,
      locale: 'en',
      email: 'alice@example.com',
    });

    expect(identify).toHaveBeenCalledWith('user-1', {
      display_name: 'Alice',
      is_admin: false,
      is_teacher: false,
      email: 'alice@example.com',
    });
  });

  it('captures user_identified event', () => {
    identifyUserForAnalytics({
      userId: 'user-1',
      displayName: 'Alice',
      isAdmin: true,
      isTeacher: false,
      locale: 'he',
    });

    expect(capture).toHaveBeenCalledWith('user_identified', {
      user_id: 'user-1',
      display_name: 'Alice',
      is_guest: false,
      is_admin: true,
      is_teacher: false,
    });
  });

  it('writes acquisition props via $set_once (first-touch attribution)', () => {
    mockUtm.mockReturnValue({
      utm_source: 'twitter',
      utm_medium: 'social',
      utm_campaign: 'launch',
      utm_term: null,
      utm_content: null,
      referrer: 'https://twitter.com',
      ref: 'alice123',
      captured_at: 1700000000000,
    });

    identifyUserForAnalytics({
      userId: 'user-1',
      displayName: 'Alice',
      isAdmin: false,
      isTeacher: false,
      locale: 'en',
    });

    expect(people_set_once).toHaveBeenCalledWith(
      expect.objectContaining({
        acquisition_utm_source: 'twitter',
        acquisition_utm_medium: 'social',
        acquisition_utm_campaign: 'launch',
        acquisition_ref: 'alice123',
        acquisition_referrer: 'https://twitter.com',
        first_locale: 'en',
        acquisition_date: expect.any(String),
      })
    );
  });

  it('still sets first_locale + acquisition_date when no UTM data', () => {
    mockUtm.mockReturnValue(null);

    identifyUserForAnalytics({
      userId: 'user-1',
      displayName: 'Alice',
      isAdmin: false,
      isTeacher: false,
      locale: 'he',
    });

    expect(people_set_once).toHaveBeenCalledWith(
      expect.objectContaining({
        first_locale: 'he',
        acquisition_date: expect.any(String),
        acquisition_utm_source: null,
        acquisition_ref: null,
      })
    );
  });

  it('acquisition_date is ISO 8601', () => {
    identifyUserForAnalytics({
      userId: 'user-1',
      displayName: 'A',
      isAdmin: false,
      isTeacher: false,
      locale: 'en',
    });

    const args = people_set_once.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(args.acquisition_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('resetUserAnalytics only resets — never auto-emits user_logged_out', () => {
    // Auto-emit on state transition caused 6.5x logout-per-user spam (PostHog
    // 30d: 767/117). Logout event must come from explicit signOut() only;
    // session-refresh blips and cross-tab oscillation should not pollute it.
    const reset = vi.fn();
    resetUserAnalytics({ reset });

    expect(reset).toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalledWith('user_logged_out');
  });
});

describe('syncAuthAnalyticsTransition (gates user_logged_out / user_identified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUtm.mockReturnValue(null);
  });

  const identifyArgs = {
    userId: 'user-1',
    displayName: 'Alice',
    isAdmin: false,
    isTeacher: false,
    locale: 'en',
  };

  it('guest mount (false → false) does NOT capture user_logged_out', () => {
    const reset = vi.fn();
    const next = syncAuthAnalyticsTransition({
      wasAuthenticated: false,
      identify: null,
      reset,
    });
    expect(reset).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
    expect(next).toBe(false);
  });

  it('login (false → true) captures user_identified once', () => {
    const reset = vi.fn();
    const next = syncAuthAnalyticsTransition({
      wasAuthenticated: false,
      identify: identifyArgs,
      reset,
    });
    expect(reset).not.toHaveBeenCalled();
    expect(capture).toHaveBeenCalledWith('user_identified', expect.any(Object));
    expect(next).toBe(true);
  });

  it('logout (true → false) resets identification but does NOT emit user_logged_out', () => {
    // The state-transition logout path covers session-refresh failures, cross-
    // tab signouts, and other system-driven flips. Those should reset the
    // PostHog identification (so guest events route to a new distinct_id) but
    // must NOT emit user_logged_out — that event is reserved for explicit,
    // user-initiated signOut (see lib/supabase.ts).
    const reset = vi.fn();
    const next = syncAuthAnalyticsTransition({
      wasAuthenticated: true,
      identify: null,
      reset,
    });
    expect(reset).toHaveBeenCalledTimes(1);
    expect(capture).not.toHaveBeenCalledWith('user_logged_out');
    expect(next).toBe(false);
  });

  it('re-identify while authenticated does not double-capture user_logged_out', () => {
    const reset = vi.fn();
    const next = syncAuthAnalyticsTransition({
      wasAuthenticated: true,
      identify: identifyArgs,
      reset,
    });
    expect(reset).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalledWith('user_logged_out');
    expect(next).toBe(true);
  });
});

describe('posthog-uninitialized guard (no NEXT_PUBLIC_POSTHOG_KEY)', () => {
  // When posthog.init() has never been called, posthog.reset/identify/capture
  // throw `Cannot read properties of undefined (reading '__loaded')`. The
  // safe() wrapper catches the throw but the call still pollutes the dev
  // console. Guard at the caller so we don't even attempt the call.
  beforeEach(() => {
    vi.clearAllMocks();
    mockUtm.mockReturnValue(null);
    posthogMock.__loaded = false;
  });

  afterEach(() => {
    posthogMock.__loaded = true;
  });

  it('resetUserAnalytics() with no opts skips posthog.reset when __loaded=false', () => {
    resetUserAnalytics();
    expect(reset).not.toHaveBeenCalled();
  });

  it('identifyUserForAnalytics skips posthog.identify when __loaded=false', () => {
    identifyUserForAnalytics({
      userId: 'user-1',
      displayName: 'Alice',
      isAdmin: false,
      isTeacher: false,
      locale: 'en',
    });
    expect(identify).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it('captureUserLoggedOut skips posthog.capture when __loaded=false', () => {
    captureUserLoggedOut();
    expect(capture).not.toHaveBeenCalled();
  });

  it('explicit injected reset still fires (test-injection path bypasses guard)', () => {
    // Tests/callers that inject their own reset spy expect the call — the
    // guard only blocks the default posthog.reset path.
    const injected = vi.fn();
    resetUserAnalytics({ reset: injected });
    expect(injected).toHaveBeenCalled();
  });
});
