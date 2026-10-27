import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherAbandonedCheckout } from '@/lib/email/templates/teacherAbandonedCheckout';
import {
  ABANDONED_CHECKOUT_EMAIL_EVENT,
  ABANDONED_MAX_HOURS,
  CHECKOUT_STARTED_EVENT,
  abandonedCheckoutExcludedUserIds,
  planAbandonedCheckouts,
  type CheckoutStartedRow,
  type CheckoutUserEventRow,
} from '@/lib/education/abandonedCheckout';
import { accessTrialLive } from '@/lib/education/pro/keepAfterTrialCopy';
import { proUserIdsFrom, type SubscriptionRowLike } from '@/lib/education/proGrant';
import type { TeacherLocale } from '@/lib/education/types';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

/**
 * POST /api/cron/teacher-abandoned-checkout
 *
 * Hourly: one email to an approved teacher whose latest Teacher Pro checkout started
 * 1–24h ago and never completed, linking back to /teacher/upgrade for a fresh checkout.
 * Skips Pro, test accounts (profile flag or QA-looking email), non-teacher roles,
 * checkouts a script created, signups with neither an approved access request nor a classroom
 * (an approved teacher with no class yet IS emailed), unsubscribed teachers,
 * and anyone already sent one.
 * Every lookup fails closed: an error sends nothing.
 *
 * Idempotency: subscription_events.event_type = 'abandoned_checkout_email_sent'.
 * `?dry=1` plans and sends nothing.
 */

const HOUR_MS = 60 * 60 * 1000;
const LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

function asLocale(...candidates: Array<string | null | undefined>): TeacherLocale {
  for (const raw of candidates) if (LOCALES.includes(raw as TeacherLocale)) return raw as TeacherLocale;
  return 'en';
}

