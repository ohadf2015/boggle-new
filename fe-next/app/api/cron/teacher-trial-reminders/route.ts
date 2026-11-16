import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherTrialReminder } from '@/lib/email/templates/teacherTrialReminder';
import { teacherTrialFeedback } from '@/lib/email/templates/teacherTrialFeedback';
import { TEACHER_EMAIL_REPLY_TO } from '@/lib/email/templates/teacherEmailLayout';
import { pickTrialEmail, dedupeDueByEmail, TRIAL_FEEDBACK_BUCKET } from '@/lib/education/trialReminders';
import { proUserIdsFrom, type SubscriptionRowLike } from '@/lib/education/proGrant';
import { teacherIdsWithClassGame } from '@/lib/education/classGameHistory';
import { loadTrialClassResults } from '@/lib/education/trialClassResults';
import type { TeacherLocale } from '@/lib/education/types';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

/**
 * POST /api/cron/teacher-trial-reminders
 *
 * Daily cron: the only moment a teacher is actually asked to pay. Sends one
 * email per teacher per run at T-3d / T-0 / T+3d around `trial_expires_at`,
 * each linking straight at /teacher/upgrade (which opens the checkout on arrival) and
 * showing the teacher's own class results. Teachers who never ran a class game are
 * skipped: their 14 days start at the first class game.
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
 *
 * The same run also sends the one-time feedback check-in (`feedback` bucket) five
 * days into the free access, when the trial-ending emails are still at least five
 * days away. Replies to every email here go to Ohad.
 */
interface Row {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  locale: TeacherLocale;
  reviewed_at: string | null;
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
      if (!supabase) throw new Error('no service-role client');

      const { data, error } = await supabase
        .from('teacher_access_requests')
        .select('id, user_id, email, full_name, locale, reviewed_at, trial_expires_at, trial_reminders_sent')
        .eq('status', 'approved')
        .not('trial_expires_at', 'is', null);
      if (error) throw new Error(`teacher_access_requests select failed: ${error.message}`);

