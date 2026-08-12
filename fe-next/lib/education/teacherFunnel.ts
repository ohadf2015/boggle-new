/**
 * Teacher funnel aggregation for the admin dashboard.
 *
 * Exists because the teacher funnel was invisible: 14 teachers were approved
 * over two months while `profiles.user_role` was never actually promoted (an
 * RLS-silenced zero-row UPDATE), so every one of them was bounced off
 * /teacher and only one classroom was ever created. Nothing in the admin UI
 * showed the gap between "approved" and "can actually get in".
 *
 * `roleGranted` is therefore the load-bearing column: it re-checks the
 * invariant on every render rather than trusting that approval worked.
 *
 * Pure — all IO happens in the route. Teacher counts are small (tens), so the
 * joins are done in memory instead of adding an RPC or a migration.
 */

export type TeacherStage =
  | 'declined'
  | 'awaiting_signup'
  | 'blocked'
  | 'approved'
  | 'created_class'
  | 'teaching';

export type TrialState = 'none' | 'active' | 'expired';

export interface TeacherFunnelInput {
  requests: Array<{
    id: string;
    user_id: string | null;
    email: string;
    full_name: string | null;
    locale: string | null;
    country: string | null;
    status: string;
    created_at: string;
    trial_expires_at: string | null;
  }>;
  profiles: Array<{ id: string; user_role: string | null; last_seen_at?: string | null }>;
  classrooms: Array<{ id: string; teacher_id: string | null }>;
  memberships: Array<{ classroom_id: string; student_id: string }>;
  assignments: Array<{ teacher_id: string | null }>;
  nowMs: number;
}

export interface TeacherFunnelRow {
  requestId: string;
  userId: string | null;
  email: string;
  fullName: string | null;
  locale: string | null;
  country: string | null;
  status: string;
  createdAt: string;
  trialExpiresAt: string | null;
  trialState: TrialState;
  /** False on an approved request means the teacher physically cannot get in. */
  roleGranted: boolean;
  /** Last app activity — separates 'just approved' from 'gone since June'. */
  lastSeenAt: string | null;
  classrooms: number;
  students: number;
  assignments: number;
  stage: TeacherStage;
}

export interface TeacherFunnelSummary {
  requested: number;
  approved: number;
  roleGranted: number;
  createdClassroom: number;
  gotStudents: number;
  assigned: number;
  /** Approved, has an account, but the role never landed. Should always be 0. */
  blocked: number;
  awaitingSignup: number;
  trialExpired: number;
}

export interface TeacherFunnelResult {
  rows: TeacherFunnelRow[];
  summary: TeacherFunnelSummary;
}

function trialStateOf(expiresAt: string | null, nowMs: number): TrialState {
  if (!expiresAt) return 'none';
  return Date.parse(expiresAt) > nowMs ? 'active' : 'expired';
}

export function buildTeacherFunnel(input: TeacherFunnelInput): TeacherFunnelResult {
  const { requests, profiles, classrooms, memberships, assignments, nowMs } = input;

  const roleById = new Map(profiles.map((p) => [p.id, p.user_role]));
  const lastSeenById = new Map(profiles.map((p) => [p.id, p.last_seen_at ?? null]));

  const studentsByClassroom = new Map<string, Set<string>>();
  for (const m of memberships) {
    const set = studentsByClassroom.get(m.classroom_id) ?? new Set<string>();
    set.add(m.student_id);
    studentsByClassroom.set(m.classroom_id, set);
  }

  const classroomsByTeacher = new Map<string, string[]>();
  for (const c of classrooms) {
    if (!c.teacher_id) continue;
    classroomsByTeacher.set(c.teacher_id, [...(classroomsByTeacher.get(c.teacher_id) ?? []), c.id]);
  }

  const assignmentsByTeacher = new Map<string, number>();
  for (const a of assignments) {
    if (!a.teacher_id) continue;
    assignmentsByTeacher.set(a.teacher_id, (assignmentsByTeacher.get(a.teacher_id) ?? 0) + 1);
  }

  const rows: TeacherFunnelRow[] = requests.map((r) => {
    const roleGranted = !!r.user_id && roleById.get(r.user_id) === 'teacher';
    const ownedClassrooms = r.user_id ? classroomsByTeacher.get(r.user_id) ?? [] : [];
    const students = ownedClassrooms.reduce(
      (n, id) => n + (studentsByClassroom.get(id)?.size ?? 0),
      0,
    );
    const assignmentCount = r.user_id ? assignmentsByTeacher.get(r.user_id) ?? 0 : 0;

    let stage: TeacherStage;
    if (r.status !== 'approved') stage = 'declined';
    else if (!r.user_id) stage = 'awaiting_signup';
    else if (!roleGranted) stage = 'blocked';
    else if (students > 0) stage = 'teaching';
    else if (ownedClassrooms.length > 0) stage = 'created_class';
    else stage = 'approved';

    return {
      requestId: r.id,
      userId: r.user_id,
      email: r.email,
      fullName: r.full_name,
      locale: r.locale,
      country: r.country,
      status: r.status,
      createdAt: r.created_at,
      trialExpiresAt: r.trial_expires_at,
      trialState: trialStateOf(r.trial_expires_at, nowMs),
      roleGranted,
      lastSeenAt: (r.user_id ? lastSeenById.get(r.user_id) : null) ?? null,
      classrooms: ownedClassrooms.length,
      students,
      assignments: assignmentCount,
      stage,
    };
  });

  const approvedRows = rows.filter((r) => r.status === 'approved');

  return {
    rows,
    summary: {
      requested: rows.length,
      approved: approvedRows.length,
      roleGranted: approvedRows.filter((r) => r.roleGranted).length,
      createdClassroom: approvedRows.filter((r) => r.classrooms > 0).length,
      gotStudents: approvedRows.filter((r) => r.students > 0).length,
      assigned: approvedRows.filter((r) => r.assignments > 0).length,
      blocked: approvedRows.filter((r) => r.stage === 'blocked').length,
      awaitingSignup: approvedRows.filter((r) => r.stage === 'awaiting_signup').length,
      trialExpired: approvedRows.filter((r) => r.trialState === 'expired').length,
    },
  };
}
