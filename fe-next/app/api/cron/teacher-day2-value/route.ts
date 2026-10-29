import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherDay2Value } from '@/lib/email/templates/teacherDay2Value';
import {
  DAY2_KIND,
  DAY2_MAX_HOURS,
  DAY2_PERIOD,
  isTrialConvertedEvent,
  planDay2ValueEmails,
  type Day2Classroom,
  type Day2Membership,
  type Day2Session,
  type Day2Teacher,
} from '@/lib/education/day2ValueEmail';
import { claimSend, loadLedger, releaseSend, writeHeartbeat } from '@/lib/education/lifecycleLedger';
import { proUserIdsFrom, type SubscriptionRowLike } from '@/lib/education/proGrant';
import { fetchInChunks, fetchPaged } from '@/lib/education/pro/fetchAll';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

/**
 * POST /api/cron/teacher-day2-value
 *
 * Hourly: one email, 48h to 7d after a teacher creates their first classroom,
 * to an approved teacher with a verified email. Body is "N students joined,
 * M games played" plus the progress report and the Teacher Pro CTA.
 * Skips Teacher Pro, a trial that already converted, test accounts, and anyone
 * already sent. `?dry=1` plans and sends nothing.
 *
 * Idempotency: teacher_lifecycle_sends (kind day2_value, period once), claimed
 * before the send and released if the provider rejects it.
 */

const HOUR_MS = 60 * 60 * 1000;
const JOB = 'teacher-day2-value';

interface AccessRow {
  user_id: string | null;
  email: string;
  full_name: string | null;
  locale: string | null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const dry = request.nextUrl.searchParams.get('dry') === '1';

