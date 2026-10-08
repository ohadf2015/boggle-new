/**
 * API Route: GET /api/admin/edu-dashboard?window=7|30|90
 *
 * Education KPIs for the admin dashboard. Service-role reads, aggregated in
 * buildEduDashboard. Every row is filtered to non-test accounts here, before it reaches
 * the pure assembler, so no tile can quietly include a QA rig.
 *
 * classroom_rounds is not applied in every environment yet. A missing table comes back
 * as `roundsAvailable: false` with the rounds KPIs null, never as a 500 or a zero.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { buildEduDashboard, type EduDashboardInput } from '@/lib/admin/eduDashboard';
import { isMachineRequest } from '@/lib/education/teacherFunnel';
import { migrationPendingHint } from '@/lib/supabase/migrationPendingHint';
import type { WindowDays } from '@/lib/admin/eduMetrics';

const DAY_MS = 86_400_000;

function parseWindow(url: string): WindowDays {
  const raw = new URL(url).searchParams.get('window');
  return raw === '30' ? 30 : raw === '90' ? 90 : 7;
}

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const windowDays = parseWindow(request.url);
  const nowMs = Date.now();
  const since = new Date(nowMs - 2 * windowDays * DAY_MS).toISOString();

  const [profilesRes, requestsRes, classroomsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, last_seen_at, display_name, username, is_test_account')
      .eq('user_role', 'teacher'),
    supabase.from('teacher_access_requests').select('user_id, email, status, reviewed_at, trial_expires_at'),
    supabase.from('classrooms').select('id, teacher_id, name'),
  ]);
  const firstError = profilesRes.error || requestsRes.error || classroomsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const testIds = new Set(
    (profilesRes.data ?? []).filter((p) => p.is_test_account).map((p) => p.id),
  );
  const teachers = (profilesRes.data ?? [])
    .filter((p) => !p.is_test_account)
    .map((p) => ({
      id: p.id,
      name: (p.display_name ?? '').trim() || (p.username ?? '').trim() || null,
      last_seen_at: p.last_seen_at ?? null,
    }));

  const requests = (requestsRes.data ?? []).filter(
    (r) => !isMachineRequest(r.email) && !(r.user_id && testIds.has(r.user_id)),
  );
  const approvals = requests
    .filter((r) => r.status === 'approved')
    .map((r) => ({
      user_id: r.user_id,
      reviewed_at: r.reviewed_at ?? null,
      trial_expires_at: r.trial_expires_at ?? null,
    }));

  const classrooms = (classroomsRes.data ?? []).filter(
    (c) => !(c.teacher_id && testIds.has(c.teacher_id)),
  );
  const classroomIds = classrooms.map((c) => c.id);

  const membershipsRes = classroomIds.length
    ? await supabase.from('classroom_memberships').select('classroom_id, student_id').in('classroom_id', classroomIds)
    : { data: [], error: null };
  if (membershipsRes.error) {
    return NextResponse.json({ error: membershipsRes.error.message }, { status: 500 });
  }

  const roundsRes = await supabase
    .from('classroom_rounds')
    .select('classroom_id, teacher_id, game_mode, player_count, completed_at')
    .gte('completed_at', since);
  let rounds: EduDashboardInput['rounds'] = null;
  if (!roundsRes.error) {
    rounds = (roundsRes.data ?? []).filter((r) => !testIds.has(r.teacher_id));
  } else if (!migrationPendingHint(roundsRes.error)) {
    return NextResponse.json({ error: roundsRes.error.message }, { status: 500 });
  }

  const approvedUserIds = approvals.map((a) => a.user_id).filter((id): id is string => !!id);
  const subsRes = approvedUserIds.length
    ? await supabase.from('subscriptions').select('user_id, status, created_at').in('user_id', approvedUserIds)
    : { data: [], error: null };
  if (subsRes.error) {
    return NextResponse.json({ error: subsRes.error.message }, { status: 500 });
  }

  const dashboard = buildEduDashboard({
    nowMs,
    windowDays,
    teachers,
    approvals,
    requested: requests.length,
    classrooms: classrooms.map((c) => ({ id: c.id, teacher_id: c.teacher_id, name: c.name ?? null })),
    memberships: membershipsRes.data ?? [],
    rounds,
    subscriptions: subsRes.data ?? [],
  });

  return NextResponse.json({ ...dashboard, roundsAvailable: rounds !== null });
}
