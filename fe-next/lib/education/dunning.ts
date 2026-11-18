import { createAdminClient } from '@/utils/supabase/admin';
import { billingPortalEmailUrl } from '@/lib/education/billingPortal';
import { sendEmail } from '@/lib/email/send';
import { teacherPaymentFailed } from '@/lib/email/templates/teacherPaymentFailed';
import { teacherPaymentFailedDay5 } from '@/lib/email/templates/teacherPaymentFailedDay5';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import {
  buildDunningEmailSentEvent,
  captureProFunnelServerEvent,
} from '@/lib/education/proFunnelServer';
import type { TeacherLocale } from '@/lib/education/types';
import type { TeacherProSubSnapshot } from '@/lib/education/teacherProChurnWatch';
import logger from '@/utils/logger';

/**
 * Dunning for Teacher Pro, day-1 only.
 *
 * The initial payment-failed note fires from the Polar webhook
 * (`subscription.past_due`, or `subscription.updated` whose status is past_due)
 * and from the churn-watch sweep when that webhook was missed.
 *
 * Day-5 escalation is NOT sent here. That template always says access pauses
 * in 2 days, which is false on a catch-up day, and it would double-email the
 * one-click card-update note owned by /api/cron/teacher-pro-dunning.
 */
export const DEDUPE_WINDOW_MS = 72 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const EVENT_DAY1 = 'teacher_payment_failed_email';
export const EVENT_DAY5 = 'teacher_dunning_day5_email';

export type DunningStep = 'day-1' | 'day-5';

export const VALID_LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

export interface DunningDecisionSignals {
  status: string;
  pastDueOnsetMs: number;
  nowMs: number;
  alreadySent: readonly string[];
}

/**
 * Pure decision: which dunning email this module may send.
 * Day-1 only, and only while the row is still past_due and inside the first
 * 5 days. Day 5+ returns null so the teacher-pro-dunning cron is the only
 * escalation sender. Canceled / revoked / active return null.
 */
export function pickDunningStep(signals: DunningDecisionSignals): DunningStep | null {
  if (signals.status !== 'past_due') return null;
  const elapsedDays = Math.max(0, Math.floor((signals.nowMs - signals.pastDueOnsetMs) / DAY_MS));
  if (elapsedDays >= 5) return null;

  const hasSentDay1 =
    signals.alreadySent.includes(EVENT_DAY1) || signals.alreadySent.includes('teacher_dunning_day1_email');
  if (!hasSentDay1) return 'day-1';
  return null;
}

/** Status the auto-send path is allowed to treat as past_due. Never invent one. */
export function dunningStatusFromPayload(payload: { type?: unknown; data?: { status?: unknown } }): string {
  const raw = payload?.data?.status;
  const status = typeof raw === 'string' ? raw : '';
  if (status) return status;
  return String(payload?.type ?? '') === 'subscription.past_due' ? 'past_due' : '';
}

export function resolvePastDueOnsetMs(
  sub: {
    provider_event_at?: string | null;
    current_period_end?: string | null;
    startedAt?: string | null;
    created_at?: string | null;
  },
  nowMs: number = Date.now(),
): number {
  if (sub.provider_event_at) {
    const t = Date.parse(sub.provider_event_at);
    if (Number.isFinite(t)) return t;
  }
  return nowMs;
}

export interface SendDunningArgs {
  subscriptionId: string;
  userId?: string;
  email: string;
  fullName?: string;
  locale?: TeacherLocale;
  step: DunningStep;
  renewalDate?: string | null;
}

/**
 * Verifiably fire a dunning email (day-1 or day-5), write to subscription_events,
 * emit PostHog event `dunning_email_sent`, and log.
 */
