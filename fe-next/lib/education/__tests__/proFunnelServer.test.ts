/**
 * Teacher Pro funnel — server half. posthog-node sets no `$host`, and every
 * LexiClash dashboard filters on it, so these events go through
 * `captureEduServerEvents` (which stamps it) — never a bare capture.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCapture = vi.fn();
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: (...a: unknown[]) => mockCapture(...a) }),
}));

import { EDU_ANALYTICS_HOST } from '@/backend/utils/educationTelemetry';
import {
  buildProCheckoutStartedEvent,
  buildProCheckoutSucceededEvent,
  captureProFunnelServerEvent,
} from '../proFunnelServer';

describe('Pro funnel server events', () => {
  beforeEach(() => mockCapture.mockReset());

  it('Given a created checkout, When built, Then it is edu_pro_checkout_started for that user', () => {
    expect(buildProCheckoutStartedEvent('u-1')).toEqual({
      distinctId: 'u-1',
      event: 'edu_pro_checkout_started',
      properties: { product: 'teacher_pro', provider: 'polar' },
    });
  });

  it('Given an active pro subscription, When built, Then it carries the subscription id for de-duplication', () => {
    expect(buildProCheckoutSucceededEvent('u-1', 'sub-9')).toEqual({
      distinctId: 'u-1',
      event: 'edu_pro_checkout_succeeded',
      properties: { product: 'teacher_pro', provider: 'polar', subscription_id: 'sub-9' },
    });
  });

  it('Given either event, When captured, Then $host is stamped so the dashboard filter can see it', () => {
    captureProFunnelServerEvent(buildProCheckoutStartedEvent('u-1'));
    captureProFunnelServerEvent(buildProCheckoutSucceededEvent('u-1', 'sub-9'));
    expect(mockCapture).toHaveBeenCalledTimes(2);
    for (const [arg] of mockCapture.mock.calls) {
      expect(arg.properties.$host).toBe(EDU_ANALYTICS_HOST);
      expect(arg.properties.$host).toBeTruthy();
    }
  });

  it('Given PostHog throws, When captured, Then it never throws into the money path', () => {
    mockCapture.mockImplementationOnce(() => {
      throw new Error('down');
    });
    expect(() => captureProFunnelServerEvent(buildProCheckoutStartedEvent('u-1'))).not.toThrow();
  });
});
