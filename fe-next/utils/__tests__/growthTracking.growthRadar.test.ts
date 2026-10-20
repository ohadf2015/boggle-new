/**
 * growthTracking → Growth Radar mirror (t_eb26d5c5).
 *
 * trackGrowthEvent must twin the allowlisted funnel spine to window.gr as
 * growth:<event> with PII stripped, so visitors who refuse analytics cookies
 * (PostHog consent-gated) still count in Growth Radar's funnel. gr.js is
 * lazyOnload, so events fired before it loads must queue and flush.
 *
 * Runs in the node environment (utils/** per vitest.config.ts
 * environmentMatchGlobs), so window/sessionStorage are faked on globalThis.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

const grCapture = vi.fn();

const g = globalThis as Record<string, unknown>;
const savedWindow = g.window;
const savedSessionStorage = g.sessionStorage;

function installWindow(withGr: boolean): void {
  const store = new Map<string, string>();
  g.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  const base = { location: { search: '' } };
  g.window = withGr ? { ...base, gr: { capture: grCapture } } : base;
}

import {
  maybeTrackSignupCompleted,
  trackGrowthEvent,
  trackSignupFunnel,
  type GrowthEvent,
} from '../growthTracking';
import { __resetGrowthRadarMirrorForTests } from '../growthRadarMirror';

describe('trackGrowthEvent → Growth Radar mirror', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    captureMock.mockClear();
    grCapture.mockClear();
    __resetGrowthRadarMirrorForTests();
    installWindow(true);
    // Prime the session id: the first-ever trackGrowthEvent in a process
    // auto-fires an allowlisted session_start from getSessionId(). Emit a
    // non-mirrored event and clear so each test sees only its own mirror calls.
    trackGrowthEvent('page_view', {});
    grCapture.mockClear();
  });

  afterEach(() => {
    __resetGrowthRadarMirrorForTests();
    vi.useRealTimers();
  });

  afterEach(() => {
    g.window = savedWindow;
    g.sessionStorage = savedSessionStorage;
  });

  it('mirrors allowlisted first_game_played as growth:first_game_played', () => {
    trackGrowthEvent('first_game_played', { mode: 'classic' });
    expect(grCapture).toHaveBeenCalledWith(
      'growth:first_game_played',
      expect.objectContaining({ mode: 'classic' }),
    );
  });

  it('strips PII keys (email/name/phone/guest_name/userId/username) from the mirrored props', () => {
    trackGrowthEvent('first_game_played', {
      email: 'a@b.c',
      name: 'Alice',
      phone: '123',
      guest_name: 'Guesty',
      username: 'user_x',
      userId: 'uid-1',
      score: 42,
    });
    const call = grCapture.mock.calls.find(([e]) => e === 'growth:first_game_played');
    expect(call).toBeDefined();
    const props = call![1] as Record<string, unknown>;
    expect(props.email).toBeUndefined();
    expect(props.name).toBeUndefined();
    expect(props.phone).toBeUndefined();
    expect(props.guest_name).toBeUndefined();
    expect(props.username).toBeUndefined();
    expect(props.userId).toBeUndefined();
    expect(props.score).toBe(42);
    expect(props.sessionId).toBeDefined();
  });

  it('mirrors the whole funnel spine', () => {
    const spine: readonly GrowthEvent[] = [
      'session_start',
      'landing_cta_clicked',
      'onboarding_started',
      'onboarding_completed',
      'signup_completed',
      'game_started',
      'first_word_found',
      'game_completed',
      'first_game_won',
      'game_abandoned',
    ];
    for (const event of spine) {
      trackGrowthEvent(event, {});
    }
    const emitted = grCapture.mock.calls.map(([e]) => e);
    for (const event of spine) {
      expect(emitted).toContain(`growth:${event}`);
    }
  });

  it('does not mirror non-allowlisted events', () => {
    trackGrowthEvent('results_viewed', {});
    trackGrowthEvent('page_view', {});
    expect(grCapture).not.toHaveBeenCalled();
  });

  it('does not throw when window.gr is missing, and flushes the queue once gr loads', () => {
    installWindow(false);
    expect(() =>
      trackGrowthEvent('first_game_played', { mode: 'classic' }),
    ).not.toThrow();
    expect(grCapture).not.toHaveBeenCalled();

    // gr.js finishes loading after the event fired — the queued twin must flush.
    (g.window as Record<string, unknown>).gr = { capture: grCapture };
    vi.advanceTimersByTime(300);
    expect(grCapture).toHaveBeenCalledWith(
      'growth:first_game_played',
      expect.objectContaining({ mode: 'classic' }),
    );
  });

  it('drops the queue silently when gr never arrives within 10s', () => {
    installWindow(false);
    trackGrowthEvent('first_game_played', {});
    vi.advanceTimersByTime(11_000);
    expect(grCapture).not.toHaveBeenCalled();
    // No runaway poll: advancing further is a no-op and nothing throws.
    expect(() => vi.advanceTimersByTime(60_000)).not.toThrow();
  });

  it('does not mirror funnel events from a loopback page', () => {
    for (const hostname of ['localhost', '127.0.0.1', '::1', 'classroom.localhost']) {
      grCapture.mockClear();
      (g.window as { location: { hostname: string; search: string } }).location = {
        hostname,
        search: '',
      };
      trackGrowthEvent('game_started', { mode: 'classic' });
      trackGrowthEvent('signup_completed', { source: 'header_or_menu' });
      expect(grCapture, hostname).not.toHaveBeenCalled();
    }
  });

  it('does not mirror signup_completed from the undeduped funnel emitter', () => {
    (g.window as { location: { hostname: string; search: string } }).location = {
      hostname: 'www.lexiclash.live',
      search: '',
    };
    trackSignupFunnel('completed', false, { source: 'multi_game_prompt' });
    expect(grCapture.mock.calls.map(([event]) => event)).not.toContain('growth:signup_completed');
    // PostHog still records the prompt-funnel step. Only the Growth Radar twin is gated.
    expect(captureMock.mock.calls.map((c) => c[0])).toContain('growth:signup_completed');
  });

  it('mirrors signup_completed from the deduped emitter', () => {
    (g.window as { location: { hostname: string; search: string } }).location = {
      hostname: 'www.lexiclash.live',
      search: '',
    };
    const store = new Map<string, string>();
    g.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const emitted = maybeTrackSignupCompleted({
      userId: 'u-fresh',
      createdAt: new Date(Date.now() - 10_000).toISOString(),
      source: 'header_or_menu',
    });
    expect(emitted).toBe(true);
    expect(grCapture.mock.calls.map(([event]) => event)).toContain('growth:signup_completed');
  });
});
