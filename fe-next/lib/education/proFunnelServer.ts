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

/** Never throws: a dead analytics endpoint must never fail a checkout or a webhook. */
export function captureProFunnelServerEvent(event: EduServerEvent): void {
  try {
    captureEduServerEvents([event]);
  } catch {
    /* captureEduServerEvents already swallows transport errors; this guards the import edge */
  }
}
