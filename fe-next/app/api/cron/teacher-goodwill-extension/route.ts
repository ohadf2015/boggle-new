import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { teacherGoodwillExtension } from '@/lib/email/templates/teacherGoodwillExtension';
import { planTrialExtension, type ExtendableRow } from '@/lib/education/trialExtension';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

/**
 * POST /api/cron/teacher-goodwill-extension
 *
 * One-shot goodwill run: every approved teacher gets +14 trial days and an
 * email saying why, because "Open Teacher Dashboard" reloaded the page instead
 * of opening the dashboard.
 *
 * Not really a cron — it lives here because this is where the CRON_SECRET auth,
 * the redis lock and the `?dry=1` plan preview already are, and a bulk send to
 * real teachers needs all three. Re-running it is safe: `planTrialExtension`
 * skips any row already marked, so the second run sends nothing.
 *
 * `?dry=1` returns exactly who would be mailed with their new deadline, and
 * writes nothing.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const locked = await withCronLock('teacher-goodwill-extension', 300_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        logger.error('[Goodwill] no service-role client; skipping');
        return { sent: 0, failed: 0, due: 0, reason: 'no-supabase-admin' };
      }

      const { data, error } = await supabase
        .from('teacher_access_requests')
        .select('id, email, user_id, full_name, locale, created_at, trial_expires_at, trial_reminders_sent')
        .eq('status', 'approved');
      if (error) throw new Error(`teacher_access_requests select failed: ${error.message}`);

      const plans = planTrialExtension((data ?? []) as ExtendableRow[], Date.now());
      logger.log(`[Goodwill] ${plans.length} teachers due an extension${dry ? ' (dry run)' : ''}`);

      // A run that finds nobody is either "already done" or a broken query, and
      // those look identical from the outside — say which one out loud.
      if (plans.length === 0) {
        logger.warn(`[Goodwill] nothing to do over ${data?.length ?? 0} approved rows`);
      }

      if (dry) {
        return {
          dry: true,
          due: plans.length,
          approvedRows: data?.length ?? 0,
          plan: plans.map(({ row, newExpiresAt }) => ({
            id: row.id,
            email: row.email,
            locale: row.locale,
            was: row.trial_expires_at,
            now: newExpiresAt,
          })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const { row, newExpiresAt, newRemindersSent } of plans) {
        // Extend FIRST: the email names the new deadline, so a send that
        // precedes a failed write would promise days the teacher does not have.
        const { error: extendError } = await supabase
          .from('teacher_access_requests')
          .update({
            trial_expires_at: newExpiresAt,
            trial_reminders_sent: newRemindersSent,
          })
          .eq('id', row.id);
        if (extendError) {
          failed++;
          logger.error(`[Goodwill] extend failed for ${row.id}: ${extendError.message}`);
          continue;
        }

        const tpl = teacherGoodwillExtension({
          full_name: row.full_name,
          locale: row.locale,
          newExpiresAt,
        });
        const result = await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });
        if (!result.ok) {
          failed++;
          // The extension stands either way — it is the part that helps them.
          logger.error(`[Goodwill] extended ${row.id} but email failed: ${result.error}`);
          continue;
        }
        sent++;
      }

      logger.log(`[Goodwill] Completed: ${sent} sent, ${failed} failed of ${plans.length} due`);
      return { due: plans.length, sent, failed };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Goodwill] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-goodwill-extension',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Failed to run goodwill extension' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
