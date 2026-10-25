import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { loadLifecycleAudience, reachFor, sendLifecycleEmail } from '@/lib/email/lifecycleUnsubscribe';
import { teacherWeeklyProgressDigest } from '@/lib/email/templates/teacherWeeklyProgressDigest';
import {
  assembleWeeklyDigests,
  isoWeekKey,
  type WeeklyAssignmentCompletionRow,
  type WeeklyClassroomRow,
  type WeeklyMembershipRow,
  type WeeklySessionRow,
  type WeeklyTeacherRow,
} from '@/lib/education/weeklyTeacherDigest';
import { WEEK_MS } from '@/lib/education/weeklyProgressDigest';
import { polarTrialDaysLeft } from '@/lib/education/polarTrial';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';
import { proUserIdsFrom, type SubscriptionRowLike } from '@/lib/education/proGrant';

/**
 * POST /api/cron/teacher-weekly-digest
 *
 * Monday morning: one 7-day completion/accuracy email per teacher who has a
 * classroom, with a Polar CTA at /{locale}/teacher/upgrade for free teachers.
 *
 * Security: CRON_SECRET via x-cron-secret or Authorization: Bearer.
 * `?dry=1` returns who would be emailed and sends nothing.
 */

interface AccessRow {
  user_id: string | null;
  email: string;
  full_name: string;
  locale: string | null;
}

interface SessionQueryRow {
  classroom_id: string | null;
  student_id: string;
  completed_at: string | null;
  results: { lessonWordsFound?: string[]; lessonWordsMissed?: string[] } | null;
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const now = Date.now();
  const week = isoWeekKey(now);

