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

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const [requestsRes, classroomsRes] = await Promise.all([
    supabase
      .from('teacher_access_requests')
      .select(
        // school_or_org + admin_note are here only so the panel can open the shared
        // TeacherAccessDrawer straight from a funnel row, without a second round-trip.
        'id, user_id, email, full_name, locale, country, role, school_or_org, admin_note, status, created_at, reviewed_at, trial_expires_at, use_case',
      )
      .order('created_at', { ascending: false }),
    supabase.from('classrooms').select('id, teacher_id, name, join_code, language, created_at'),
  ]);

  const firstError = requestsRes.error || classroomsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const requests = requestsRes.data ?? [];
  // Classroom owners are included alongside applicants: a classroom can be opened by
  // someone who never filled in the access form (the 2026-01-24 one predates the form),
  // and such a row would otherwise render with a blank owner. display_name/username are
  // the only human labels on `profiles` — it has no email column.
  const userIds = [
    ...new Set(
      [
        ...requests.map((r) => r.user_id),
        ...(classroomsRes.data ?? []).map((c) => c.teacher_id),
      ].filter((id): id is string => !!id),
    ),
  ];

  // Only fetch the profiles we actually join against; `profiles` is the whole
  // player base and this panel only cares about applicants and classroom owners.
  const profilesRes = userIds.length
    ? await supabase
        .from('profiles')
        .select('id, user_role, is_test_account, last_seen_at, display_name, username')
        .in('id', userIds)
    : { data: [], error: null };
  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
  }

  const profiles = profilesRes.data ?? [];
  const classrooms = classroomsRes.data ?? [];
  // Test-owned classrooms are removed inside buildTeacherFunnel; reading memberships and
  // assignments only for the survivors keeps every activity count on the same population.
  const testTeacherIds = new Set(profiles.filter((p) => p.is_test_account).map((p) => p.id));
  const realClassroomIds = classrooms
    .filter((c) => !(c.teacher_id && testTeacherIds.has(c.teacher_id)))
    .map((c) => c.id);

  const [membershipsRes, assignmentsRes] = realClassroomIds.length
    ? await Promise.all([
        supabase.from('classroom_memberships').select('classroom_id, student_id').in('classroom_id', realClassroomIds),
        // `lesson_assignments` is what the app writes (lib/supabase/education/assignments.ts
        // createAssignment); `teacher_assignments` has no writer. It has no teacher_id, so it
        // is mapped through classroom ownership below.
        supabase.from('lesson_assignments').select('classroom_id').in('classroom_id', realClassroomIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const memberError = membershipsRes.error || assignmentsRes.error;
  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  // lesson_assignments has classroom_id, not teacher_id — map through the classroom's owner
  // so buildTeacherFunnel keeps its { teacher_id } shape.
  const teacherIdByClassroomId = new Map(classrooms.map((c) => [c.id, c.teacher_id]));
  const assignments = (assignmentsRes.data ?? []).map((a) => ({
    teacher_id: teacherIdByClassroomId.get(a.classroom_id) ?? null,
  }));

  const funnel = buildTeacherFunnel({
    requests,
    profiles,
    classrooms,
    memberships: membershipsRes.data ?? [],
    assignments,
    nowMs: Date.now(),
  });

  // Every activity number is counted over the same non-test population as the funnel above,
  // so a QA rig can no longer inflate a tile while being excluded from the rows.
  const activity = {
    classrooms: funnel.classrooms?.length ?? 0,
    studentsJoined: new Set((membershipsRes.data ?? []).map((m) => m.student_id)).size,
    assignments: assignments.length,
  };

  return NextResponse.json({ ...funnel, activity });
}
