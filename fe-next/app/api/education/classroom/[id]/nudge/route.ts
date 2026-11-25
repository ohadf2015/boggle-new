import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { requireTeacherPro } from '@/lib/education/pro/requireTeacherPro';
import { createAdminClient } from '@/utils/supabase/admin';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { sendToUsers } from '@/backend/services/pushNotificationService';
import { isPushLocale } from '@/backend/utils/pushTranslations';
import logger from '@/utils/logger';

/**
 * POST /api/education/classroom/[id]/nudge — one-tap teacher reminder to a
 * student who has not finished an assignment. Body { assignmentId, studentId }.
 *
 * Delivery reuses the existing notification stack: a `user_notifications` row
 * (the student drawer's realtime feed) plus FCM when the student is away, via
 * sendToUsers — no parallel store. Throttle: one nudge per (teacher, student,
 * assignment) per 24h, read back from `user_notifications` itself.
 *
 * 401/400/403 ownership, 402 not Pro, 404 assignment/student not in this
 * classroom, 200 { ok, result: 'sent' | 'already_nudged' | 'already_completed' }.
 */

const NUDGE_ENTITY = 'assignment_nudge';
const NUDGE_WINDOW_MS = 24 * 60 * 60 * 1000;

const Body = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const limit = checkApiRateLimit(req, 'education-nudge', { maxRequests: 30, windowMs: 60_000 });
  if (!limit.success) {
    return NextResponse.json(
      { ok: false, error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const auth = await authorizeClassroomOwner(req, id);
  if (!auth.ok) return auth.response;

  const notPro = await requireTeacherPro(auth.userId);
  if (notPro) return notPro;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  const { assignmentId, studentId } = parsed.data;

  const { data: assignment } = await auth.sb
    .from('lesson_assignments')
    .select('id, title, lesson_id, vocabulary_lessons(name)')
    .eq('id', assignmentId)
    .eq('classroom_id', auth.classroom.id)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  const { data: membership } = await auth.sb
    .from('classroom_memberships')
    .select('student_id')
    .eq('classroom_id', auth.classroom.id)
    .eq('student_id', studentId)
    .maybeSingle();
  if (!membership) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });

  // A finished assignment needs no reminder — the report was just stale.
  const { data: doneRows } = await auth.sb
    .from('student_lesson_progress')
    .select('id')
    .eq('student_id', studentId)
    .eq('assignment_id', assignmentId)
    .not('completed_at', 'is', null)
    .limit(1);
  if (doneRows && doneRows.length > 0) {
    return NextResponse.json({ ok: true, result: 'already_completed' });
  }

  const admin = createAdminClient();
  if (!admin) {
    logger.error('[nudge] service-role client unavailable');
    return NextResponse.json({ ok: false, error: 'service_unavailable' }, { status: 503 });
  }

  // One nudge per (teacher, student, assignment) per 24h. The ledger is the
  // notification table itself — no new store.
  const since = new Date(Date.now() - NUDGE_WINDOW_MS).toISOString();
  const { data: recent } = await admin
    .from('user_notifications')
    .select('id')
    .eq('user_id', studentId)
    .eq('sender_id', auth.userId)
    .eq('related_entity_type', NUDGE_ENTITY)
    .eq('related_entity_id', assignmentId)
    .gte('created_at', since)
    .limit(1);
  if (recent && recent.length > 0) {
    return NextResponse.json({ ok: true, result: 'already_nudged' });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('language')
    .eq('id', studentId)
    .maybeSingle();
  const locale = isPushLocale(profile?.language) ? profile.language : 'en';

  const lesson = Array.isArray(assignment.vocabulary_lessons)
    ? assignment.vocabulary_lessons[0]
    : assignment.vocabulary_lessons;
  const assignmentTitle = assignment.title || lesson?.name || 'Assignment';

  const result = await sendToUsers([studentId], {
    title: 'Assignment reminder',
    body: `Your teacher wants you to finish "${assignmentTitle}".`,
    titleKey: 'assignmentNudge.title',
    bodyKey: 'assignmentNudge.body',
    params: { assignment: assignmentTitle },
    notificationType: 'social',
    actionUrl: `/${locale}/student/lessons/${assignment.lesson_id}`,
    relatedEntityType: NUDGE_ENTITY,
    relatedEntityId: assignmentId,
    senderId: auth.userId,
  });
  if (!result.success) {
    logger.error('[nudge] sendToUsers failed', result.errors);
    return NextResponse.json({ ok: false, error: 'send_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: 'sent' });
}
