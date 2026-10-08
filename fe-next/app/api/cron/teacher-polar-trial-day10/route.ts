import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { teacherPolarTrialDay10 } from '@/lib/email/templates/teacherPolarTrialDay10';
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
 * Distinct from /api/cron/teacher-trial-reminders (access-trial clock).
 *
 * Idempotency: subscription_events.event_type = 'polar_trial_day10_sent'.
 * `?dry=1` plans and sends nothing.
 */

const DAY10_EVENT = 'polar_trial_day10_sent';

interface SubRow {
  user_id: string;
  tier: string;
  status: string;
  source: string | null;
  current_period_end: string | null;
}

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
      if (!supabase) {
        logger.error('[Polar Day10] no service-role client; skipping');
        return { sent: 0, failed: 0, due: 0, reason: 'no-supabase-admin' };
      }

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, tier, status, source, current_period_end')
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
        .select('user_id')
        .eq('event_type', DAY10_EVENT)
        .in('user_id', userIds);
      if (sentError) throw new Error(`subscription_events select failed: ${sentError.message}`);
      const already = new Set(
        ((sentRows ?? []) as Array<{ user_id: string | null }>)
          .map((r) => r.user_id)
          .filter((id): id is string => Boolean(id)),
      );

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
      const due: Array<{ sub: SubRow; access: AccessRow; daysLeft: number }> = [];
      const seenEmail = new Set<string>();
      for (const sub of subs) {
        const access = accessByUser.get(sub.user_id);
        if (!access) continue;
        const emailKey = access.email.trim().toLowerCase();
        if (seenEmail.has(emailKey)) continue;
        const alreadySent = already.has(sub.user_id) ? [POLAR_TRIAL_DAY10_BUCKET] : [];
        const bucket = pickPolarTrialDay10Nudge({
          tier: sub.tier,
          status: sub.status,
          source: sub.source,
          currentPeriodEnd: sub.current_period_end,
          alreadySent,
          nowMs: now,
        });
        if (!bucket) {
          if (alreadySent.length) seenEmail.add(emailKey);
          continue;
        }
        const daysLeft = polarTrialDaysLeft(sub.current_period_end, now);
        if (daysLeft === null) continue;
        seenEmail.add(emailKey);
        due.push({ sub, access, daysLeft });
      }

      logger.log(
        `[Polar Day10] ${due.length} teachers due a Polar trial day-10 nudge${dry ? ' (dry run)' : ''}`,
      );

      if (dry) {
        return {
          dry: true,
          due: due.length,
          plan: due.map(({ access, sub, daysLeft }) => ({
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
      for (const { sub, access, daysLeft } of due) {
        const locale = asLocale(access.locale);
        const tpl = teacherPolarTrialDay10({
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
          event_type: DAY10_EVENT,
          subscription_id: null,
          payload: { bucket: POLAR_TRIAL_DAY10_BUCKET, days_left: daysLeft },
        });
        if (markError) {
          logger.error(`[Polar Day10] sent to ${sub.user_id} but could not mark it: ${markError.message}`);
        }
        try {
          captureProFunnelServerEvent(buildPolarTrialDay10SentEvent(sub.user_id, daysLeft));
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
