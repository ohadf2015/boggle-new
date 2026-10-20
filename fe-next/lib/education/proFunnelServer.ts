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

/**
 * Fired on both checkout failure paths — `reason` is what tells a 503
 * (Polar env vars missing) apart from a 500 (Polar API itself rejected the
 * call), which is otherwise indistinguishable from a teacher who just closed
 * the tab.
 */
export function buildProCheckoutFailedEvent(userId: string, reason: string): EduServerEvent {
  return { distinctId: userId, event: 'edu_pro_checkout_failed', properties: { ...BASE, reason } };
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

/** Conversion funnel step 2 — Polar checkout session created (paid or trial). */
export function buildCheckoutStartedEvent(userId: string): EduServerEvent {
  return { distinctId: userId, event: 'checkout_started', properties: { ...BASE } };
}

/** Alias: trial checkout URL creation is the same `checkout_started` step. */
export const buildTrialCheckoutStartedEvent = buildCheckoutStartedEvent;

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

/** Canonical HQ funnel name — Polar granted the 14-day Teacher Pro trial. */
export function buildTeacherTrialStartedEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'teacher_trial_started',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/**
 * Teacher-onboarding funnel name (`teacher_onboarding_viewed → … →
 * trial_started`). Emitted ONLY here, from the webhook: the /teacher/upgrade
 * page redirects to Polar and never observes the outcome, so a client-side
 * capture at click time would count intent as a trial. plan/locale match the
 * funnel module's property convention.
 */
export function buildTrialStartedEvent(
  userId: string,
  subscriptionId: string,
  locale?: string | null
): EduServerEvent {
  return {
    distinctId: userId,
    event: 'trial_started',
    properties: {
      ...BASE,
      plan: 'trial',
      subscription_id: subscriptionId,
      ...(locale ? { locale } : {}),
    },
  };
}

/**
 * Teacher-onboarding funnel conversion step — Polar `subscription.active` and
 * NOT trialing. Same server-only rule as `trial_started`: the upgrade page
 * cannot see the money land.
 */
export function buildTeacherProUpgradedEvent(
  userId: string,
  subscriptionId: string,
  locale?: string | null
): EduServerEvent {
  return {
    distinctId: userId,
    event: 'teacher_pro_upgraded',
    properties: {
      ...BASE,
      plan: 'pro',
      subscription_id: subscriptionId,
      ...(locale ? { locale } : {}),
    },
  };
}

/**
 * Conversion funnel step 3 — Polar `subscription.active` and not trialing.
 * Must NOT fire at checkout-URL creation: that is only `checkout_started`.
 * `subscription_id` lets a query match completions to webhook paid count.
 */
export function buildCheckoutCompleteEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'checkout_complete',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/** Conversion funnel step 4 — Polar `subscription.active` and not trialing. */
export function buildPaidEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'paid',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/** Trial → paid. Only when Polar's row was a trial (metadata/trial_end). */
export function buildTeacherTrialConvertedEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'teacher_trial_converted',
    properties: { ...BASE, subscription_id: subscriptionId },
  };
}

/** Polar Teacher Pro trial lapsed without converting. */
export function buildTrialExpiredEvent(userId: string, subscriptionId: string): EduServerEvent {
  return {
    distinctId: userId,
    event: 'trial_expired',
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

/** Polar trial t-0 / t+3 conversion email actually sent. */
export function buildPolarTrialExpirySentEvent(userId: string, bucket: 't-0' | 't+3'): EduServerEvent {
  return {
    distinctId: userId,
    event: 'teacher_polar_trial_expiry_sent',
    properties: { ...BASE, bucket },
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
