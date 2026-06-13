/**
 * growthTracking — landing_cta_clicked tracks which primary CTA on landing
 * pages users engage with. Wired to instrument the 95 visitor → 7
 * onboarding_started gap (88 of 95 visitors never enter onboarding).
 * Payload lets us split drop-off by cta id and mode variant.
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

import { trackLandingCtaClick } from '../growthTracking';

function findCapture(event: string): Record<string, unknown> | undefined {
  const hit = captureMock.mock.calls.find(([name]) => name === `growth:${event}`);
  return hit?.[1] as Record<string, unknown> | undefined;
}

describe('trackLandingCtaClick', () => {
  beforeEach(() => captureMock.mockClear());

  it('emits growth:landing_cta_clicked with cta id', () => {
    trackLandingCtaClick('mode_card');
    const payload = findCapture('landing_cta_clicked');
    expect(payload).toBeDefined();
    expect(payload!.cta).toBe('mode_card');
  });

  it('merges extras (mode, variant) into payload', () => {
    trackLandingCtaClick('mode_card', { mode: 'daily', variant: 'cyan' });
    const payload = findCapture('landing_cta_clicked');
    expect(payload!.cta).toBe('mode_card');
    expect(payload!.mode).toBe('daily');
    expect(payload!.variant).toBe('cyan');
  });

  it('does not let extras overwrite cta', () => {
    trackLandingCtaClick('hero_play', { cta: 'stale' });
    const payload = findCapture('landing_cta_clicked');
    expect(payload!.cta).toBe('hero_play');
  });
});