export async function sendDunningEmail(args: SendDunningArgs): Promise<{ sent: boolean; reason?: string }> {
  const { subscriptionId, userId, email, step } = args;
  const locale = args.locale && VALID_LOCALES.includes(args.locale) ? args.locale : 'en';
  const fullName = args.fullName || email.split('@')[0] || 'Teacher';
  const portalUrl = billingPortalEmailUrl(locale);

  const tpl =
    step === 'day-5'
      ? teacherPaymentFailedDay5({
          full_name: fullName,
          locale,
          portalUrl,
        })
      : teacherPaymentFailed({
          full_name: fullName,
          locale,
          portalUrl,
          renewalDate: args.renewalDate ?? null,
        });

  const result = await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
  if (!result.ok) {
    logger.error(`[Dunning] ${step} send failed for ${email}: ${result.error}`);
    return { sent: false, reason: 'send-failed' };
  }

  const eventType = step === 'day-5' ? EVENT_DAY5 : EVENT_DAY1;
  const dayNumber = step === 'day-5' ? 5 : 1;

  await logSubscriptionEvent({
    userId,
    eventType,
    subscriptionId,
    payload: { email, locale, step, day: dayNumber },
  });

  if (userId) {
    try {
      captureProFunnelServerEvent(buildDunningEmailSentEvent(userId, dayNumber, subscriptionId));
    } catch {
      /* analytics never blocks billing */
    }
  }

  logger.log(`[Dunning] ${step} payment-failed email sent to ${email} (subscription ${subscriptionId})`);
  return { sent: true };
}

export async function maybeSendPaymentFailedEmail({
  payload,
  userId,
  forceStep,
}: {
  payload: any;
  userId?: string;
  forceStep?: DunningStep;
}): Promise<{ sent: boolean; reason?: string }> {
  const data = payload?.data ?? {};
  const subscriptionId = String(data.id ?? '');
  let email: string | undefined = data.customer?.email ?? undefined;

  const admin = createAdminClient();
  if (!admin) {
    logger.error('[Dunning] no service-role client; skipping');
    return { sent: false, reason: 'no-supabase-admin' };
  }

  // Fallback: If customer.email is absent from Polar webhook payload, lookup from teacher_access_requests by userId
  let fullName = email ? email.split('@')[0] : '';
  let locale: TeacherLocale = 'en';

  if (userId || email) {
    let query = admin.from('teacher_access_requests').select('user_id, email, full_name, locale');
    if (userId) query = query.eq('user_id', userId);
    else if (email) query = query.eq('email', email);

    const { data: accessRow } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accessRow) {
      if (!email && accessRow.email) email = accessRow.email;
      if (accessRow.full_name) fullName = accessRow.full_name;
      if (accessRow.locale && VALID_LOCALES.includes(accessRow.locale as TeacherLocale)) {
        locale = accessRow.locale as TeacherLocale;
      }
    }
  }

  if (!email) {
    logger.warn('[Dunning] subscription.past_due without email; cannot notify', { subscriptionId, userId });
    return { sent: false, reason: 'no-email' };
  }

  const nowMs = Date.now();
  let pastDueOnsetMs = resolvePastDueOnsetMs(data, nowMs);

  // Check what was already sent for this subscription
  const alreadySent: string[] = [];
  if (subscriptionId) {
    const { data: recent } = await admin
      .from('subscription_events')
      .select('event_type, created_at')
      .eq('subscription_id', subscriptionId)
      .in('event_type', [EVENT_DAY1, EVENT_DAY5, 'teacher_dunning_day1_email']);

    if (recent) {
      for (const r of recent) {
        if (r.event_type) alreadySent.push(r.event_type);
        if (r.event_type === EVENT_DAY1 && r.created_at) {
          const t = Date.parse(r.created_at);
          if (Number.isFinite(t)) pastDueOnsetMs = t;
        }
      }
    }
  }

  const step: DunningStep | null =
    forceStep ??
    pickDunningStep({
      status: dunningStatusFromPayload(payload),
      pastDueOnsetMs,
      nowMs,
      alreadySent,
    });

  if (!step) {
    return {
      sent: false,
      reason: dunningStatusFromPayload(payload) === 'past_due' ? 'deduped' : 'not-past-due',
    };
  }

  return sendDunningEmail({
    subscriptionId,
    userId,
    email,
    fullName: fullName || email.split('@')[0],
    locale,
    step,
    renewalDate: typeof data.modified_at === 'string' && data.modified_at ? data.modified_at : null,
  });
}

