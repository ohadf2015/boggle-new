import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { teacherActivationNudge } from '@/lib/email/templates/teacherActivationNudge';
import { planActivationNudges, type ActivationNudgeRow } from '@/lib/education/activationNudge';
import { proUserIdsFrom, type SubscriptionRowLike } from '@/lib/education/proGrant';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

/**
 * POST /api/cron/teacher-activation-nudge
 *
 * Daily: approved teachers with no classroom get a "make your first class" email on
 * day 1, 3 and 7 after approval. Skips test accounts and teachers who already have Pro.
 *
 * Idempotency: `teacher_access_requests.activation_nudges_sent`, merged across every row
 * of one email address and appended only after a confirmed send.
 *
 * Security: CRON_SECRET via x-cron-secret header or Authorization: Bearer.
 * `?dry=1` returns exactly who would be emailed and sends nothing.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const locked = await withCronLock('teacher-activation-nudge', 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        logger.error('[Activation Nudge] no service-role client; skipping');
        return { sent: 0, failed: 0, due: 0, reason: 'no-supabase-admin' };
      }

      const { data, error } = await supabase
        .from('teacher_access_requests')
        .select('id, user_id, email, full_name, locale, reviewed_at, activation_nudges_sent')
        .eq('status', 'approved')
        .not('reviewed_at', 'is', null);
      if (error) throw new Error(`teacher_access_requests select failed: ${error.message}`);

      const rows = (data ?? []) as ActivationNudgeRow[];
      const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];

      const classroomTeacherIds = new Set<string>();
      const testUserIds = new Set<string>();
      let proUserIds = new Set<string>();
      if (userIds.length > 0) {
        const [classes, profiles, subs] = await Promise.all([
          supabase.from('classrooms').select('teacher_id').in('teacher_id', userIds),
          supabase.from('profiles').select('id, is_test_account').in('id', userIds).eq('is_test_account', true),
          supabase
            .from('subscriptions')
            .select('user_id, tier, status, source, current_period_end')
            .in('user_id', userIds),
        ]);
        // Fail closed: an unknown exclusion would email a teacher who already has a class or Pro.
        if (classes.error) throw new Error(`classrooms select failed: ${classes.error.message}`);
        if (profiles.error) throw new Error(`profiles select failed: ${profiles.error.message}`);
        if (subs.error) throw new Error(`subscriptions select failed: ${subs.error.message}`);

        for (const c of (classes.data ?? []) as Array<{ teacher_id: string }>) classroomTeacherIds.add(c.teacher_id);
        for (const p of (profiles.data ?? []) as Array<{ id: string; is_test_account: boolean | null }>) {
          if (p.is_test_account) testUserIds.add(p.id);
        }
        proUserIds = proUserIdsFrom((subs.data ?? []) as Array<SubscriptionRowLike & { user_id: string }>, Date.now());
      }

      const { due, skipped: excluded } = planActivationNudges(rows, { classroomTeacherIds, testUserIds, proUserIds }, Date.now());

      logger.log(
        `[Activation Nudge] ${due.length} teachers due${dry ? ' (dry run)' : ''}; skipped ` +
          `${excluded.hasClassroom} with a class, ${excluded.hasPro} on Pro, ${excluded.testAccount} test`,
      );

      if (dry) {
        return {
          dry: true,
          due: due.length,
          excluded,
          plan: due.map((d) => ({ email: d.email, locale: d.locale, bucket: d.bucket, rows: d.rowIds.length })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const d of due) {
        const tpl = teacherActivationNudge({ full_name: d.full_name, locale: d.locale, bucket: d.bucket });
        const result = await sendEmail({ to: d.email, subject: tpl.subject, html: tpl.html, replyTo: tpl.replyTo });
        if (!result.ok) {
          failed++;
          logger.error(`[Activation Nudge] send failed for ${d.email} (${d.bucket}): ${result.error}`);
          continue;
        }
        const { error: markError } = await supabase
          .from('teacher_access_requests')
          .update({ activation_nudges_sent: [...d.alreadySent, d.bucket] })
          .in('id', d.rowIds);
        if (markError) {
          logger.error(`[Activation Nudge] sent ${d.bucket} to ${d.email} but could not mark it: ${markError.message}`);
        }
        sent++;
      }

      logger.log(`[Activation Nudge] Completed: ${sent} sent, ${failed} failed of ${due.length} due`);
      return { due: due.length, sent, failed, excluded };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Activation Nudge] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-activation-nudge',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'Failed to send activation nudges' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
