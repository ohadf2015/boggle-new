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

/** Conversion funnel step 1 — Polar opened the 14-day Teacher Pro trial. */
export function buildTrialStartEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'trial_start',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/** Conversion funnel step 3 — Polar paid checkout session created (user entered Polar). */
export function buildCheckoutCompleteEvent(userId: string): EduServerEvent {
  return { distinctId: userId, event: 'checkout_complete', properties: { ...BASE } };
}

/** Conversion funnel step 4 — Polar `subscription.active` and not trialing. */
export function buildPaidEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'paid',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/**
 * Teacher-facing trial-funnel start — Polar opened the 14-day trial
 * (webhook status `trialing`, teacher row upserted). Pairs with
 * `teacher_trial_converted`; dashboards count the pair distinct on
 * `subscription_id` because Polar redelivers webhook events.
 */
export function buildTeacherTrialStartedEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'teacher_trial_started',
    properties: { ...BASE, subscription_id: subscriptionId, trial_days_remaining: 14 },
  };
}

/**
 * Teacher-facing trial-funnel conversion — `subscription.activation` for the
 * Pro product while NOT trialing: the trial's first paid charge (or a
 * straight paid checkout) landed.
 */
export function buildTeacherTrialConvertedEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'teacher_trial_converted',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/** Day-10 Polar trial expiry email actually sent. */
export function buildPolarTrialDay10SentEvent(userId: string, daysLeft: number): EduServerEvent {
  return {
    distinctId: userId,
    event: 'teacher_polar_trial_day10_sent',
    properties: { ...BASE, days_left: daysLeft },
  };
}

/** Measurable gate step: teacher access request row durably created. */
export function buildEduAccessRequestCreatedEvent(
  userId: string,
  properties: Record<string, unknown> = {}
): EduServerEvent {
  return {
    distinctId: userId,
    event: 'edu_access_request_created',
    properties: { product: 'teacher_pro', ...properties },
  };
}

export const buildAccessRequestCreatedEvent = buildEduAccessRequestCreatedEvent;

/** Never throws: a dead analytics endpoint must never fail a checkout or a webhook. */
export function captureProFunnelServerEvent(event: EduServerEvent): void {
  try {
    captureEduServerEvents([event]);
  } catch {
    /* captureEduServerEvents already swallows transport errors; this guards the import edge */
  }
}
