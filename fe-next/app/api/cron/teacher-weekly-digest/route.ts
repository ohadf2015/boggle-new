import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { teacherWeeklyProgressDigest } from '@/lib/email/templates/teacherWeeklyProgressDigest';
import {
  assembleWeeklyDigests,
  isoWeekKey,
  type WeeklyClassroomRow,
  type WeeklyMembershipRow,
  type WeeklySessionRow,
  type WeeklyTeacherRow,
} from '@/lib/education/weeklyTeacherDigest';
import { windowStartIso } from '@/lib/education/windowedClassroomProgress';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';

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

        const since = windowStartIso(7, now);
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

      const { data: subRows, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, tier, status')
        .in('user_id', teacherIds);
      if (subError) {
        logger.error(`[Weekly Digest] subscriptions select failed: ${subError.message}`);
      }
      const proUserIds = new Set(
        ((subRows ?? []) as Array<{ user_id: string; tier: string; status: string }>)
          .filter((s) => s.tier === 'pro' && (s.status === 'active' || s.status === 'trialing'))
          .map((s) => s.user_id),
      );

      const digests = assembleWeeklyDigests({
        teachers,
        classrooms,
        memberships,
        sessions,
        proUserIds,
        now,
      });

      logger.log(`[Weekly Digest] ${digests.length} teachers due week ${week}${dry ? ' (dry run)' : ''}`);

      if (dry) {
        return {
          dry: true,
          due: digests.length,
          week,
          plan: digests.map((d) => ({ email: d.email, locale: d.locale, classrooms: d.classrooms.length, hasPro: d.hasPro })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const digest of digests) {
        const tpl = teacherWeeklyProgressDigest(digest);
        const result = await sendEmail({ to: digest.email, subject: tpl.subject, html: tpl.html });
        if (!result.ok) {
          failed += 1;
          logger.error(`[Weekly Digest] send failed for ${digest.email}: ${result.error}`);
          continue;
        }
        sent += 1;
      }
      return { sent, failed, due: digests.length, week };
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
