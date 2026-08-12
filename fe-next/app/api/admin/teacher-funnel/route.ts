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

  const [requestsRes, classroomsRes, membershipsRes, assignmentsRes] = await Promise.all([
    supabase
      .from('teacher_access_requests')
      .select('id, user_id, email, full_name, locale, country, status, created_at, trial_expires_at')
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

  const funnel = buildTeacherFunnel({
    requests,
    profiles: profilesRes.data ?? [],
    classrooms: classroomsRes.data ?? [],
    memberships: membershipsRes.data ?? [],
    assignments: assignmentsRes.data ?? [],
    nowMs: Date.now(),
  });

  return NextResponse.json(funnel);
}
