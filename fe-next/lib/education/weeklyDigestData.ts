/**
 * Reads behind the Monday teacher digest. Every read is chunked and paged (no silent
 * 1000-row or `.limit(n)` truncation) and every failure throws: a digest built on a
 * missing subscription read would hand a Pro teacher the upgrade pitch.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchInChunks, fetchPaged, type Result } from './pro/fetchAll';
import { isMachineRequest } from './teacherFunnel';
import { polarTrialDaysLeft } from './polarTrial';
import { WEEK_MS } from './weeklyProgressDigest';
import type {
  WeeklyAssignmentCompletionRow,
  WeeklyClassroomRow,
  WeeklyMembershipRow,
  WeeklySessionRow,
  WeeklyTeacherRow,
} from './weeklyTeacherDigest';

type Db = Pick<SupabaseClient, 'from'>;

export interface WeeklyDigestInputs {
  teachers: WeeklyTeacherRow[];
  classrooms: WeeklyClassroomRow[];
  memberships: WeeklyMembershipRow[];
  sessions: WeeklySessionRow[];
  assignmentCompletions: WeeklyAssignmentCompletionRow[];
  assignmentExpectedByClassroom: Map<string, number>;
  proUserIds: Set<string>;
  expiredTrialUserIds: Set<string>;
  trialingDaysByUser: Map<string, number>;
  excludedTestAccounts: number;
}

function must<T>(table: string, r: Result<T>): T[] {
  if (r.error) throw new Error(`${table} select failed: ${r.error.message}`);
  return r.data;
}

const emptyInputs = (excludedTestAccounts: number): WeeklyDigestInputs => ({
  teachers: [], classrooms: [], memberships: [], sessions: [], assignmentCompletions: [],
  assignmentExpectedByClassroom: new Map(), proUserIds: new Set(), expiredTrialUserIds: new Set(),
  trialingDaysByUser: new Map(), excludedTestAccounts,
});

export async function loadWeeklyDigestInputs(sb: Db, now: number): Promise<WeeklyDigestInputs> {
  const access = must('teacher_access_requests', await fetchPaged<{
    user_id: string | null; email: string; full_name: string; locale: string | null;
  }>(sb, 'teacher_access_requests', 'id, user_id, email, full_name, locale', [
    { op: 'eq', column: 'status', value: 'approved' },
    { op: 'notNull', column: 'user_id' },
  ]));
  const candidates = access.filter((r): r is typeof r & { user_id: string } => typeof r.user_id === 'string' && Boolean(r.email));
  const candidateIds = [...new Set(candidates.map((r) => r.user_id))];
  const testIds = new Set(must('profiles', await fetchInChunks<{ id: string }>(
    sb, 'profiles', 'id', 'id', candidateIds, [{ op: 'eq', column: 'is_test_account', value: true }],
  )).map((p) => p.id));

  const kept = candidates.filter((r) => !isMachineRequest(r.email) && !testIds.has(r.user_id));
  const excludedTestAccounts = candidates.length - kept.length;
  const teachers: WeeklyTeacherRow[] = kept.map((r) => ({
    userId: r.user_id, email: r.email, fullName: r.full_name || 'Teacher', locale: r.locale || 'en',
  }));
  const teacherIds = [...new Set(teachers.map((t) => t.userId))];
  if (teacherIds.length === 0) return emptyInputs(excludedTestAccounts);

  const classroomRows = must('classrooms', await fetchInChunks<{ id: string; name: string; teacher_id: string }>(
    sb, 'classrooms', 'id, name, teacher_id', 'teacher_id', teacherIds,
  ));
  const classrooms = classroomRows.map((c) => ({ id: c.id, name: c.name, teacherId: c.teacher_id }));
  const teacherOf = new Map(classrooms.map((c) => [c.id, c.teacherId]));
  const classroomIds = classrooms.map((c) => c.id);
  const since = new Date(now - 2 * WEEK_MS).toISOString();

  const [memberRows, sessionRows, assignmentRows, subRows, trialRows] = await Promise.all([
    fetchInChunks<{ classroom_id: string; student_id: string }>(sb, 'classroom_memberships', 'id, classroom_id, student_id', 'classroom_id', classroomIds),
    fetchInChunks<{ classroom_id: string | null; student_id: string; completed_at: string | null; results: { lessonWordsFound?: string[]; lessonWordsMissed?: string[] } | null }>(
      sb, 'practice_sessions', 'id, classroom_id, student_id, completed_at, results', 'classroom_id', classroomIds,
      [{ op: 'gte', column: 'completed_at', value: since }, { op: 'notNull', column: 'completed_at' }],
    ),
    fetchInChunks<{ id: string; classroom_id: string | null }>(sb, 'lesson_assignments', 'id, classroom_id', 'classroom_id', classroomIds),
    fetchInChunks<{ user_id: string; tier: string; status: string; current_period_end: string | null }>(
      sb, 'subscriptions', 'id, user_id, tier, status, current_period_end', 'user_id', teacherIds,
    ),
    fetchInChunks<{ user_id: string }>(sb, 'subscription_events', 'id, user_id', 'user_id', teacherIds, [
      { op: 'contains', column: 'payload', value: { trial: true } },
    ]),
  ]);

  // The teacher's own preview seat is not a student.
  const memberships = must('classroom_memberships', memberRows)
    .filter((m) => m.student_id !== teacherOf.get(m.classroom_id))
    .map((m) => ({ classroomId: m.classroom_id, studentId: m.student_id }));
  const sessions = must('practice_sessions', sessionRows)
    .filter((s) => s.classroom_id && s.student_id && s.completed_at && s.student_id !== teacherOf.get(s.classroom_id))
    .map((s) => ({
      classroomId: s.classroom_id as string,
      studentId: s.student_id,
      completedAt: s.completed_at as string,
      foundCount: s.results?.lessonWordsFound?.length ?? 0,
      missedCount: s.results?.lessonWordsMissed?.length ?? 0,
    }));

  const assignmentToRoom = new Map<string, string>();
  const countByRoom = new Map<string, number>();
  for (const row of must('lesson_assignments', assignmentRows)) {
    if (!row.classroom_id) continue;
    assignmentToRoom.set(row.id, row.classroom_id);
    countByRoom.set(row.classroom_id, (countByRoom.get(row.classroom_id) ?? 0) + 1);
  }
  const rosterByRoom = new Map<string, number>();
  for (const m of memberships) rosterByRoom.set(m.classroomId, (rosterByRoom.get(m.classroomId) ?? 0) + 1);
  const assignmentExpectedByClassroom = new Map<string, number>();
  for (const [roomId, n] of countByRoom) assignmentExpectedByClassroom.set(roomId, n * (rosterByRoom.get(roomId) ?? 0));

  const completionRows = must('student_lesson_progress', await fetchInChunks<{ assignment_id: string | null; completed_at: string | null }>(
    sb, 'student_lesson_progress', 'id, assignment_id, completed_at', 'assignment_id', [...assignmentToRoom.keys()],
    [{ op: 'gte', column: 'completed_at', value: since }, { op: 'notNull', column: 'completed_at' }],
  ));
  const assignmentCompletions = completionRows
    .filter((row) => row.assignment_id && row.completed_at && assignmentToRoom.has(row.assignment_id))
    .map((row) => ({ classroomId: assignmentToRoom.get(row.assignment_id as string) as string, completedAt: row.completed_at as string }));

  const subList = must('subscriptions', subRows);
  const proUserIds = new Set(
    subList.filter((s) => s.tier === 'pro' && (s.status === 'active' || s.status === 'trialing')).map((s) => s.user_id),
  );
  const trialingDaysByUser = new Map<string, number>();
  for (const s of subList) {
    if (s.tier === 'pro' && s.status === 'trialing') trialingDaysByUser.set(s.user_id, polarTrialDaysLeft(s.current_period_end, now) ?? 0);
  }
  const expiredTrialUserIds = new Set(
    must('subscription_events', trialRows).map((r) => r.user_id).filter((id) => id && !proUserIds.has(id)),
  );

  return {
    teachers, classrooms, memberships, sessions, assignmentCompletions, assignmentExpectedByClassroom,
    proUserIds, expiredTrialUserIds, trialingDaysByUser, excludedTestAccounts,
  };
}
