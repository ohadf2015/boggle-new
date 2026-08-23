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

import { isChipEcho, normalizeUseCase } from './useCaseChips';

export type TeacherStage =
  | 'declined'
  | 'awaiting_signup'
  | 'blocked'
  | 'approved'
  | 'created_class'
  | 'teaching';

/**
 * Where a stated reason came from. Counting these together is how a product ends up
 * reading its own marketing copy as market research — see useCaseChips.ts.
 */
export type UseCaseKind = 'free' | 'chip' | 'empty';

/**
 * Machine-written rows: fe-next/lib/education/__tests__/rls.test.ts inserted 16 of these
 * into production on 2026-08-20 (anon-insert is allowed by RLS, and the test had no
 * cleanup), which put "RLS Test" at the top of the admin queue and inflated `requested`
 * from 29 to 46.
 *
 * Deliberately exact, not a fuzzy `%test%`: that would also swallow contesta@, protest@,
 * and any school with "test" in its name. The test now cleans up after itself, so this is
 * only the second line of defence.
 */
export function isMachineRequest(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase();
  return e.endsWith('@example.com') || e.startsWith('rls-test-') || e.startsWith('rls-update-test-');
}

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
    use_case?: string | null;
    reviewed_at?: string | null;
    role?: string | null;
    school_or_org?: string | null;
    admin_note?: string | null;
  }>;
  profiles: Array<{
    id: string;
    user_role: string | null;
    last_seen_at?: string | null;
    display_name?: string | null;
    username?: string | null;
  }>;
  classrooms: Array<{
    id: string;
    teacher_id: string | null;
    name?: string | null;
    join_code?: string | null;
    language?: string | null;
    created_at?: string | null;
  }>;
  memberships: Array<{ classroom_id: string; student_id: string }>;
  assignments: Array<{ teacher_id: string | null }>;
  nowMs: number;
}

/**
 * One classroom, named, with whoever opened it. Listed CLASSROOM-first rather than
 * teacher-first on purpose: the funnel rows only cover people who filled in the access
 * form, so a classroom opened by anyone else (an admin, an early account, a manual grant)
 * is invisible there. The 2026-01-24 classroom is exactly that case — it predates the
 * access form and belongs to no request.
 */
export interface ClassroomRow {
  id: string;
  /** Empty/blank names are normalised to null so the UI can say "(unnamed)" rather than "". */
  name: string | null;
  joinCode: string | null;
  language: string | null;
  createdAt: string | null;
  teacherId: string | null;
  /** Best available human label: request full_name → profile display_name → username. */
  teacherName: string | null;
  /** Only known for teachers who came through the access form. */
  teacherEmail: string | null;
  /** False when the owner is not in `teacher_access_requests` — worth seeing, not hiding. */
  teacherIsApplicant: boolean;
  students: number;
}

export interface TeacherFunnelRow {
  requestId: string;
  userId: string | null;
  email: string;
  fullName: string | null;
  locale: string | null;
  country: string | null;
  status: string;
  /** What they called themselves: teacher | tutor | researcher | admin | parent | other. */
  role: string | null;
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
  /** What they said they wanted it for, verbatim. The one field that says WHY. */
  useCase: string | null;
  useCaseKind: UseCaseKind;
  reviewedAt: string | null;
  schoolOrOrg: string | null;
  adminNote: string | null;
}

/**
 * One distinct answer to "what will you use LexiClash for?", with how many people gave
 * it. Verbatim on purpose — no keyword buckets, no themes. At n≈29, and with a third of
 * the corpus being tapped example chips, a classifier would be inventing its categories
 * and presenting them as demand.
 */
export interface UseCaseReason {
  text: string;
  count: number;
  kind: UseCaseKind;
  roles: string[];
  countries: string[];
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
  /**
   * Approved, role granted, came back to the app since — and still has no classroom.
   * The leak the original panel could not show: `blocked` reads 0 (the grant works),
   * `approved` looks healthy, and yet nothing is being taught. These are the people
   * worth an email today, and their trial is the clock.
   */
  returnedNoClassroom: number;
  /** Same, filtered to a trial that has not run out yet. */
  returnedNoClassroomTrialActive: number;
  /** Machine rows dropped before any of the above was counted. Shown, not hidden. */
  excludedMachineRows: number;
}

export interface TeacherFunnelResult {
  rows: TeacherFunnelRow[];
  summary: TeacherFunnelSummary;
  /** Distinct stated reasons, most-given first. */
  reasons: UseCaseReason[];
  /**
   * Every classroom that exists, newest first — name + who opened it. Optional for the same
   * reason `activity` is: during a deploy window a cached client bundle can meet the older
   * API shape, and the panel defaults it rather than white-screening the whole admin page.
   */
  classrooms?: ClassroomRow[];
  /**
   * Raw row counts for the tables that hold evidence of teaching actually happening,
   * filled in by the route (buildTeacherFunnel is pure and does no IO). null for a table
   * that could not be counted — "we could not count" must not render as "there are none".
   */
  activity?: Record<string, number | null>;
}

