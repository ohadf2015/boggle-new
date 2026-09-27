/**
 * `session_start` was a GrowthEvent union member with ZERO call sites
 * anywhere in the codebase (2026-08-01 telemetry coverage audit — 0 live
 * volume, confirmed not a classifier artifact). Fires once per browser-tab
 * session, tied to first-ever sessionStorage id generation in getSessionId().
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
  vi.resetModules();
  if (typeof window !== 'undefined') {
    try { window.sessionStorage.clear(); } catch { }
  }
});

describe('trackGrowthEvent — session_start', () => {
  it('emits canonical + growth:-prefixed session_start on first-ever session id generation', async () => {
    const { trackGameStart } = await import('../growthTracking');
    trackGameStart('classic');

    const eventNames = capture.mock.calls.map((c) => c[0]);
    expect(eventNames).toContain('session_start');
    expect(eventNames).toContain('growth:session_start');
  });

  it('does not re-fire session_start on a later event within the same session', async () => {
    const { trackGameStart } = await import('../growthTracking');
    trackGameStart('classic');
    capture.mockClear();

    trackGameStart('word-hunt');

    const eventNames = capture.mock.calls.map((c) => c[0]);
    expect(eventNames).not.toContain('session_start');
  });
});
