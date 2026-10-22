/**
 * API Route: GET /api/admin/edu-dashboard/class/[classId]
 *
 * One classroom for the admin education dashboard: roster, assignments with completion,
 * live rounds and recent games. Service-role reads (profiles RLS would hide other users),
 * every query keyed by the classroom id or a primary key. Test students are dropped in
 * buildClassDetail.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { buildClassDetail, type ClassDetailInput } from '@/lib/admin/eduClassDetail';
import { slimClassroomGame } from '@/lib/education/teacherActivity';
import { getRecentClassroomGames } from '@/lib/supabase/analyticsLastGame';
import { migrationPendingHint } from '@/lib/supabase/migrationPendingHint';

const DAY_MS = 86_400_000;
const RECENT_GAMES = 10;
const ROUNDS_LOOKBACK_DAYS = 90;

interface RouteContext {
  params: Promise<{ classId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) return authResult.response!;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { classId } = await context.params;
  if (!classId) {
    return NextResponse.json({ error: 'Missing classId' }, { status: 400 });
  }

  const nowMs = Date.now();
  const [classRes, membershipsRes, assignmentsRes, roundsRes, gamesRes] = await Promise.all([
    supabase
      .from('classrooms')
      .select('id, name, join_code, language, created_at, teacher_id')
      .eq('id', classId)
      .maybeSingle(),
    supabase.from('classroom_memberships').select('student_id, joined_at').eq('classroom_id', classId),
    supabase
      .from('lesson_assignments')
      .select('id, lesson_id, due_date, created_at')
      .eq('classroom_id', classId)
      .order('created_at', { ascending: false }),
    supabase
      .from('classroom_rounds')
      .select('game_mode, player_count, completed_at')
      .eq('classroom_id', classId)
      .gte('completed_at', new Date(nowMs - ROUNDS_LOOKBACK_DAYS * DAY_MS).toISOString()),
    getRecentClassroomGames(classId, RECENT_GAMES, { fallbackName: 'Student' }, supabase),
  ]);

  const firstError = classRes.error || membershipsRes.error || assignmentsRes.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }
  if (!classRes.data) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }
  if (roundsRes.error && !migrationPendingHint(roundsRes.error)) {
    return NextResponse.json({ error: roundsRes.error.message }, { status: 500 });
  }

  const classroom = classRes.data as ClassDetailInput['classroom'];
  const memberships = (membershipsRes.data ?? []) as ClassDetailInput['memberships'];
  const assignments = (assignmentsRes.data ?? []) as ClassDetailInput['assignments'];
  const profileIds = [...new Set([classroom.teacher_id, ...memberships.map((m) => m.student_id)].filter((id): id is string => !!id))];
  const lessonIds = [...new Set(assignments.map((a) => a.lesson_id))];
  const assignmentIds = assignments.map((a) => a.id);

  const [profilesRes, lessonsRes, progressRes] = await Promise.all([
    profileIds.length
      ? supabase.from('profiles').select('id, display_name, username, last_seen_at, is_test_account').in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
    lessonIds.length
      ? supabase.from('vocabulary_lessons').select('id, name').in('id', lessonIds)
      : Promise.resolve({ data: [], error: null }),
    assignmentIds.length
      ? supabase.from('student_lesson_progress').select('assignment_id, student_id, completed_at').in('assignment_id', assignmentIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const followError = profilesRes.error || lessonsRes.error || progressRes.error;
  if (followError) {
    return NextResponse.json({ error: followError.message }, { status: 500 });
  }

  return NextResponse.json(
    buildClassDetail({
      nowMs,
      classroom,
      memberships,
      assignments,
      profiles: (profilesRes.data ?? []) as ClassDetailInput['profiles'],
      lessons: (lessonsRes.data ?? []) as ClassDetailInput['lessons'],
      progress: (progressRes.data ?? []) as ClassDetailInput['progress'],
      rounds: roundsRes.error ? null : ((roundsRes.data ?? []) as NonNullable<ClassDetailInput['rounds']>),
      games: (gamesRes.data ?? []).map(slimClassroomGame),
    }),
  );
}
