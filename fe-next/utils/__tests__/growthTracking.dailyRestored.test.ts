import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    register: vi.fn(),
    register_once: vi.fn(),
    capture: (...a: unknown[]) => captureMock(...a),
    captureBeacon: (...a: unknown[]) => captureMock(...a),
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

// The hidden abandon also goes to analytics_events through the unload beacon.
const beaconMock = vi.fn();
vi.mock('@/utils/analyticsBeacon', () => ({
  persistEventBeacon: (...a: unknown[]) => beaconMock(...a),
}));
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { trackGameStart } from '../growthTracking';
import { installAbandonOnPagehide, __resetAbandonStateForTests } from '../abandonOnPagehide';

function fireHidden() {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

const captured = (event: string) =>
  captureMock.mock.calls.find(([name]) => name === `growth:${event}`)?.[1] as Record<string, unknown> | undefined;

describe('daily_restored on Word Tower start and abandon', () => {
  let uninstall: () => void;

  beforeEach(() => {
    captureMock.mockClear();
    __resetAbandonStateForTests();
    uninstall = installAbandonOnPagehide();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    uninstall();
    vi.useRealTimers();
  });

  it('carries the flag from the start onto the abandon of a reopened daily tower', () => {
    trackGameStart('word-tower', { v2: true, daily: true, daily_restored: true });
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    fireHidden();

    expect(captured('game_started')).toMatchObject({ daily_restored: true });
    expect(captured('game_abandoned')).toMatchObject({ mode: 'word-tower', daily_restored: true });
  });

  it('adds no key to other modes', () => {
    trackGameStart('singleplayer');
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));
    fireHidden();

    expect(captured('game_abandoned')).not.toHaveProperty('daily_restored');
  });
});