function trialStateOf(expiresAt: string | null, nowMs: number): TrialState {
  if (!expiresAt) return 'none';
  return Date.parse(expiresAt) > nowMs ? 'active' : 'expired';
}

function useCaseKindOf(text: string | null | undefined): UseCaseKind {
  if (!normalizeUseCase(text)) return 'empty';
  return isChipEcho(text) ? 'chip' : 'free';
}

/**
 * Distinct answers with their counts. Grouped by normalised text so one answer given
 * twice (the form has no double-submit guard — two applicants submitted the same row
 * 3s and 51s apart on 2026-08-21) reads as count 2, not as two data points.
 */
function buildReasons(rows: TeacherFunnelRow[]): UseCaseReason[] {
  const byText = new Map<string, UseCaseReason>();
  for (const r of rows) {
    if (r.useCaseKind === 'empty') continue;
    const key = normalizeUseCase(r.useCase);
    const existing = byText.get(key);
    if (existing) {
      existing.count += 1;
      if (r.role && !existing.roles.includes(r.role)) existing.roles.push(r.role);
      if (r.country && !existing.countries.includes(r.country)) existing.countries.push(r.country);
      continue;
    }
    byText.set(key, {
      text: (r.useCase ?? '').replace(/\s+/g, ' ').trim(),
      count: 1,
      kind: r.useCaseKind,
      roles: r.role ? [r.role] : [],
      countries: r.country ? [r.country] : [],
    });
  }
  return [...byText.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

export function buildTeacherFunnel(input: TeacherFunnelInput): TeacherFunnelResult {
  const { profiles, classrooms, memberships, assignments, nowMs } = input;
  const requests = input.requests.filter((r) => !isMachineRequest(r.email));
  const excludedMachineRows = input.requests.length - requests.length;

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
      role: r.role ?? null,
      createdAt: r.created_at,
      trialExpiresAt: r.trial_expires_at,
      trialState: trialStateOf(r.trial_expires_at, nowMs),
      roleGranted,
      lastSeenAt: (r.user_id ? lastSeenById.get(r.user_id) : null) ?? null,
      classrooms: ownedClassrooms.length,
      students,
      assignments: assignmentCount,
      stage,
      useCase: r.use_case ?? null,
      useCaseKind: useCaseKindOf(r.use_case),
      reviewedAt: r.reviewed_at ?? null,
      schoolOrOrg: r.school_or_org ?? null,
      adminNote: r.admin_note ?? null,
    };
  });

  const approvedRows = rows.filter((r) => r.status === 'approved');
  // "Came back" = seen in the app after we approved them. Falls back to the request date
  // when reviewed_at is missing (older rows), which is the conservative direction: it can
  // only under-count returns, never invent one.
  const returned = approvedRows.filter(
    (r) =>
      r.roleGranted &&
      r.classrooms === 0 &&
      !!r.lastSeenAt &&
      Date.parse(r.lastSeenAt) > Date.parse(r.reviewedAt ?? r.createdAt),
  );

  // Identity for a classroom owner, best effort. The applicant row is preferred because it
  // carries a real email; profiles only has display_name/username. Neither is guaranteed,
  // so the UI falls back to the raw id — a row with a blank owner is worse than an ugly one.
  const requestByUserId = new Map(
    requests.filter((r) => r.user_id).map((r) => [r.user_id as string, r]),
  );
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const classroomRows: ClassroomRow[] = classrooms
    .map((c) => {
      const req = c.teacher_id ? requestByUserId.get(c.teacher_id) : undefined;
      const prof = c.teacher_id ? profileById.get(c.teacher_id) : undefined;
      const name = (c.name ?? '').trim();
      return {
        id: c.id,
        name: name || null,
        joinCode: c.join_code ?? null,
        language: c.language ?? null,
        createdAt: c.created_at ?? null,
        teacherId: c.teacher_id ?? null,
        teacherName:
          req?.full_name?.trim() || prof?.display_name?.trim() || prof?.username?.trim() || null,
        teacherEmail: req?.email ?? null,
        teacherIsApplicant: !!req,
        students: studentsByClassroom.get(c.id)?.size ?? 0,
      };
    })
    // Newest first, with undated rows last instead of NaN-comparing into a random position.
    .sort((a, b) => (a.createdAt ? Date.parse(a.createdAt) : -Infinity) < (b.createdAt ? Date.parse(b.createdAt) : -Infinity) ? 1 : -1);

  return {
    rows,
    reasons: buildReasons(rows),
    classrooms: classroomRows,
    summary: {
      returnedNoClassroom: returned.length,
      returnedNoClassroomTrialActive: returned.filter((r) => r.trialState === 'active').length,
      excludedMachineRows,
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
