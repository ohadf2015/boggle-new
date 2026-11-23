/**
 * Durable teacher trial → paid funnel.
 *
 * The Polar Teacher Pro trial shipped (PR #1143) with client/PostHog telemetry
 * only, and signup_completed overcounting proved client-side events cannot be
 * trusted. Every step of the money funnel is therefore ALSO written to
 * `subscription_events` (service-role only, survives PostHog outages, joins to
 * the teacher by user_id) at the server code path that makes it true:
 *
 *   teacher_trial_started        Polar webhook, subscription trialing (trackProTrial)
 *   teacher_trial_active         GET /api/subscription/status while trialing — the
 *                                teacher is back in the product on their trial
 *   teacher_trial_expiring       day-10 / day-before notice sent (cron)
 *   teacher_trial_expired        Polar webhook, trial lapsed without converting
 *   teacher_trial_paywall_viewed /api/education/teacher/upgrade-event (shown)
 *   checkout_started             /api/subscription/checkout (pre-existing event)
 *   teacher_subscription_active  Polar webhook, paid activation (trackProConversion)
 *
 * Report: fe-next/supabase/reports/teacher_trial_funnel.sql.
 *
 * Analytics must never take a write down: every helper swallows its own errors.
 */

import { createAdminClient } from '@/utils/supabase/admin';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import { CHECKOUT_STARTED_EVENT } from './abandonedCheckout';

export const TEACHER_TRIAL_STARTED_EVENT = 'teacher_trial_started';
export const TEACHER_TRIAL_ACTIVE_EVENT = 'teacher_trial_active';
export const TEACHER_TRIAL_EXPIRING_EVENT = 'teacher_trial_expiring';
export const TEACHER_TRIAL_EXPIRED_EVENT = 'teacher_trial_expired';
export const TEACHER_TRIAL_PAYWALL_VIEWED_EVENT = 'teacher_trial_paywall_viewed';
export const TEACHER_SUBSCRIPTION_ACTIVE_EVENT = 'teacher_subscription_active';

/** Canonical order, matching supabase/reports/teacher_trial_funnel.sql. */
export const TEACHER_TRIAL_FUNNEL_STEPS = [
  TEACHER_TRIAL_STARTED_EVENT,
  TEACHER_TRIAL_ACTIVE_EVENT,
  TEACHER_TRIAL_EXPIRING_EVENT,
  TEACHER_TRIAL_EXPIRED_EVENT,
  TEACHER_TRIAL_PAYWALL_VIEWED_EVENT,
  CHECKOUT_STARTED_EVENT,
  TEACHER_SUBSCRIPTION_ACTIVE_EVENT,
] as const;

export type TeacherTrialFunnelStep =
  | (typeof TEACHER_TRIAL_FUNNEL_STEPS)[number]
  | typeof CHECKOUT_STARTED_EVENT;

export interface TeacherTrialFunnelWrite {
  userId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  subscriptionId?: string | null;
  /**
   * Dedupe against existing rows for this user + event_type:
   * - 'ever': write only the first time (trial_started, trial_active, subscription_active).
   * - { withinMs }: at most one row per window (paywall_viewed, once a day).
   * - omitted: always write.
   * The check-then-insert race is benign: the report reads min(created_at) per step.
   */
  dedupe?: 'ever' | { withinMs: number };
}

async function alreadyRecorded(
  userId: string,
  eventType: string,
  dedupe: NonNullable<TeacherTrialFunnelWrite['dedupe']>,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    if (!admin) return false;
    let query = admin
      .from('subscription_events')
      .select('id')
      .eq('user_id', userId)
      .eq('event_type', eventType)
      .limit(1);
    if (dedupe !== 'ever') {
      query = query.gte('created_at', new Date(Date.now() - dedupe.withinMs).toISOString());
    }
    const { data, error } = await query;
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch {
    // Fail open: a broken dedupe read must not skip the step — duplicate rows
    // are harmless, the report reads min(created_at) per step.
    return false;
  }
}

/** Write one durable funnel step. Never throws. */
export async function recordTeacherTrialFunnelStep(write: TeacherTrialFunnelWrite): Promise<void> {
  try {
    if (!write.userId) return;
    if (write.dedupe && (await alreadyRecorded(write.userId, write.eventType, write.dedupe))) return;
    await logSubscriptionEvent({
      userId: write.userId,
      eventType: write.eventType,
      subscriptionId: write.subscriptionId ?? null,
      payload: write.payload ?? {},
    });
  } catch (err) {
    console.error('[TeacherTrialFunnel] durable step failed:', err);
  }
}