      const rows = data as Row[];
      const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];
      let proUserIds = new Set<string>();
      if (userIds.length > 0) {
        const { data: subRows, error: subError } = await supabase
          .from('subscriptions')
          .select('user_id, tier, status, source, current_period_end')
          .in('user_id', userIds);
        // Fail closed: an unknown entitlement would ask a paying teacher to pay again.
        if (subError) throw new Error(`subscriptions select failed: ${subError.message}`);
        proUserIds = proUserIdsFrom((subRows ?? []) as Array<SubscriptionRowLike & { user_id: string }>, Date.now());
      }
      const emailKey = (email: string) => (email ?? '').trim().toLowerCase();
      const proEmails = new Set(rows.filter((r) => r.user_id && proUserIds.has(r.user_id)).map((r) => emailKey(r.email)));

      const now = Date.now();
      const pickedRows = rows
        .map((row) => ({ row, bucket: pickTrialEmail(row.reviewed_at, row.trial_expires_at, row.trial_reminders_sent, now) }))
        .filter((d): d is { row: Row; bucket: NonNullable<ReturnType<typeof pickTrialEmail>> } => d.bucket !== null);
      // A teacher who never ran a class game is still waiting for their 14 days to start
      // (the trial restarts at the first class game), so no "ends soon / has ended" email
      // is true for them yet. Fails closed: an unknown history sends nothing this run.
      const playedIds = await teacherIdsWithClassGame(
        supabase,
        pickedRows.map((d) => d.row.user_id).filter((id): id is string => Boolean(id)),
      );
      const waitingEmails = new Set(
        pickedRows.filter((d) => !d.row.user_id || !playedIds.has(d.row.user_id)).map((d) => emailKey(d.row.email)),
      );
      const skippedWaiting = waitingEmails.size;
      const dueRows = pickedRows.filter((d) => !proEmails.has(emailKey(d.row.email)) && !waitingEmails.has(emailKey(d.row.email)));
      const skippedPro = new Set(
        pickedRows.filter((d) => proEmails.has(emailKey(d.row.email))).map((d) => emailKey(d.row.email)),
      ).size;

      // One teacher, one email. `trial_reminders_sent` makes this idempotent per ROW, which is
      // wrong per PERSON: a teacher who submitted the access form twice owns two approved rows
      // and would be reminded once per row. Five addresses in production have duplicates, one
      // with three.
      const deduped = dedupeDueByEmail(dueRows);
      const collapsed = dueRows.length - deduped.length;

      const userIdsByEmail = new Map<string, Array<string | null>>();
      for (const r of rows) {
        const list = userIdsByEmail.get(emailKey(r.email)) ?? [];
        list.push(r.user_id);
        userIdsByEmail.set(emailKey(r.email), list);
      }
      const audience = await loadLifecycleAudience(
        supabase,
        deduped.flatMap((d) => userIdsByEmail.get(emailKey(d.row.email)) ?? []).filter((id): id is string => Boolean(id)),
        { mint: !dry },
      );
      let unsubscribed = 0;
      let unreachable = 0;
      const due: Array<(typeof deduped)[number] & { token: string }> = [];
      for (const d of deduped) {
        const reach = reachFor(audience, userIdsByEmail.get(emailKey(d.row.email)) ?? []);
        if ('skip' in reach) {
          if (reach.skip === 'unsubscribed') unsubscribed++;
          else unreachable++;
          continue;
        }
        due.push({ ...d, token: reach.token });
      }

      logger.log(
        `[Trial Cron] ${due.length} teachers due a trial reminder${dry ? ' (dry run)' : ''}` +
          // Never let deduplication be silent — if this number climbs, duplicate access
          // requests are being created again and the fix belongs upstream at the form.
          (collapsed > 0 ? ` (${collapsed} duplicate row(s) collapsed)` : '') +
          (skippedPro > 0 ? ` (${skippedPro} already on Pro, skipped)` : '') +
          (skippedWaiting > 0 ? ` (${skippedWaiting} waiting for their first class game, skipped)` : '') +
          (unsubscribed > 0 ? ` (${unsubscribed} unsubscribed, skipped)` : '') +
          (unreachable > 0 ? ` (${unreachable} with no unsubscribe link, skipped)` : ''),
      );

      if (dry) {
        return {
          dry: true,
          due: due.length,
          skippedPro,
          skippedWaiting,
          unsubscribed,
          unreachable,
          plan: due.map(({ row, bucket }) => ({
            id: row.id,
            email: row.email,
            locale: row.locale,
            expires: row.trial_expires_at,
            bucket,
          })),
        };
      }

      // Each teacher's own class results go into the trial-ending emails (best effort).
      const resultsByTeacher = await loadTrialClassResults(
        supabase,
        due.filter((d) => d.bucket !== TRIAL_FEEDBACK_BUCKET).map((d) => d.row.user_id).filter((id): id is string => Boolean(id)),
      );

      let sent = 0;
      let failed = 0;
      for (const { row, bucket, token } of due) {
        const tpl =
          bucket === TRIAL_FEEDBACK_BUCKET
            ? teacherTrialFeedback({ full_name: row.full_name, locale: row.locale, trialExpiresAt: row.trial_expires_at! })
            : teacherTrialReminder({
                full_name: row.full_name,
                locale: row.locale,
                bucket,
                trialExpiresAt: row.trial_expires_at!,
                results: row.user_id ? resultsByTeacher.get(row.user_id) ?? null : null,
              });
        const result = await sendLifecycleEmail({
          to: row.email,
          subject: tpl.subject,
          html: tpl.html,
          locale: row.locale,
          token,
          replyTo: TEACHER_EMAIL_REPLY_TO,
        });
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
      return { due: due.length, sent, failed, skippedPro, skippedWaiting, unsubscribed, unreachable };
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
