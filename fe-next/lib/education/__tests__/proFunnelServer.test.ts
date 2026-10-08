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
  buildProTrialStartedEvent,
  buildProTrialSucceededEvent,
  buildTrialCheckoutStartedEvent,
  buildTrialActivatedEvent,
  buildEduAccessRequestCreatedEvent,
  buildTrialStartEvent,
  buildCheckoutCompleteEvent,
  buildPaidEvent,
  buildPolarTrialDay10SentEvent,
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

  it('Given a Polar trial checkout, When built, Then it is edu_pro_trial_started', () => {
    expect(buildProTrialStartedEvent('u-1')).toEqual({
      distinctId: 'u-1',
      event: 'edu_pro_trial_started',
      properties: { product: 'teacher_pro', provider: 'polar' },
    });
  });

  it('Given a Polar trial checkout, When the measurable funnel step is built, Then it is checkout_started', () => {
    expect(buildTrialCheckoutStartedEvent('u-1')).toEqual({
      distinctId: 'u-1',
      event: 'checkout_started',
      properties: { product: 'teacher_pro', provider: 'polar' },
    });
  });

  it('Given a trialing subscription, When built, Then it is edu_pro_trial_succeeded with the id', () => {
    expect(buildProTrialSucceededEvent('u-1', 'sub-9')).toEqual({
      distinctId: 'u-1',
      event: 'edu_pro_trial_succeeded',
      properties: { product: 'teacher_pro', provider: 'polar', subscription_id: 'sub-9' },
    });
  });

  it('Given a trialing subscription, When the measurable funnel step is built, Then it is trial_activated', () => {
    expect(buildTrialActivatedEvent('u-1', 'sub-9')).toEqual({
      distinctId: 'u-1',
      event: 'trial_activated',
      properties: { product: 'teacher_pro', provider: 'polar', subscription_id: 'sub-9' },
    });
  });

  it('Given an active pro subscription, When built, Then it carries the subscription id for de-duplication', () => {
    expect(buildProCheckoutSucceededEvent('u-1', 'sub-9')).toEqual({
      distinctId: 'u-1',
      event: 'edu_pro_checkout_succeeded',
      properties: { product: 'teacher_pro', provider: 'polar', subscription_id: 'sub-9' },
    });
  });

  it('Given a Polar trial actually opened, When the conversion funnel step is built, Then it is trial_start', () => {
    expect(buildTrialStartEvent('u-1', 'sub-9')).toEqual({
      distinctId: 'u-1',
      event: 'trial_start',
      properties: { product: 'teacher_pro', provider: 'polar', subscription_id: 'sub-9' },
    });
  });

  it('Given a paid Polar checkout session, When built, Then it is checkout_complete', () => {
    expect(buildCheckoutCompleteEvent('u-1')).toEqual({
      distinctId: 'u-1',
      event: 'checkout_complete',
      properties: { product: 'teacher_pro', provider: 'polar' },
    });
  });

  it('Given Polar reports a paid Pro subscription, When built, Then it is paid', () => {
    expect(buildPaidEvent('u-1', 'sub-9')).toEqual({
      distinctId: 'u-1',
      event: 'paid',
      properties: { product: 'teacher_pro', provider: 'polar', subscription_id: 'sub-9' },
    });
  });

  it('Given a Polar day-10 nudge actually sent, When built, Then it is teacher_polar_trial_day10_sent', () => {
    expect(buildPolarTrialDay10SentEvent('u-1', 4)).toEqual({
      distinctId: 'u-1',
      event: 'teacher_polar_trial_day10_sent',
      properties: { product: 'teacher_pro', provider: 'polar', days_left: 4 },
    });
  });

  it('Given an access request created, When built, Then it is edu_access_request_created with properties', () => {
    expect(buildEduAccessRequestCreatedEvent('u-1', { role: 'teacher', locale: 'en' })).toEqual({
      distinctId: 'u-1',
      event: 'edu_access_request_created',
      properties: { product: 'teacher_pro', role: 'teacher', locale: 'en' },
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
