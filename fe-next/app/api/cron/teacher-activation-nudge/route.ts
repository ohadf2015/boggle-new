import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherActivationNudge } from '@/lib/email/templates/teacherActivationNudge';
import { teacherLifecycleNudge } from '@/lib/email/templates/teacherLifecycleNudge';
import { claimSend } from '@/lib/education/lifecycleLedger';
import { runLifecycleStageNudges } from '@/lib/education/lifecycleNudgeRunner';
import { alertIfDigestStale } from '@/lib/education/cronHeartbeatAlert';
import { planActivationNudges, type ActivationNudgeRow } from '@/lib/education/activationNudge';
import { proUserIdsFrom, type SubscriptionRowLike } from '@/lib/education/proGrant';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';
import { fetchInChunks, fetchPaged } from '@/lib/education/pro/fetchAll';

/**
 * POST /api/cron/teacher-activation-nudge
 *
 * Daily: approved teachers with no classroom get a "make your first class" email on
 * day 1, 3 and 7 after approval, and one reactivation email after day 14. Teachers with a
 * class get one stage nudge each (lifecycleNudges.ts), at most one nudge per 3 days. Skips
 * test accounts and unsubscribed teachers; the first-class emails also skip Pro. Also pages
 * the owner when the weekly digest heartbeat is older than 8 days.
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
      if (!supabase) throw new Error('no service-role client');
      const nowMs = Date.now();

      const access = await fetchPaged<ActivationNudgeRow>(
        supabase, 'teacher_access_requests', 'id, user_id, email, full_name, locale, reviewed_at, activation_nudges_sent',
        [{ op: 'eq', column: 'status', value: 'approved' }, { op: 'notNull', column: 'reviewed_at' }],
      );
      if (access.error) throw new Error(`teacher_access_requests select failed: ${access.error.message}`);

      const rows = access.data;
      const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];

      const [classes, profiles, subs] = await Promise.all([
        fetchInChunks<{ teacher_id: string }>(supabase, 'classrooms', 'id, teacher_id', 'teacher_id', userIds),
        fetchInChunks<{ id: string }>(supabase, 'profiles', 'id', 'id', userIds, [{ op: 'eq', column: 'is_test_account', value: true }]),
        fetchInChunks<SubscriptionRowLike & { user_id: string }>(
          supabase, 'subscriptions', 'id, user_id, tier, status, source, current_period_end', 'user_id', userIds,
        ),
      ]);
      // Fail closed: an unknown exclusion would email a teacher who already has a class or Pro.
      if (classes.error) throw new Error(`classrooms select failed: ${classes.error.message}`);
      if (profiles.error) throw new Error(`profiles select failed: ${profiles.error.message}`);
      if (subs.error) throw new Error(`subscriptions select failed: ${subs.error.message}`);
      const classroomTeacherIds = new Set(classes.data.map((c) => c.teacher_id));
      const testUserIds = new Set(profiles.data.map((p) => p.id));
      const proUserIds = proUserIdsFrom(subs.data, nowMs);

      const { due: planned, skipped: excluded } = planActivationNudges(rows, { classroomTeacherIds, testUserIds, proUserIds }, nowMs);

      const emailKey = (email: string) => (email ?? '').trim().toLowerCase();
      const userIdsByEmail = new Map<string, Array<string | null>>();
      for (const r of rows) {
        const list = userIdsByEmail.get(emailKey(r.email)) ?? [];
        list.push(r.user_id);
        userIdsByEmail.set(emailKey(r.email), list);
      }
      const audience = await loadLifecycleAudience(
        supabase,
        planned.flatMap((d) => userIdsByEmail.get(emailKey(d.email)) ?? []).filter((id): id is string => Boolean(id)),
        { mint: !dry },
      );
      let unsubscribed = 0;
      let unreachable = 0;
      const due: Array<(typeof planned)[number] & { token: string }> = [];
      for (const d of planned) {
        const reach = reachFor(audience, userIdsByEmail.get(emailKey(d.email)) ?? []);
        if ('skip' in reach) {
          if (reach.skip === 'unsubscribed') unsubscribed++;
          else unreachable++;
          continue;
        }
        due.push({ ...d, token: reach.token });
      }

      logger.log(
        `[Activation Nudge] ${due.length} teachers due${dry ? ' (dry run)' : ''}; skipped ` +
          `${excluded.hasClassroom} with a class, ${excluded.hasPro} on Pro, ${excluded.testAccount} test, ` +
          `${unsubscribed} unsubscribed, ${unreachable} with no unsubscribe link`,
      );

      if (dry) {
        return {
          dry: true,
          due: due.length,
          excluded,
          unsubscribed,
          unreachable,
          plan: due.map((d) => ({ email: d.email, locale: d.locale, bucket: d.bucket, rows: d.rowIds.length })),
          stages: await runLifecycleStageNudges(supabase, { rows, dry, nowMs }),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const d of due) {
        const tpl = d.bucket === 'reactivate'
          ? teacherLifecycleNudge({ fullName: d.full_name, locale: d.locale, stage: 'reactivate' })
          : teacherActivationNudge({ full_name: d.full_name, locale: d.locale, bucket: d.bucket });
        const result = await sendLifecycleEmail({
          to: d.email,
          subject: tpl.subject,
          html: tpl.html,
          replyTo: tpl.replyTo,
          locale: d.locale,
          token: d.token,
        });
        if (!result.ok) {
          failed++;
          logger.error(`[Activation Nudge] send failed for ${d.email} (${d.bucket}): ${result.error}`);
          continue;
        }
        sent++;
        const { error: markError } = await supabase
          .from('teacher_access_requests')
          .update({ activation_nudges_sent: [...d.alreadySent, d.bucket] })
          .in('id', d.rowIds);
        // Unmarked means tomorrow's run sends the same email again: stop and alert instead.
        if (markError) throw new Error(`sent ${d.bucket} to ${d.email} but could not mark it: ${markError.message}`);
        for (const userId of d.userIds) await claimSend(supabase, { userId, kind: `activation:${d.bucket}`, periodKey: 'once' });
      }

      logger.log(`[Activation Nudge] Completed: ${sent} sent, ${failed} failed of ${due.length} due`);
      const stages = await runLifecycleStageNudges(supabase, { rows, dry, nowMs });
      const digestHeartbeat = await alertIfDigestStale(supabase, nowMs);
      return { due: due.length, sent, failed, excluded, unsubscribed, unreachable, stages, digestHeartbeat };
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
