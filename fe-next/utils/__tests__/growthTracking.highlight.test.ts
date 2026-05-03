/**
 * growthTracking — highlight reel telemetry helpers.
 *
 * Track Blast highlight reel lifecycle: start → clips streaming → buffer overflow
 * (if events exceed internal buffer capacity).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('posthog-js', () => ({
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
  trackHighlightStart,
  trackHighlightSkipped,
  trackHighlightBufferOverflow,
} from '../growthTracking';

describe('highlight reel telemetry', () => {
  beforeEach(() => {
    captureMock.mockClear();
  });

  it('trackHighlightStart fires highlight_started with topEpicness and clipCount', () => {
    trackHighlightStart({ topEpicness: 320, clipCount: 1 });
    expect(captureMock).toHaveBeenCalledWith('highlight_started', {
      topEpicness: 320,
      clipCount: 1,
    });
  });

  it('trackHighlightSkipped fires highlight_skipped with clipIndex and elapsedMs', () => {
    trackHighlightSkipped({ clipIndex: 0, elapsedMs: 1200 });
    expect(captureMock).toHaveBeenCalledWith('highlight_skipped', {
      clipIndex: 0,
      elapsedMs: 1200,
    });
  });

  it('trackHighlightBufferOverflow fires highlight_buffer_overflow with eventsDropped', () => {
    trackHighlightBufferOverflow({ eventsDropped: 5 });
    expect(captureMock).toHaveBeenCalledWith('highlight_buffer_overflow', {
      eventsDropped: 5,
    });
  });
});