  try {
    const locked = await withCronLock('teacher-weekly-digest', 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) {
        logger.error('[Weekly Digest] no service-role client; skipping');
        return { sent: 0, failed: 0, due: 0, week, reason: 'no-supabase-admin' };
      }

      const { data: accessRows, error: accessError } = await supabase
        .from('teacher_access_requests')
        .select('user_id, email, full_name, locale')
        .eq('status', 'approved')
        .not('user_id', 'is', null);
      if (accessError) throw new Error(`teacher_access_requests select failed: ${accessError.message}`);

      const teachers: WeeklyTeacherRow[] = ((accessRows ?? []) as AccessRow[])
        .filter((r): r is AccessRow & { user_id: string } => typeof r.user_id === 'string' && Boolean(r.email))
        .map((r) => ({
          userId: r.user_id,
          email: r.email,
          fullName: r.full_name || 'Teacher',
          locale: r.locale || 'en',
        }));

      const teacherIds = [...new Set(teachers.map((t) => t.userId))];
      if (teacherIds.length === 0) {
        return { sent: 0, failed: 0, due: 0, week };
      }

      const { data: classroomRows, error: classError } = await supabase
        .from('classrooms')
        .select('id, name, teacher_id')
        .in('teacher_id', teacherIds);
      if (classError) throw new Error(`classrooms select failed: ${classError.message}`);

      const classrooms: WeeklyClassroomRow[] = ((classroomRows ?? []) as Array<{
        id: string;
        name: string;
        teacher_id: string;
      }>).map((c) => ({ id: c.id, name: c.name, teacherId: c.teacher_id }));
      const classroomIds = classrooms.map((c) => c.id);

      let memberships: WeeklyMembershipRow[] = [];
      let sessions: WeeklySessionRow[] = [];
      if (classroomIds.length > 0) {
        const { data: memberRows, error: memberError } = await supabase
          .from('classroom_memberships')
          .select('classroom_id, student_id')
          .in('classroom_id', classroomIds);
        if (memberError) throw new Error(`classroom_memberships select failed: ${memberError.message}`);
        memberships = ((memberRows ?? []) as Array<{ classroom_id: string; student_id: string }>).map((m) => ({
          classroomId: m.classroom_id,
          studentId: m.student_id,
        }));

        const since = new Date(now - 2 * WEEK_MS).toISOString();
        const { data: sessionRows, error: sessionError } = await supabase
          .from('practice_sessions')
          .select('classroom_id, student_id, completed_at, results')
          .in('classroom_id', classroomIds)
          .gte('completed_at', since)
          .not('completed_at', 'is', null)
          .limit(5000);
        if (sessionError) throw new Error(`practice_sessions select failed: ${sessionError.message}`);
        sessions = ((sessionRows ?? []) as SessionQueryRow[])
          .filter((s) => s.classroom_id && s.student_id && s.completed_at)
          .map((s) => ({
            classroomId: s.classroom_id as string,
            studentId: s.student_id,
            completedAt: s.completed_at as string,
            foundCount: s.results?.lessonWordsFound?.length ?? 0,
            missedCount: s.results?.lessonWordsMissed?.length ?? 0,
          }));
      }

      let assignmentCompletions: WeeklyAssignmentCompletionRow[] = [];
      const assignmentExpectedByClassroom = new Map<string, number>();
      if (classroomIds.length > 0) {
        const { data: assignmentRows, error: assignmentError } = await supabase
          .from('lesson_assignments')
          .select('id, classroom_id')
          .in('classroom_id', classroomIds)
          .limit(2000);
        if (assignmentError) {
          logger.error(`[Weekly Digest] lesson_assignments select failed: ${assignmentError.message}`);
        } else {
          const assignmentList = (assignmentRows ?? []) as Array<{ id: string; classroom_id: string | null }>;
          const countByRoom = new Map<string, number>();
          const assignmentToRoom = new Map<string, string>();
          for (const row of assignmentList) {
            if (!row.classroom_id) continue;
            assignmentToRoom.set(row.id, row.classroom_id);
            countByRoom.set(row.classroom_id, (countByRoom.get(row.classroom_id) ?? 0) + 1);
          }
          const rosterByRoom = new Map<string, number>();
          for (const m of memberships) {
            rosterByRoom.set(m.classroomId, (rosterByRoom.get(m.classroomId) ?? 0) + 1);
          }
          for (const [roomId, n] of countByRoom) {
            assignmentExpectedByClassroom.set(roomId, n * (rosterByRoom.get(roomId) ?? 0));
          }
          const assignmentIds = [...assignmentToRoom.keys()];
          if (assignmentIds.length > 0) {
            const since = new Date(now - 2 * WEEK_MS).toISOString();
            const { data: completionRows, error: completionError } = await supabase
              .from('student_lesson_progress')
              .select('assignment_id, completed_at')
              .in('assignment_id', assignmentIds)
              .gte('completed_at', since)
              .not('completed_at', 'is', null)
              .limit(5000);
            if (completionError) {
              logger.error(`[Weekly Digest] student_lesson_progress select failed: ${completionError.message}`);
            } else {
              assignmentCompletions = ((completionRows ?? []) as Array<{
                assignment_id: string | null;
                completed_at: string | null;
              }>)
                .filter((row) => row.assignment_id && row.completed_at && assignmentToRoom.has(row.assignment_id))
                .map((row) => ({
                  classroomId: assignmentToRoom.get(row.assignment_id as string) as string,
                  completedAt: row.completed_at as string,
                }));
            }
          }
        }
      }

      const { data: subRows, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, tier, status, source, current_period_end')
        .in('user_id', teacherIds);
      if (subError) {
        logger.error(`[Weekly Digest] subscriptions select failed: ${subError.message}`);
      }
      const subList = (subRows ?? []) as Array<SubscriptionRowLike & { user_id: string }>;
      const proUserIds = proUserIdsFrom(subList, now);
      const trialingDaysByUser = new Map<string, number>();
      for (const s of subList) {
        if (s.tier === 'pro' && s.status === 'trialing') {
          trialingDaysByUser.set(s.user_id, polarTrialDaysLeft(s.current_period_end, now) ?? 0);
        }
      }

      const { data: trialEventRows } = await supabase
        .from('subscription_events')
        .select('user_id')
        .in('user_id', teacherIds)
        .contains('payload', { trial: true });
      const expiredTrialUserIds = new Set(
        ((trialEventRows ?? []) as Array<{ user_id: string }>)
          .map((r) => r.user_id)
          .filter((id) => id && !proUserIds.has(id)),
      );

      const assembled = assembleWeeklyDigests({
        teachers,
        classrooms,
        memberships,
        sessions,
        assignmentCompletions,
        assignmentExpectedByClassroom,
        proUserIds,
        expiredTrialUserIds,
        trialingDaysByUser,
        now,
      });

      const emailKey = (email: string) => (email ?? '').trim().toLowerCase();
      const userIdsByEmail = new Map<string, string[]>();
      for (const t of teachers) {
        const list = userIdsByEmail.get(emailKey(t.email)) ?? [];
        list.push(t.userId);
        userIdsByEmail.set(emailKey(t.email), list);
      }
      const audience = await loadLifecycleAudience(
        supabase,
        assembled.flatMap((d) => userIdsByEmail.get(emailKey(d.email)) ?? [d.teacherId]),
        { mint: !dry },
      );
      let unsubscribed = 0;
      let unreachable = 0;
      const digests: Array<(typeof assembled)[number] & { token: string }> = [];
      for (const d of assembled) {
        const reach = reachFor(audience, userIdsByEmail.get(emailKey(d.email)) ?? [d.teacherId]);
        if ('skip' in reach) {
          if (reach.skip === 'unsubscribed') unsubscribed++;
          else unreachable++;
          continue;
        }
        digests.push({ ...d, token: reach.token });
      }

      logger.log(
        `[Weekly Digest] ${digests.length} teachers due week ${week}${dry ? ' (dry run)' : ''}; ` +
          `skipped ${unsubscribed} unsubscribed, ${unreachable} with no unsubscribe link`,
      );

      if (dry) {
        return {
          dry: true,
          due: digests.length,
          week,
          unsubscribed,
          unreachable,
          plan: digests.map((d) => ({ email: d.email, locale: d.locale, classrooms: d.classrooms.length, hasPro: d.hasPro })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const digest of digests) {
        const tpl = teacherWeeklyProgressDigest(digest);
        const result = await sendLifecycleEmail({
          to: digest.email,
          subject: tpl.subject,
          html: tpl.html,
          locale: digest.locale === 'he' ? 'he' : 'en',
          token: digest.token,
        });
        if (!result.ok) {
          failed += 1;
          logger.error(`[Weekly Digest] send failed for ${digest.email}: ${result.error}`);
          continue;
        }
        sent += 1;
      }
      return { sent, failed, due: digests.length, week, unsubscribed, unreachable };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running', week });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Weekly Digest] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/teacher-weekly-digest',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
