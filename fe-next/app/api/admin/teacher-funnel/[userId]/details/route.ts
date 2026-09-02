/**
 * API Route: /api/admin/teacher-funnel/[userId]/details
 *
 * Per-teacher drill-down for the admin funnel: which classrooms, word lists,
 * assignments and recent completions actually exist for this teacher.
 *
 * Service-role throughout — same trap as /api/admin/teacher-funnel: `profiles`
 * RLS is `auth.uid() = id`, so an admin reading another user's role through
 * the request-scoped client would silently see nothing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { buildTeacherActivity } from '@/lib/education/teacherActivity';

interface RouteContext {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const [profileRes, requestRes, classroomsRes, lessonsRes, assignmentsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, user_role, last_seen_at, display_name, username')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('teacher_access_requests')
      .select('email, full_name, status, trial_expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('classrooms')
      .select('id, name, join_code, language, created_at')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('vocabulary_lessons')
      .select('id, name, language, created_at, words, source_game_code')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('teacher_assignments')
      .select('id, title, assignment_type, classroom_id, lesson_id, due_date, created_at')
      .eq('teacher_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const firstError =
    profileRes.error ||
    requestRes.error ||
    classroomsRes.error ||
    lessonsRes.error ||
    assignmentsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  if (!profileRes.data) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
  }

  const classrooms = classroomsRes.data ?? [];
  const lessons = lessonsRes.data ?? [];
  const classroomIds = classrooms.map((c) => c.id);
  const lessonIds = lessons.map((l) => l.id);

  const [membershipsRes, progressRes] = await Promise.all([
    classroomIds.length
      ? supabase
          .from('classroom_memberships')
          .select('classroom_id, student_id, joined_at')
          .in('classroom_id', classroomIds)
      : Promise.resolve({ data: [] as Array<{ classroom_id: string; student_id: string; joined_at: string | null }>, error: null }),
    lessonIds.length
      ? supabase
          .from('student_lesson_progress')
          .select(
            'student_id, lesson_id, assignment_id, completed_at, current_level, total_xp, words_mastered',
          )
          .in('lesson_id', lessonIds)
      : Promise.resolve({
          data: [] as Array<{
            student_id: string;
            lesson_id: string;
            assignment_id: string | null;
            completed_at: string | null;
            current_level: number | null;
            total_xp: number | null;
            words_mastered: string[] | null;
          }>,
          error: null,
        }),
  ]);

  const followError = membershipsRes.error || progressRes.error;
  if (followError) {
    return NextResponse.json({ error: followError.message }, { status: 500 });
  }

  return NextResponse.json(
    buildTeacherActivity({
      userId,
      profile: profileRes.data,
      request: requestRes.data,
      classrooms,
      memberships: membershipsRes.data ?? [],
      lessons,
      assignments: assignmentsRes.data ?? [],
      progress: progressRes.data ?? [],
    }),
  );
}
