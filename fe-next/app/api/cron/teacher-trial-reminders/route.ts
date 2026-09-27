import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { teacherTrialReminder } from '@/lib/email/templates/teacherTrialReminder';
import { pickTrialReminder, dedupeDueByEmail } from '@/lib/education/trialReminders';
import type { TeacherLocale } from '@/lib/education/types';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

/**
 * POST /api/cron/teacher-trial-reminders
 *
 * Daily cron: the only moment a teacher is actually asked to pay. Sends one
 * email per teacher per run at T-3d / T-0 / T+3d around `trial_expires_at`,
 * each linking straight at /teacher/upgrade.
 *
 * Before this existed, every trial died in silence — 8 had already lapsed with
 * nothing sent and subscriptions/subscription_events were both empty.
 *
 * Idempotency is the `trial_reminders_sent` array on the row, not the schedule:
 * a bucket is appended after a confirmed send, and pickTrialReminder never
 * returns a bucket that is already in it. Running this twice in a day, or
 * catching up after a missed day, sends nothing extra.
 *
 * That array is per ROW, which is not the same as per PERSON — a teacher who submitted the
 * access form twice owns two approved rows and would be reminded once per row. So the due list
 * is passed through `dedupeDueByEmail` before anything is sent, and the number collapsed is
 * logged rather than swallowed: if it starts climbing, duplicate access requests are being
 * created again and the real fix belongs upstream at the form.
 *
 * Security: CRON_SECRET via x-cron-secret header or Authorization: Bearer.
 * `?dry=1` returns exactly who would be emailed and sends nothing.
 */
interface Row {
  id: string;
  email: string;
  full_name: string;
  locale: TeacherLocale;
  trial_expires_at: string | null;
  trial_reminders_sent: string[] | null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const locked = await withCronLock('teacher-trial-reminders', 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        logger.error('[Trial Cron] no service-role client; skipping');
        return { sent: 0, failed: 0, due: 0, reason: 'no-supabase-admin' };
      }

      const { data, error } = await supabase
        .from('teacher_access_requests')
        .select('id, email, full_name, locale, trial_expires_at, trial_reminders_sent')
        .eq('status', 'approved')
        .not('trial_expires_at', 'is', null);
      if (error) throw new Error(`teacher_access_requests select failed: ${error.message}`);

      const now = Date.now();
      const dueRows = (data as Row[])
        .map((row) => ({ row, bucket: pickTrialReminder(row.trial_expires_at, row.trial_reminders_sent, now) }))
        .filter((d): d is { row: Row; bucket: NonNullable<ReturnType<typeof pickTrialReminder>> } => d.bucket !== null);

      // One teacher, one email. `trial_reminders_sent` makes this idempotent per ROW, which is
      // wrong per PERSON: a teacher who submitted the access form twice owns two approved rows
      // and would be reminded once per row. Five addresses in production have duplicates, one
      // with three.
      const due = dedupeDueByEmail(dueRows);
      const collapsed = dueRows.length - due.length;

      logger.log(
        `[Trial Cron] ${due.length} teachers due a trial reminder${dry ? ' (dry run)' : ''}` +
          // Never let deduplication be silent — if this number climbs, duplicate access
          // requests are being created again and the fix belongs upstream at the form.
          (collapsed > 0 ? ` (${collapsed} duplicate row(s) collapsed)` : ''),
      );

      if (dry) {
        return {
          dry: true,
          due: due.length,
          plan: due.map(({ row, bucket }) => ({
            id: row.id,
            email: row.email,
            locale: row.locale,
            expires: row.trial_expires_at,
            bucket,
          })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const { row, bucket } of due) {
        const tpl = teacherTrialReminder({
          full_name: row.full_name,
          locale: row.locale,
          bucket,
          trialExpiresAt: row.trial_expires_at!,
        });
        const result = await sendEmail({ to: row.email, subject: tpl.subject, html: tpl.html });
        if (!result.ok) {
          failed++;
          logger.error(`[Trial Cron] send failed for ${row.id} (${bucket}): ${result.error}`);
          continue;
        }
        // Mark only after a confirmed send, so a Resend outage retries tomorrow
        // instead of burning the one chance to ask this teacher for the money.
        const { error: markError } = await supabase
          .from('teacher_access_requests')
          .update({ trial_reminders_sent: [...(row.trial_reminders_sent ?? []), bucket] })
          .eq('id', row.id);
        if (markError) {
          logger.error(`[Trial Cron] sent ${bucket} to ${row.id} but could not mark it: ${markError.message}`);
        }
        sent++;
      }

      logger.log(`[Trial Cron] Completed: ${sent} sent, ${failed} failed of ${due.length} due`);
      return { due: due.length, sent, failed };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Trial Cron] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-trial-reminders',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: 'Failed to send trial reminders' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
