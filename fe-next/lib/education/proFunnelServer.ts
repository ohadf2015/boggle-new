/**
 * Teacher Pro funnel — the server-side steps (checkout created, subscription
 * active). Pure builders + one emitter.
 *
 * Emitted ONLY through `captureEduServerEvents`, which stamps `$host`:
 * posthog-node sets none, and every LexiClash dashboard filters on it, so a
 * bare `getPostHogServer().capture()` would make both steps invisible. See the
 * header of backend/utils/educationTelemetry.ts. Client steps live in
 * `proFunnelTelemetry.ts`.
 */

import {
  captureEduServerEvents,
  type EduServerEvent,
} from '@/backend/utils/educationTelemetry';

const BASE = { product: 'teacher_pro', provider: 'polar' } as const;

export function buildProCheckoutStartedEvent(userId: string): EduServerEvent {
  return { distinctId: userId, event: 'edu_pro_checkout_started', properties: { ...BASE } };
}

export function buildProCheckoutSucceededEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'edu_pro_checkout_succeeded',
    // Polar redelivers webhooks; the id lets a query count conversions distinct.
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

export function buildProTrialStartedEvent(userId: string): EduServerEvent {
  return { distinctId: userId, event: 'edu_pro_trial_started', properties: { ...BASE } };
}

/** Measurable trial funnel step 3 — same moment as `edu_pro_trial_started`. */
export function buildTrialCheckoutStartedEvent(userId: string): EduServerEvent {
  return { distinctId: userId, event: 'checkout_started', properties: { ...BASE } };
}

export function buildProTrialSucceededEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'edu_pro_trial_succeeded',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/** Measurable trial funnel step 4 — Polar actually opened the 14-day trial. */
export function buildTrialActivatedEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'trial_activated',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/** Never throws: a dead analytics endpoint must never fail a checkout or a webhook. */
export function captureProFunnelServerEvent(event: EduServerEvent): void {
  try {
    captureEduServerEvents([event]);
  } catch {
    /* captureEduServerEvents already swallows transport errors; this guards the import edge */
  }
}
