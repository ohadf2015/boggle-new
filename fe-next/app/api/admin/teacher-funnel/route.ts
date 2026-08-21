/**
 * API Route: /api/admin/teacher-funnel
 *
 * Powers the admin "Teacher funnel" panel — every access request with what the
 * teacher actually did afterwards (role granted? classroom? students?
 * assignments?).
 *
 * Built after a two-month silent failure: approvals reported success while
 * `profiles.user_role` was never promoted (RLS-silenced zero-row UPDATE), so
 * every approved teacher was bounced off /teacher. Nothing in the admin UI
 * distinguished "approved" from "can actually get in". The `blocked` count in
 * the summary is that alarm — it should always read 0.
 *
 * Service-role throughout: `profiles` RLS is `auth.uid() = id`, so an admin
 * reading other users' roles through the request-scoped client would silently
 * see nothing — the same trap that caused the original bug.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { buildTeacherFunnel } from '@/lib/education/teacherFunnel';

/** [label key, table] — the tables that hold evidence of teaching actually happening. */
const ACTIVITY_TABLES = [
  ['classrooms', 'classrooms'],
  ['lessons', 'vocabulary_lessons'],
  ['studentsJoined', 'classroom_memberships'],
  ['assignments', 'teacher_assignments'],
  ['lessonProgress', 'student_lesson_progress'],
  ['achievements', 'student_achievements'],
  ['duels', 'student_duels'],
] as const;

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const [requestsRes, classroomsRes, membershipsRes, assignmentsRes] = await Promise.all([
    supabase
      .from('teacher_access_requests')
      .select(
        // school_or_org + admin_note are here only so the panel can open the shared
        // TeacherAccessDrawer straight from a funnel row, without a second round-trip.
        'id, user_id, email, full_name, locale, country, role, school_or_org, admin_note, status, created_at, reviewed_at, trial_expires_at, use_case',
      )
      .order('created_at', { ascending: false }),
    supabase.from('classrooms').select('id, teacher_id'),
    supabase.from('classroom_memberships').select('classroom_id, student_id'),
    supabase.from('teacher_assignments').select('teacher_id'),
  ]);

  const firstError =
    requestsRes.error || classroomsRes.error || membershipsRes.error || assignmentsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const requests = requestsRes.data ?? [];
  const userIds = requests.map((r) => r.user_id).filter((id): id is string => !!id);

  // Only fetch the profiles we actually join against; `profiles` is the whole
  // player base and this panel only cares about applicants.
  const profilesRes = userIds.length
    ? await supabase.from('profiles').select('id, user_role, last_seen_at').in('id', userIds)
    : { data: [], error: null };
  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  // What is actually HAPPENING inside the module, as opposed to who was let into it. The
  // funnel answers "did they activate"; this answers "is anyone teaching". On 2026-08-21
  // every one of these is 0–3, and that IS the finding — an empty module reads as a broken
  // panel unless the emptiness is printed as a number. head:true so it costs a count, not
  // the rows. A table that errors reports null rather than 0: "we could not count" and
  // "there are none" are different answers and must not look alike.
  const activityCounts = await Promise.all(
    ACTIVITY_TABLES.map(async ([key, table]) => {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      return [key, error ? null : (count ?? 0)] as const;
    }),
  );

  const funnel = buildTeacherFunnel({
    requests,
    profiles: profilesRes.data ?? [],
    classrooms: classroomsRes.data ?? [],
    memberships: membershipsRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
    nowMs: Date.now(),
  });

  return NextResponse.json({ ...funnel, activity: Object.fromEntries(activityCounts) });
}