interface AccessRow {
  user_id: string;
  email: string;
  full_name: string;
  locale: string | null;
  trial_expires_at?: string | null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const locked = await withCronLock('teacher-abandoned-checkout', 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('no service-role client');

      const now = Date.now();
      const since = new Date(now - (ABANDONED_MAX_HOURS + 1) * HOUR_MS).toISOString();
      const { data: startedData, error: startedError } = await supabase
        .from('subscription_events')
        .select('id, user_id, created_at, payload')
        .eq('event_type', CHECKOUT_STARTED_EVENT)
        .gte('created_at', since);
      if (startedError) throw new Error(`checkout_started select failed: ${startedError.message}`);

      const started = (startedData ?? []) as CheckoutStartedRow[];
      const userIds = [...new Set(started.map((s) => s.user_id).filter((id): id is string => Boolean(id)))];
      if (userIds.length === 0) return { sent: 0, failed: 0, due: 0 };

      const [events, subs, profiles, access, classrooms] = await Promise.all([
        supabase.from('subscription_events').select('user_id, event_type, created_at').in('user_id', userIds),
        supabase.from('subscriptions').select('user_id, tier, status, source, current_period_end').in('user_id', userIds),
        supabase.from('profiles').select('id, is_test_account, user_role').in('id', userIds),
        supabase
          .from('teacher_access_requests')
          .select('user_id, email, full_name, locale, trial_expires_at')
          .eq('status', 'approved')
          .in('user_id', userIds),
        supabase.from('classrooms').select('teacher_id').in('teacher_id', userIds),
      ]);
      if (events.error) throw new Error(`subscription_events select failed: ${events.error.message}`);
      if (subs.error) throw new Error(`subscriptions select failed: ${subs.error.message}`);
      if (profiles.error) throw new Error(`profiles select failed: ${profiles.error.message}`);
      if (access.error) throw new Error(`teacher_access_requests select failed: ${access.error.message}`);
      if (classrooms.error) throw new Error(`classrooms select failed: ${classrooms.error.message}`);

      const proUserIds = proUserIdsFrom((subs.data ?? []) as Array<SubscriptionRowLike & { user_id: string }>, now);
      const accessByUser = new Map<string, AccessRow>();
      for (const row of (access.data ?? []) as AccessRow[]) {
        if (row.user_id && row.email && !accessByUser.has(row.user_id)) accessByUser.set(row.user_id, row);
      }
      const testUserIds = abandonedCheckoutExcludedUserIds({
        profiles: (profiles.data ?? []) as Array<{ id: string; is_test_account: boolean | null; user_role: string | null }>,
        emailsByUser: new Map([...accessByUser].map(([id, row]) => [id, row.email])),
        classroomTeacherIds: new Set(
          ((classrooms.data ?? []) as Array<{ teacher_id: string | null }>)
            .map((c) => c.teacher_id)
            .filter((id): id is string => Boolean(id)),
        ),
        userIds,
      });

      const plan = planAbandonedCheckouts({
        started,
        userEvents: (events.data ?? []) as CheckoutUserEventRow[],
        proUserIds,
        testUserIds,
        nowMs: now,
      });

      const teachers = plan.due.filter((d) => accessByUser.has(d.userId));
      const notTeacher = plan.due.length - teachers.length;
      const audience = await loadLifecycleAudience(supabase, teachers.map((d) => d.userId), { mint: !dry });
      let unsubscribed = 0;
      let unreachable = 0;
      const due: Array<(typeof teachers)[number] & { access: AccessRow; token: string; locale: TeacherLocale }> = [];
      const seenEmail = new Set<string>();
      for (const d of teachers) {
        const reach = reachFor(audience, [d.userId]);
        if ('skip' in reach) {
          if (reach.skip === 'unsubscribed') unsubscribed++;
          else unreachable++;
          continue;
        }
        const row = accessByUser.get(d.userId)!;
        const key = row.email.trim().toLowerCase();
        if (seenEmail.has(key)) continue;
        seenEmail.add(key);
        due.push({ ...d, access: row, token: reach.token, locale: asLocale(row.locale, d.locale) });
      }

      const skipped = { ...plan.skipped, notTeacher, unsubscribed, unreachable };
      logger.log(
        `[Abandoned Checkout] ${due.length} teachers due${dry ? ' (dry run)' : ''}; skipped ${JSON.stringify(skipped)}`,
      );

      if (dry) {
        return {
          dry: true,
          due: due.length,
          ...skipped,
          plan: due.map((d) => ({
            user_id: d.userId,
            email: d.access.email,
            locale: d.locale,
            mode: d.mode,
            started_at: d.startedAt,
          })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const d of due) {
        // Still inside the free access trial: the trial checkout was "keep Pro after
        // the trial", so the reminder must not pitch a second 14-day trial.
        // Free access trial already over: no trial at all, continue with Pro at $9/mo.
        const end = d.access.trial_expires_at;
        const accessEnded = typeof end === 'string' && Number.isFinite(Date.parse(end)) && !accessTrialLive(end);
        const mode = accessEnded ? 'ended' : d.mode === 'trial' && accessTrialLive(end) ? 'keep' : d.mode;
        const tpl = teacherAbandonedCheckout({ full_name: d.access.full_name || 'Teacher', locale: d.locale, mode });
        const result = await sendLifecycleEmail({
          to: d.access.email,
          subject: tpl.subject,
          html: tpl.html,
          replyTo: tpl.replyTo,
          locale: d.locale === 'he' ? 'he' : 'en',
          token: d.token,
        });
        if (!result.ok) {
          failed++;
          logger.error(`[Abandoned Checkout] send failed for ${d.userId}: ${result.error}`);
          continue;
        }
        const { error: markError } = await supabase.from('subscription_events').insert({
          user_id: d.userId,
          event_type: ABANDONED_CHECKOUT_EMAIL_EVENT,
          subscription_id: null,
          payload: { checkout_event_id: d.checkoutEventId },
        });
        if (markError) {
          logger.error(`[Abandoned Checkout] sent to ${d.userId} but could not mark it: ${markError.message}`);
        }
        sent++;
      }

      logger.log(`[Abandoned Checkout] Completed: ${sent} sent, ${failed} failed of ${due.length} due`);
      return { due: due.length, sent, failed, ...skipped };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Abandoned Checkout] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-abandoned-checkout',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'Failed to send abandoned checkout emails' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
