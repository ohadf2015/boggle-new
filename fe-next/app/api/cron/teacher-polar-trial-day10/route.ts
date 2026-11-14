import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { teacherPolarTrialDay10 } from '@/lib/email/templates/teacherPolarTrialDay10';
import { teacherPolarTrialDayBefore } from '@/lib/email/templates/teacherPolarTrialDayBefore';
import {
  POLAR_TRIAL_DAY_BEFORE_BUCKET,
  pickPolarTrialDayBefore,
} from '@/lib/education/polarTrialDayBefore';
import {
  POLAR_TRIAL_DAY10_BUCKET,
  pickPolarTrialDay10Nudge,
} from '@/lib/education/polarTrialDay10';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
import type { TeacherLocale } from '@/lib/education/types';
import {
  buildPolarTrialDay10SentEvent,
  captureProFunnelServerEvent,
} from '@/lib/education/proFunnelServer';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

/**
 * POST /api/cron/teacher-polar-trial-day10
 *
 * Daily: email teachers on a live Polar 14-day Teacher Pro trial once they
 * hit day 10 (4 days remaining), linking at /teacher/upgrade (Polar checkout).
 * The same run sends the day-before notice: the trial converts to $9/mo on the
 * card they added, so in the last 36 hours they hear when, how much, and how to
 * cancel. That notice wins over a not-yet-sent day-10 email (one email a run).
 * Distinct from /api/cron/teacher-trial-reminders (access-trial clock).
 *
 * Idempotency: subscription_events.event_type = 'polar_trial_day10_sent'
 * (day-10) and 'polar_trial_day_before_sent' (day-before).
 * `?dry=1` plans and sends nothing.
 */

const DAY10_EVENT = 'polar_trial_day10_sent';
const DAY_BEFORE_EVENT = 'polar_trial_day_before_sent';

interface SubRow {
  user_id: string;
  tier: string;
  status: string;
  source: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
}

type Bucket = typeof POLAR_TRIAL_DAY10_BUCKET | typeof POLAR_TRIAL_DAY_BEFORE_BUCKET;

interface AccessRow {
  user_id: string;
  email: string;
  full_name: string;
  locale: string | null;
}

const LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function asLocale(raw: string | null | undefined): TeacherLocale {
  return LOCALES.includes(raw as TeacherLocale) ? (raw as TeacherLocale) : 'en';
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const locked = await withCronLock('teacher-polar-trial-day10', 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('no service-role client');

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, tier, status, source, current_period_end, cancel_at_period_end')
        .eq('tier', 'pro')
        .eq('status', 'trialing');
      if (subError) throw new Error(`subscriptions select failed: ${subError.message}`);

      const subs = (subData ?? []) as SubRow[];
      const userIds = subs.map((s) => s.user_id).filter(Boolean);
      if (userIds.length === 0) {
        return { sent: 0, failed: 0, due: 0 };
      }

      const { data: sentRows, error: sentError } = await supabase
        .from('subscription_events')
        .select('user_id, event_type')
        .in('event_type', [DAY10_EVENT, DAY_BEFORE_EVENT])
        .in('user_id', userIds);
      if (sentError) throw new Error(`subscription_events select failed: ${sentError.message}`);
      const sentDay10 = new Set<string>();
      const sentDayBefore = new Set<string>();
      for (const r of (sentRows ?? []) as Array<{ user_id: string | null; event_type: string }>) {
        if (!r.user_id) continue;
        (r.event_type === DAY_BEFORE_EVENT ? sentDayBefore : sentDay10).add(r.user_id);
      }

      const { data: accessData, error: accessError } = await supabase
        .from('teacher_access_requests')
        .select('user_id, email, full_name, locale')
        .eq('status', 'approved')
        .in('user_id', userIds);
      if (accessError) throw new Error(`teacher_access_requests select failed: ${accessError.message}`);

      const accessByUser = new Map<string, AccessRow>();
      for (const row of (accessData ?? []) as AccessRow[]) {
        if (!row.user_id || !row.email) continue;
        if (!accessByUser.has(row.user_id)) accessByUser.set(row.user_id, row);
      }

      const now = Date.now();
      const due: Array<{ sub: SubRow; access: AccessRow; daysLeft: number; bucket: Bucket }> = [];
      const seenEmail = new Set<string>();
      for (const sub of subs) {
        const access = accessByUser.get(sub.user_id);
        if (!access) continue;
        const emailKey = access.email.trim().toLowerCase();
        if (seenEmail.has(emailKey)) continue;
        const alreadySent = [
          ...(sentDay10.has(sub.user_id) ? [POLAR_TRIAL_DAY10_BUCKET] : []),
          ...(sentDayBefore.has(sub.user_id) ? [POLAR_TRIAL_DAY_BEFORE_BUCKET] : []),
        ];
        const signals = {
          tier: sub.tier,
          status: sub.status,
          source: sub.source,
          currentPeriodEnd: sub.current_period_end,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? null,
          alreadySent,
          nowMs: now,
        };
        const dayBefore = pickPolarTrialDayBefore(signals);
        // Inside the last 36 hours the day-before notice is the one email; a late day-10 would repeat it.
        const inFinalWindow = dayBefore !== null || alreadySent.includes(POLAR_TRIAL_DAY_BEFORE_BUCKET);
        // Both emails say "$9 unless you cancel": a teacher who already cancelled gets neither.
        const cancelled = sub.cancel_at_period_end === true;
        const bucket: Bucket | null =
          dayBefore ?? (inFinalWindow || cancelled ? null : pickPolarTrialDay10Nudge(signals));
        if (!bucket) {
          if (alreadySent.length) seenEmail.add(emailKey);
          continue;
        }
        const daysLeft = polarTrialDaysLeft(sub.current_period_end, now);
        if (daysLeft === null) continue;
        seenEmail.add(emailKey);
        due.push({ sub, access, daysLeft, bucket });
      }

      logger.log(
        `[Polar Day10] ${due.length} teachers due a Polar trial day-10 nudge${dry ? ' (dry run)' : ''}`,
      );

      if (dry) {
        return {
          dry: true,
          due: due.length,
          plan: due.map(({ access, sub, daysLeft, bucket }) => ({
            bucket,
            user_id: sub.user_id,
            email: access.email,
            locale: asLocale(access.locale),
            expires: sub.current_period_end,
            daysLeft,
          })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const { sub, access, daysLeft, bucket } of due) {
        const locale = asLocale(access.locale);
        const isDayBefore = bucket === POLAR_TRIAL_DAY_BEFORE_BUCKET;
        const tpl = isDayBefore
          ? teacherPolarTrialDayBefore({
              full_name: access.full_name || 'Teacher',
              locale,
              chargeAt: sub.current_period_end!,
            })
          : teacherPolarTrialDay10({
              full_name: access.full_name || 'Teacher',
              locale,
              trialExpiresAt: sub.current_period_end!,
              daysLeft,
            });
        const result = await sendEmail({ to: access.email, subject: tpl.subject, html: tpl.html });
        if (!result.ok) {
          failed++;
          logger.error(`[Polar Day10] send failed for ${sub.user_id}: ${result.error}`);
          continue;
        }
        const { error: markError } = await supabase.from('subscription_events').insert({
          user_id: sub.user_id,
          event_type: isDayBefore ? DAY_BEFORE_EVENT : DAY10_EVENT,
          subscription_id: null,
          payload: { bucket, days_left: daysLeft },
        });
        if (markError) {
          logger.error(`[Polar Day10] sent to ${sub.user_id} but could not mark it: ${markError.message}`);
        }
        try {
          if (!isDayBefore) captureProFunnelServerEvent(buildPolarTrialDay10SentEvent(sub.user_id, daysLeft));
        } catch {
          /* analytics must never block the send ledger */
        }
        sent++;
      }

      logger.log(`[Polar Day10] Completed: ${sent} sent, ${failed} failed of ${due.length} due`);
      return { due: due.length, sent, failed };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Polar Day10] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-polar-trial-day10',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'Failed to send Polar trial day-10 nudges' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
