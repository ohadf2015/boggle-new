import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { withCronLock } from '@/backend/redis/locking';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { TEACHER_EMAIL_REPLY_TO } from '@/lib/email/templates/teacherEmailLayout';
import { teacherPaymentFailed } from '@/lib/email/templates/teacherPaymentFailed';
import { teacherDunningEscalation } from '@/lib/email/templates/teacherDunningEscalation';
import { billingPortalEmailUrl } from '@/lib/education/billingPortal';
import {
  dunningDayFromEventType,
  dunningEmailEventType,
  dunningOnset,
  dunningRecoverEmailUrl,
  DUNNING_SENT_EVENT_TYPES,
  pickDunningDay,
  type DunningDay,
} from '@/lib/education/dunningEscalation';
import { buildDunningEmailSentEvent, captureProFunnelServerEvent } from '@/lib/education/proFunnelServer';
import { logSubscriptionEvent } from '@/lib/subscriptions';
import type { TeacherLocale } from '@/lib/education/types';
import { captureApiError } from '@/utils/sentry';
import logger from '@/utils/logger';

/**
 * GET/POST /api/cron/teacher-pro-dunning
 *
 * Grace-day follow-up to the subscription.past_due webhook email (day 0).
 * pg_cron job `teacher-pro-dunning` posts here daily. For each past_due
 * Teacher Pro row it enqueues at most one of:
 *   day 1  — the existing payment-failed note
 *   day 5  — the escalation, whose CTA is a signed recover link that mints a
 *            fresh Polar session and opens /portal/settings (the card form)
 *
 * Proof: every enqueue, dry or live, logs
 *   [Dunning] enqueued day-N email subscription=<id> user=<id>
 * Manual hook (sends nothing): `?hook=1` or `?dry=1` with the cron secret.
 * The marker is written only after a confirmed send, so a Resend miss retries
 * tomorrow instead of burning the one escalation.
 *
 * Security: CRON_SECRET via x-cron-secret or Authorization: Bearer.
 */

const JOB = 'teacher-pro-dunning';
const VALID_LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

interface SubRow {
  user_id: string | null;
  source: string | null;
  current_period_end: string | null;
  provider_event_at: string | null;
  lemon_squeezy_subscription_id: string | null;
}

interface EventRow {
  subscription_id: string | null;
  user_id: string | null;
  event_type: string;
}

interface AccessRow {
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  locale: string | null;
  created_at: string | null;
}

export interface DunningEnqueue {
  day: DunningDay;
  subscriptionId: string | null;
  userId: string;
}

function sentDays(subId: string | null, userId: string, events: EventRow[]): number[] {
  const days = new Set<number>();
  for (const ev of events) {
    const day = dunningDayFromEventType(ev.event_type);
    if (!day) continue;
    if (subId ? ev.subscription_id === subId : ev.user_id === userId) days.add(day);
  }
  return [...days];
}

async function run(dry: boolean, nowMs: number) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('no service-role client');

  const { data: subs, error } = await admin
    .from('subscriptions')
    .select('user_id, source, current_period_end, provider_event_at, lemon_squeezy_subscription_id')
    .eq('status', 'past_due')
    .eq('tier', 'pro');
  if (error) throw new Error(`subscriptions select failed: ${error.message}`);

  const rows = ((subs ?? []) as SubRow[]).filter((r) => r.user_id && r.source !== 'admin_grant');
  const userIds = [...new Set(rows.map((r) => r.user_id as string))];

  let events: EventRow[] = [];
  if (rows.length > 0) {
    const ev = await admin
      .from('subscription_events')
      .select('subscription_id, user_id, event_type')
      .in('event_type', [...DUNNING_SENT_EVENT_TYPES]);
    if (ev.error) throw new Error(`subscription_events select failed: ${ev.error.message}`);
    events = (ev.data ?? []) as EventRow[];
  }

  let access: AccessRow[] = [];
  if (userIds.length > 0) {
    const acc = await admin
      .from('teacher_access_requests')
      .select('user_id, email, full_name, locale, created_at')
      .in('user_id', userIds);
    if (acc.error) throw new Error(`teacher_access_requests select failed: ${acc.error.message}`);
    access = (acc.data ?? []) as AccessRow[];
  }

  const enqueued: DunningEnqueue[] = [];
  let sent = 0;
  let failed = 0;
  const secret = process.env.CRON_SECRET || '';

  for (const row of rows) {
    const userId = row.user_id as string;
    const subscriptionId = row.lemon_squeezy_subscription_id;
    const onset = dunningOnset(row.provider_event_at, row.current_period_end);
    const day = pickDunningDay(onset, sentDays(subscriptionId, userId, events), nowMs);
    if (!day) continue;

    const person = access
      .filter((a) => a.user_id === userId && a.email)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
    if (!person?.email) {
      logger.warn('[Dunning] past_due row has no teacher email; cannot enqueue', { userId, day });
      continue;
    }
    const locale: TeacherLocale = person.locale && VALID_LOCALES.includes(person.locale as TeacherLocale)
      ? (person.locale as TeacherLocale)
      : 'en';

    logger.log(`[Dunning] enqueued day-${day} email subscription=${subscriptionId || 'none'} user=${userId}`);
    enqueued.push({ day, subscriptionId, userId });
    if (dry) continue;

    const portalUrl = secret
      ? dunningRecoverEmailUrl({ userId, day, nowMs, secret, locale })
      : billingPortalEmailUrl(locale);
    if (!secret) logger.warn('[Dunning] CRON_SECRET missing; email link falls back to the signed-in portal route');

    const fullName = person.full_name || person.email.split('@')[0];
    const tpl = day === 5
      ? teacherDunningEscalation({ full_name: fullName, locale, portalUrl })
      : teacherPaymentFailed({ full_name: fullName, locale, portalUrl, renewalDate: onset });
    const result = await sendEmail({
      to: person.email,
      subject: tpl.subject,
      html: tpl.html,
      replyTo: TEACHER_EMAIL_REPLY_TO,
    });
    if (!result.ok) {
      failed += 1;
      logger.error(`[Dunning] day-${day} send failed for user ${userId}: ${result.error}`);
      continue;
    }
    sent += 1;
    await logSubscriptionEvent({
      userId,
      eventType: dunningEmailEventType(day),
      subscriptionId,
      payload: { day, locale },
    });
    captureProFunnelServerEvent(buildDunningEmailSentEvent(userId, day));
  }

  return { dry, enqueued, sent, failed };
}

async function handle(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const dry = params.get('dry') === '1' || params.get('hook') === '1';
  try {
    const locked = await withCronLock(JOB, 120_000, () => run(dry, Date.now()));
    if (locked.status === 'skipped') return NextResponse.json({ skipped: true, reason: locked.reason });
    return NextResponse.json(locked.result);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    captureApiError(error, JOB);
    logger.error('[Dunning] cron failed', error);
    return NextResponse.json({ error: 'dunning cron failed' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