  try {
    const locked = await withCronLock(JOB, 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('no service-role client');
      const nowMs = Date.now();
      const since = new Date(nowMs - DAY2_MAX_HOURS * HOUR_MS).toISOString();

      const recent = await fetchPaged<{ teacher_id: string | null }>(
        supabase, 'classrooms', 'id, teacher_id',
        [{ op: 'gte', column: 'created_at', value: since }, { op: 'notNull', column: 'teacher_id' }],
      );
      if (recent.error) throw new Error(`classrooms select failed: ${recent.error.message}`);
      const candidateIds = [...new Set(recent.data.map((row) => row.teacher_id).filter((id): id is string => Boolean(id)))];
      if (candidateIds.length === 0) {
        if (!dry) await writeHeartbeat(supabase, JOB, { sent: 0, due: 0 }, new Date(nowMs));
        return { sent: 0, failed: 0, due: 0 };
      }

      const [rooms, access, profiles, subs, events] = await Promise.all([
        fetchInChunks<{ id: string; teacher_id: string; created_at: string }>(
          supabase, 'classrooms', 'id, teacher_id, created_at', 'teacher_id', candidateIds,
        ),
        fetchInChunks<AccessRow>(
          supabase, 'teacher_access_requests', 'id, user_id, email, full_name, locale', 'user_id', candidateIds,
          [{ op: 'eq', column: 'status', value: 'approved' }],
        ),
        fetchInChunks<{ id: string; is_test_account: boolean | null; user_role: string | null }>(
          supabase, 'profiles', 'id, is_test_account, user_role', 'id', candidateIds,
        ),
        fetchInChunks<SubscriptionRowLike & { user_id: string }>(
          supabase, 'subscriptions', 'id, user_id, tier, status, source, current_period_end', 'user_id', candidateIds,
        ),
        fetchInChunks<{ user_id: string; event_type: string }>(
          supabase, 'subscription_events', 'id, user_id, event_type', 'user_id', candidateIds,
        ),
      ]);
      if (rooms.error) throw new Error(`classrooms select failed: ${rooms.error.message}`);
      if (access.error) throw new Error(`teacher_access_requests select failed: ${access.error.message}`);
      if (profiles.error) throw new Error(`profiles select failed: ${profiles.error.message}`);
      if (subs.error) throw new Error(`subscriptions select failed: ${subs.error.message}`);
      if (events.error) throw new Error(`subscription_events select failed: ${events.error.message}`);

      const roleById = new Map(profiles.data.map((row) => [row.id, row.user_role]));
      const approved = (access.data ?? []).filter((row): row is AccessRow & { user_id: string } => Boolean(row.user_id && row.email));
      const teachers: Day2Teacher[] = [];
      let notTeacher = 0;
      const seenUser = new Set<string>();
      for (const row of approved) {
        if (seenUser.has(row.user_id)) continue;
        seenUser.add(row.user_id);
        if (roleById.get(row.user_id) !== 'teacher') {
          notTeacher++;
          continue;
        }
        teachers.push({
          userId: row.user_id,
          email: row.email,
          fullName: row.full_name || 'Teacher',
          locale: row.locale,
        });
      }

      const ledger = await loadLedger(supabase, teachers.map((t) => t.userId));
      const classrooms: Day2Classroom[] = rooms.data.map((row) => ({
        id: row.id, teacherId: row.teacher_id, createdAt: row.created_at,
      }));
      const classroomIds = classrooms.map((room) => room.id);
      const [members, sessions] = await Promise.all([
        fetchInChunks<{ classroom_id: string; student_id: string }>(
          supabase, 'classroom_memberships', 'id, classroom_id, student_id', 'classroom_id', classroomIds,
        ),
        fetchInChunks<{ classroom_id: string | null; student_id: string | null; completed_at: string | null }>(
          supabase, 'practice_sessions', 'id, classroom_id, student_id, completed_at', 'classroom_id', classroomIds,
          [{ op: 'notNull', column: 'completed_at' }],
        ),
      ]);
      if (members.error) throw new Error(`classroom_memberships select failed: ${members.error.message}`);
      if (sessions.error) throw new Error(`practice_sessions select failed: ${sessions.error.message}`);

      const plan = planDay2ValueEmails({
        teachers,
        classrooms,
        memberships: members.data.map((row): Day2Membership => ({ classroomId: row.classroom_id, studentId: row.student_id })),
        sessions: sessions.data
          .filter((row) => row.classroom_id && row.completed_at)
          .map((row): Day2Session => ({ classroomId: row.classroom_id as string, studentId: row.student_id })),
        proUserIds: proUserIdsFrom(subs.data, nowMs),
        convertedUserIds: new Set(events.data.filter((row) => isTrialConvertedEvent(row.event_type)).map((row) => row.user_id)),
        alreadySentUserIds: new Set(ledger.filter((row) => row.kind === DAY2_KIND && row.period_key === DAY2_PERIOD).map((row) => row.user_id)),
        testUserIds: new Set(profiles.data.filter((row) => row.is_test_account).map((row) => row.id)),
        nowMs,
      });

      const audience = await loadLifecycleAudience(supabase, plan.due.map((d) => d.userId), { mint: !dry });
      let unsubscribed = 0;
      let unreachable = 0;
      const due: Array<(typeof plan.due)[number] & { token: string }> = [];
      for (const row of plan.due) {
        const reach = reachFor(audience, [row.userId]);
        if ('skip' in reach) {
          if (reach.skip === 'unsubscribed') unsubscribed++;
          else unreachable++;
          continue;
        }
        due.push({ ...row, token: reach.token });
      }
      const skipped = { ...plan.skipped, notTeacher, unsubscribed, unreachable };
      logger.log(`[Day2 Value] ${due.length} teachers due${dry ? ' (dry run)' : ''}; skipped ${JSON.stringify(skipped)}`);

      if (dry) {
        return {
          dry: true,
          due: due.length,
          ...skipped,
          plan: due.map((row) => ({
            user_id: row.userId,
            email: row.email,
            locale: row.locale,
            students_joined: row.studentsJoined,
            games_played: row.gamesPlayed,
          })),
        };
      }

      let sent = 0;
      let failed = 0;
      let claimed = 0;
      for (const row of due) {
        const key = { userId: row.userId, kind: DAY2_KIND, periodKey: DAY2_PERIOD };
        if (!await claimSend(supabase, key)) {
          claimed++;
          continue;
        }
        const tpl = teacherDay2Value({
          fullName: row.fullName,
          locale: row.locale,
          studentsJoined: row.studentsJoined,
          gamesPlayed: row.gamesPlayed,
        });
        const result = await sendLifecycleEmail({
          to: row.email,
          subject: tpl.subject,
          html: tpl.html,
          replyTo: tpl.replyTo,
          locale: row.locale,
          token: row.token,
        });
        if (!result.ok) {
          failed++;
          logger.error(`[Day2 Value] send failed for ${row.userId}: ${result.error}`);
          await releaseSend(supabase, key);
          continue;
        }
        sent++;
      }

      await writeHeartbeat(supabase, JOB, { sent, failed, due: due.length }, new Date(nowMs));
      logger.log(`[Day2 Value] Completed: ${sent} sent, ${failed} failed of ${due.length} due`);
      return { due: due.length, sent, failed, claimed, ...skipped };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Day2 Value] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-day2-value',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: 'Failed to send day-2 value emails' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
