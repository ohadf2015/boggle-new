/**
 * trackGameEnd — a completion after a hidden/pagehide abandon must carry
 * `resumed_after_hidden: true` so funnels can drop the earlier abandon
 * instead of double-counting churn (t_19aaab43). A completion with no prior
 * hidden abandon must NOT carry the flag.
 */

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
vi.mock('@/utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { trackGameStart, trackGameEnd } from '../growthTracking';
import {
  installAbandonOnPagehide,
  __resetAbandonStateForTests,
} from '../abandonOnPagehide';

function fireHidden() {
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

function findCapture(event: string): Record<string, unknown> | undefined {
  const hit = captureMock.mock.calls.find(([name]) => name === `growth:${event}`);
  return hit?.[1] as Record<string, unknown> | undefined;
}

describe('trackGameEnd — resumed_after_hidden', () => {
  let uninstall: () => void;

  beforeEach(() => {
    captureMock.mockClear();
    __resetAbandonStateForTests();
    uninstall = installAbandonOnPagehide();
  });

  afterEach(() => {
    uninstall();
    vi.useRealTimers();
  });

  it('stamps resumed_after_hidden on a completion that follows a hidden abandon', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    trackGameStart('singleplayer');
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));

    fireHidden(); // abandon goes out with reason: hidden
    expect(findCapture('game_abandoned')).toMatchObject({ reason: 'hidden' });

    // Player foregrounds the tab and finishes the round.
    vi.setSystemTime(new Date('2026-01-01T00:01:00Z'));
    trackGameEnd('singleplayer', 120, 5, true);

    const completed = findCapture('game_completed');
    expect(completed).toBeDefined();
    expect(completed!.resumed_after_hidden).toBe(true);
  });

  it('does NOT stamp resumed_after_hidden on a clean completion', () => {
    trackGameStart('singleplayer');
    trackGameEnd('singleplayer', 120, 5, true);

    const completed = findCapture('game_completed');
    expect(completed).toBeDefined();
    expect(completed!.resumed_after_hidden).toBeUndefined();
  });

  it('does not double-emit abandon when pagehide follows the hidden backgrounding', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    trackGameStart('daily');
    vi.setSystemTime(new Date('2026-01-01T00:00:30Z'));

    fireHidden();
    window.dispatchEvent(new Event('pagehide'));

    const abandons = captureMock.mock.calls.filter(([name]) => name === 'growth:game_abandoned');
    expect(abandons).toHaveLength(1);
  });
});
