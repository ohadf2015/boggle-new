/**
 * The grade push itself: LexiClash progress (service role) → Classroom
 * studentSubmissions.patch. Split from the route so the route stays a thin
 * gate. Roster ids / emails stay in this function's memory; the result only
 * carries LexiClash student ids + LexiClash display names.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import {
  GoogleClassroomError,
  getCourseWork,
  listAllStudents,
  listAllSubmissions,
  patchSubmissionGrade,
  returnSubmission,
} from './googleClassroomApi';
import {
  gradePercentFromProgress,
  matchStudentsByEmail,
  scaleToMaxPoints,
  type LexiStudent,
  type ProgressRowLike,
  type UnmatchedReason,
} from './googleClassroomGrades';

export interface PushInput {
  admin: SupabaseClient;
  token: string;
  classroomId: string;
  lessonOrAssignmentId: string;
  courseId: string;
  courseWorkId: string;
  returnGrades: boolean;
}

type Named = { studentId: string; name: string | null };

export interface PushResult {
  updated: number;
  unmatched: Array<Named & { reason: UnmatchedReason }>;
  failed: Array<Named & { reason: string }>;
  skipped: Named[];
  retryAfter?: number;
}

/** Thrown for LexiClash-side problems the route maps to 4xx/5xx. */
export class PushInputError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

async function loadLexiSide(admin: SupabaseClient, classroomId: string, lessonOrAssignmentId: string) {
  const { data: assignment, error: aErr } = await admin
    .from('lesson_assignments')
    .select('id, lesson_id, classroom_id')
    .eq('classroom_id', classroomId)
    .or(`id.eq.${lessonOrAssignmentId},lesson_id.eq.${lessonOrAssignmentId}`)
    .maybeSingle();
  if (aErr) {
    logger.error('[gc-grades] assignment lookup failed', aErr);
    throw new PushInputError(500, 'assignment_lookup_failed');
  }
  if (!assignment) throw new PushInputError(404, 'assignment_not_found');
  const lessonId = (assignment as { lesson_id: string }).lesson_id;

  const { data: members, error: mErr } = await admin
    .from('classroom_memberships')
    .select('student_id')
    .eq('classroom_id', classroomId);
  if (mErr) {
    logger.error('[gc-grades] roster read failed', mErr);
    throw new PushInputError(500, 'roster_read_failed');
  }
  const ids = [...new Set(((members as Array<{ student_id: string }>) ?? []).map((m) => m.student_id))];
  if (ids.length === 0) throw new PushInputError(422, 'no_students');

  const [progressRes, profileRes] = await Promise.all([
    admin
      .from('student_lesson_progress')
      .select('student_id, completed_at, words_attempted, words_mastered')
      .eq('lesson_id', lessonId)
      .in('student_id', ids),
    admin.from('profiles').select('id, display_name, username').in('id', ids),
  ]);
  if (progressRes.error || profileRes.error) {
    logger.error('[gc-grades] progress/profile read failed', progressRes.error || profileRes.error);
    throw new PushInputError(500, 'progress_read_failed');
  }
  const progress = new Map<string, ProgressRowLike>();
  for (const p of (progressRes.data as Array<ProgressRowLike & { student_id: string }>) ?? []) progress.set(p.student_id, p);
  const names = new Map<string, string | null>();
  for (const p of (profileRes.data as Array<{ id: string; display_name?: string | null; username?: string | null }>) ?? []) {
    names.set(p.id, p.display_name?.trim() || p.username?.trim() || null);
  }

  // Emails live in auth.users only. Anonymous guests have none → unmatched, never guessed.
  const students: Array<LexiStudent & { name: string }> = await Promise.all(
    ids.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error) logger.warn('[gc-grades] getUserById failed', { id, message: error.message });
      const u = data?.user as { email?: string | null; is_anonymous?: boolean } | undefined;
      const email = u && !u.is_anonymous ? u.email ?? null : null;
      return { studentId: id, name: names.get(id) ?? '', email };
    }),
  );
  return { students, progress, names };
}

export async function pushGrades(input: PushInput): Promise<PushResult> {
  const { admin, token, courseId, courseWorkId, returnGrades } = input;
  const { students, progress, names } = await loadLexiSide(admin, input.classroomId, input.lessonOrAssignmentId);
  const nameOf = (id: string) => names.get(id) ?? null;

  const courseWork = await getCourseWork(token, courseId, courseWorkId);
  if (courseWork.associatedWithDeveloper === false) throw new PushInputError(409, 'not_linkable');
  if (!courseWork.maxPoints || courseWork.maxPoints <= 0) throw new PushInputError(422, 'ungraded');
  const maxPoints = courseWork.maxPoints;

  const [roster, submissions] = await Promise.all([
    listAllStudents(token, courseId),
    listAllSubmissions(token, courseId, courseWorkId),
  ]);
  // A roster with zero emails means classroom.profile.emails was not granted —
  // matching would report every student as not_in_course. Ask to reconnect instead.
  if (roster.length > 0 && !roster.some((r) => r.profile?.emailAddress)) {
    throw new GoogleClassroomError('reauth', 403, 'classroom.profile.emails not granted: roster has no emails');
  }
  const subByUser = new Map(submissions.map((s) => [s.userId, s.id]));
  const match = matchStudentsByEmail(students, roster);

  const result: PushResult = {
    updated: 0,
    unmatched: match.unmatched.map((u) => ({ studentId: u.studentId, name: nameOf(u.studentId), reason: u.reason })),
    failed: [],
    skipped: [],
  };

  let stopped = false;
  for (const m of match.matched) {
    const named = { studentId: m.studentId, name: nameOf(m.studentId) };
    const pct = gradePercentFromProgress(progress.get(m.studentId));
    if (pct == null) {
      result.skipped.push(named);
      continue;
    }
    if (stopped) {
      result.failed.push({ ...named, reason: 'rate_limited' });
      continue;
    }
    const submissionId = subByUser.get(m.googleUserId);
    if (!submissionId) {
      result.failed.push({ ...named, reason: 'no_submission' });
      continue;
    }
    try {
      const grade = scaleToMaxPoints(pct, maxPoints);
      await patchSubmissionGrade(token, courseId, courseWorkId, submissionId, grade, returnGrades);
      if (returnGrades) await returnSubmission(token, courseId, courseWorkId, submissionId);
      result.updated += 1;
    } catch (err) {
      if (err instanceof GoogleClassroomError) {
        logger.warn('[gc-grades] patch failed', { status: err.status, kind: err.kind, message: err.message });
        if (err.kind === 'rate_limited') {
          stopped = true;
          result.retryAfter = err.retryAfter;
        }
        result.failed.push({ ...named, reason: err.kind });
      } else {
        logger.error('[gc-grades] patch failed unexpectedly', err);
        result.failed.push({ ...named, reason: 'unknown' });
      }
    }
  }
  // Students not on the LexiClash roster with progress are simply not in `students`.
  if (result.failed.length > 0) {
    logger.warn('[gc-grades] push finished with failures', { updated: result.updated, failed: result.failed.length });
  }
  return result;
}