export interface DunningSweepItem {
  subscriptionId: string;
  userId?: string;
  email: string;
  step: DunningStep;
  sent: boolean;
  reason?: string;
}

/**
 * Sweep past_due subscriptions during daily cron (teacher-pro-churn-watch)
 * for a missed day-1 note. Day-5 is not sent from this sweep.
 */
export async function processDunningForPastDueSubs(
  subs: TeacherProSubSnapshot[],
  options?: { dry?: boolean; nowMs?: number },
): Promise<{ processed: number; items: DunningSweepItem[] }> {
  const pastDueSubs = subs.filter((s) => s.status === 'past_due');
  if (pastDueSubs.length === 0) {
    return { processed: 0, items: [] };
  }

  const admin = createAdminClient();
  if (!admin) {
    logger.error('[Dunning Sweep] no service-role client; skipping');
    return { processed: 0, items: [] };
  }

  const nowMs = options?.nowMs ?? Date.now();
  const items: DunningSweepItem[] = [];

  for (const sub of pastDueSubs) {
    let email = sub.email?.trim();
    let userId: string | undefined;
    let fullName = email ? email.split('@')[0] : '';
    let locale: TeacherLocale = 'en';

    // Lookup in subscriptions table by provider_subscription_id
    const { data: subRow } = await admin
      .from('subscriptions')
      .select('user_id, provider_event_at, current_period_end')
      .eq('lemon_squeezy_subscription_id', sub.id)
      .limit(1)
      .maybeSingle();

    if (subRow?.user_id) userId = subRow.user_id;

    if (userId || email) {
      let q = admin.from('teacher_access_requests').select('user_id, email, full_name, locale');
      if (userId) q = q.eq('user_id', userId);
      else if (email) q = q.eq('email', email);

      const { data: access } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (access) {
        if (!email && access.email) email = access.email;
        if (!userId && access.user_id) userId = access.user_id;
        if (access.full_name) fullName = access.full_name;
        if (access.locale && VALID_LOCALES.includes(access.locale as TeacherLocale)) {
          locale = access.locale as TeacherLocale;
        }
      }
    }

    if (!email) {
      logger.warn('[Dunning Sweep] past_due sub without email; skipping', { subId: sub.id });
      continue;
    }

    // Read alreadySent events
    const { data: events } = await admin
      .from('subscription_events')
      .select('event_type, created_at')
      .eq('subscription_id', sub.id)
      .in('event_type', [EVENT_DAY1, EVENT_DAY5, 'teacher_dunning_day1_email']);

    const alreadySent = (events ?? []).map((e) => e.event_type);
    let pastDueOnsetMs = resolvePastDueOnsetMs(
      {
        provider_event_at: subRow?.provider_event_at,
        current_period_end: sub.currentPeriodEnd ?? subRow?.current_period_end,
        startedAt: sub.startedAt,
      },
      nowMs,
    );

    const day1Event = (events ?? []).find((e) => e.event_type === EVENT_DAY1);
    if (day1Event?.created_at) {
      const t = Date.parse(day1Event.created_at);
      if (Number.isFinite(t)) pastDueOnsetMs = t;
    }

    const step = pickDunningStep({
      status: 'past_due',
      pastDueOnsetMs,
      nowMs,
      alreadySent,
    });

    if (!step) continue;

    if (options?.dry) {
      items.push({
        subscriptionId: sub.id,
        userId,
        email,
        step,
        sent: false,
        reason: 'dry-run',
      });
      continue;
    }

    const res = await sendDunningEmail({
      subscriptionId: sub.id,
      userId,
      email,
      fullName,
      locale,
      step,
      renewalDate: sub.currentPeriodEnd,
    });

    items.push({
      subscriptionId: sub.id,
      userId,
      email,
      step,
      sent: res.sent,
      reason: res.reason,
    });
  }

  return { processed: items.length, items };
}
