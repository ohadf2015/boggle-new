import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import logger from '@/utils/logger';
import { getSupabaseAdmin } from '@/lib/email';
import { sendEmail } from '@/lib/email/send';
import { assignmentDueReminderEmail } from '@/lib/email/templates/assignmentDueReminder';
import {
  DUE_SOON_WINDOW_MS,
  OVERDUE_MAX_AGE_MS,
  pickTeacherAssignmentReminders,
  reminderSendRows,
  type ReminderAlreadySent,
  type ReminderAssignment,
  type ReminderCompletion,
  type ReminderMembership,
} from '@/lib/education/assignmentDueReminders';
import type { TeacherLocale } from '@/lib/education/types';
import { captureApiError } from '@/utils/sentry';
import { withCronLock } from '@/backend/redis/locking';
import { proUserIdsFrom, type SubscriptionRowLike } from '@/lib/education/proGrant';

/**
 * POST /api/cron/assignment-due-reminders
 *
 * Daily: email teachers about student homework due in the next 24h, and an
 * overdue nudge that deep-links /{locale}/teacher/reports?classroomId= so the
 * progress report (Teacher Pro CSV) is the next click. Idempotent per
 * (assignment, teacher, kind) via assignment_reminder_sends.
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

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dry = request.nextUrl.searchParams.get('dry') === '1';
  const now = Date.now();

  try {
    const locked = await withCronLock('assignment-due-reminders', 120_000, async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new Error('no service-role client');

      const since = new Date(now - OVERDUE_MAX_AGE_MS).toISOString();
      const until = new Date(now + DUE_SOON_WINDOW_MS).toISOString();

      const { data: assignmentRows, error: assignmentError } = await supabase
        .from('lesson_assignments')
        .select('id, classroom_id, lesson_id, due_date')
        .not('due_date', 'is', null)
        .gte('due_date', since)
        .lte('due_date', until);
      if (assignmentError) throw new Error(`lesson_assignments select failed: ${assignmentError.message}`);

      const rawAssignments = (assignmentRows ?? []) as Array<{
        id: string;
        classroom_id: string;
        lesson_id: string;
        due_date: string;
      }>;
      if (rawAssignments.length === 0) {
        return { sent: 0, failed: 0, due: 0 };
      }

      const classroomIds = [...new Set(rawAssignments.map((a) => a.classroom_id))];
      const lessonIds = [...new Set(rawAssignments.map((a) => a.lesson_id))];
      const assignmentIds = rawAssignments.map((a) => a.id);

      const { data: classroomRows, error: classError } = await supabase
        .from('classrooms')
        .select('id, name, teacher_id')
        .in('id', classroomIds);
      if (classError) throw new Error(`classrooms select failed: ${classError.message}`);
      const classrooms = (classroomRows ?? []) as Array<{ id: string; name: string; teacher_id: string }>;
      const classById = new Map(classrooms.map((c) => [c.id, c]));

      const { data: lessonRows, error: lessonError } = await supabase
        .from('vocabulary_lessons')
        .select('id, name')
        .in('id', lessonIds);
      if (lessonError) throw new Error(`vocabulary_lessons select failed: ${lessonError.message}`);
      const lessonName = new Map(
        ((lessonRows ?? []) as Array<{ id: string; name: string | null }>).map((l) => [l.id, l.name || 'Untitled lesson']),
      );

      const { data: memberRows, error: memberError } = await supabase
        .from('classroom_memberships')
        .select('classroom_id, student_id')
        .in('classroom_id', classroomIds);
      if (memberError) throw new Error(`classroom_memberships select failed: ${memberError.message}`);
      const memberships: ReminderMembership[] = (
        (memberRows ?? []) as Array<{ classroom_id: string; student_id: string }>
      ).map((m) => ({ classroomId: m.classroom_id, studentId: m.student_id }));

      const { data: progressRows, error: progressError } = await supabase
        .from('student_lesson_progress')
        .select('assignment_id, student_id')
        .in('assignment_id', assignmentIds)
        .not('completed_at', 'is', null);
      if (progressError) throw new Error(`student_lesson_progress select failed: ${progressError.message}`);
      const completions: ReminderCompletion[] = (
        (progressRows ?? []) as Array<{ assignment_id: string; student_id: string }>
      ).map((p) => ({ assignmentId: p.assignment_id, studentId: p.student_id }));

      const { data: sentRows, error: sentError } = await supabase
        .from('assignment_reminder_sends')
        .select('assignment_id, recipient_id, kind')
        .in('assignment_id', assignmentIds);
      if (sentError) throw new Error(`assignment_reminder_sends select failed: ${sentError.message}`);
      const alreadySent: ReminderAlreadySent[] = (
        (sentRows ?? []) as Array<{ assignment_id: string; recipient_id: string; kind: 'due_soon' | 'overdue' }>
      ).map((s) => ({ assignmentId: s.assignment_id, recipientId: s.recipient_id, kind: s.kind }));

      const assignments: ReminderAssignment[] = [];
      for (const a of rawAssignments) {
        const classroom = classById.get(a.classroom_id);
        if (!classroom) continue;
        assignments.push({
          id: a.id,
          classroomId: a.classroom_id,
          classroomName: classroom.name,
          teacherId: classroom.teacher_id,
          lessonId: a.lesson_id,
          title: lessonName.get(a.lesson_id) || 'Untitled lesson',
          dueDate: a.due_date,
        });
      }

      const plans = pickTeacherAssignmentReminders({
        now,
        assignments,
        memberships,
        completions,
        alreadySent,
      });

      const teacherIds = [...new Set(plans.map((p) => p.teacherId))];
      if (teacherIds.length === 0) {
        return { sent: 0, failed: 0, due: 0 };
      }

      const { data: accessRows, error: accessError } = await supabase
        .from('teacher_access_requests')
        .select('user_id, email, full_name, locale')
        .eq('status', 'approved')
        .in('user_id', teacherIds);
      if (accessError) throw new Error(`teacher_access_requests select failed: ${accessError.message}`);

      const teachersById = new Map<string, { email: string; fullName: string; locale: TeacherLocale }>();
      for (const r of (accessRows ?? []) as AccessRow[]) {
        if (!r.user_id || !r.email) continue;
        if (teachersById.has(r.user_id)) continue;
        teachersById.set(r.user_id, {
          email: r.email,
          fullName: r.full_name || 'Teacher',
          locale: (r.locale as TeacherLocale) || 'en',
        });
      }

      const { data: subRows, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id, tier, status, source, current_period_end')
        .in('user_id', teacherIds);
      // Fail closed: an unknown Pro status would pitch an upgrade to a paying teacher.
      if (subError) throw new Error(`subscriptions select failed: ${subError.message}`);
      const proUserIds = proUserIdsFrom(
        (subRows ?? []) as Array<SubscriptionRowLike & { user_id: string }>,
        Date.now(),
      );

      if (dry) {
        return {
          dry: true,
          due: plans.length,
          plan: plans.map((p) => ({
            teacherId: p.teacherId,
            dueSoon: p.dueSoon.length,
            overdue: p.overdue.length,
          })),
        };
      }

      let sent = 0;
      let failed = 0;
      for (const plan of plans) {
        const teacher = teachersById.get(plan.teacherId);
        if (!teacher) continue;
        const tpl = assignmentDueReminderEmail({
          fullName: teacher.fullName,
          locale: teacher.locale,
          plan,
          hasPro: proUserIds.has(plan.teacherId),
        });
        const result = await sendEmail({ to: teacher.email, subject: tpl.subject, html: tpl.html });
        if (!result.ok) {
          failed += 1;
          logger.error(`[Assignment Due] send failed for ${teacher.email}: ${result.error}`);
          continue;
        }
        const rows = reminderSendRows(plan).map((r) => ({
          assignment_id: r.assignmentId,
          recipient_id: r.recipientId,
          kind: r.kind,
        }));
        if (rows.length > 0) {
          const { error: insertError } = await supabase.from('assignment_reminder_sends').upsert(rows, {
            onConflict: 'assignment_id,recipient_id,kind',
          });
          // Unrecorded means tomorrow's run sends the same reminder again: stop and alert.
          if (insertError) throw new Error(`sent to ${teacher.email} but ledger insert failed: ${insertError.message}`);
        }
        sent += 1;
      }

      return { sent, failed, due: plans.length };
    });

    if (locked.status === 'skipped') {
      return NextResponse.json({ success: true, skipped: true, reason: 'already-running' });
    }
    return NextResponse.json({ success: true, ...locked.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[Assignment Due] Error:', errorMessage);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/cron/assignment-due-reminders',
      { method: 'POST', statusCode: 500 },
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
