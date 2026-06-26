/**
 * Brain-drill telemetry helper tests.
 *
 * Wraps PostHog capture for the drills tree so events share a stable
 * `drill_*` prefix and snake_case property shape. Lets us measure
 * funnel (start → complete vs abandon) which the API-only `drill_completed`
 * event cannot.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureMock = vi.fn();
const trackGameStartMock = vi.fn();

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
    __loaded: true,
  },
}));

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: (...args: unknown[]) => trackGameStartMock(...args),
}));

import {
  trackDrillStart,
  trackDrillAbandon,
  trackDrillComplete,
} from '../telemetry';

describe('drill telemetry', () => {
  beforeEach(() => {
    captureMock.mockClear();
    trackGameStartMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('drill_started event tags drillType + level', () => {
    trackDrillStart({ drillType: 'combo-master', level: 3 });

    expect(captureMock).toHaveBeenCalledWith('drill_started', {
      drill_type: 'combo-master',
      level: 3,
    });
  });

  it('trackDrillStart also fires game_started with mode=brain-drill so per-mode funnel is symmetric', () => {
    trackDrillStart({ drillType: 'lightning-round', level: 2 });

    expect(trackGameStartMock).toHaveBeenCalledWith('brain-drill', {
      drillType: 'lightning-round',
      level: 2,
    });
  });

  it('drill_abandoned event captures progress at exit', () => {
    trackDrillAbandon({
      drillType: 'rare-gems',
      level: 2,
      score: 30,
      wordsFound: 4,
      durationSeconds: 22,
    });

    expect(captureMock).toHaveBeenCalledWith('drill_abandoned', {
      drill_type: 'rare-gems',
      level: 2,
      score: 30,
      words_found: 4,
      duration_seconds: 22,
    });
  });

  it('drill_completed event mirrors server payload for client-side funnels', () => {
    trackDrillComplete({
      drillType: 'lightning-round',
      level: 4,
      score: 320,
      wordsFound: 18,
      durationSeconds: 45,
    });

    expect(captureMock).toHaveBeenCalledWith('drill_completed', {
      drill_type: 'lightning-round',
      level: 4,
      score: 320,
      words_found: 18,
      duration_seconds: 45,
    });
  });

  it('never throws if posthog.capture itself throws', () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error('boom');
    });

    expect(() =>
      trackDrillStart({ drillType: 'memory-hunt', level: 1 })
    ).not.toThrow();
  });
});
