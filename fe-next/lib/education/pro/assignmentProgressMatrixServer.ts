/**
 * Server-side read for the per-student assignment progress matrix.
 *
 * Runs on the request-scoped Supabase client (RLS), so the rows a teacher
 * receives are the rows they own. Mirrors the queries the client helpers in
 * lib/supabase/education used to run for the on-screen report — the gated
 * report reads here instead so a free or expired-trial browser never gets
 * per-student scores from the client. Pure shaping lives in
 * assignmentProgressMatrix.ts; this file only fetches.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapProgressRowToCompletion,
  type AssignmentProgressCompletion,
  type AssignmentProgressSourceRow,
} from '@/lib/education/assignmentProgressReport';
import {
  buildAssignmentProgressMatrix,
  type AssignmentProgressMatrix,
} from '@/lib/education/assignmentProgressMatrix';
import { teacherFacingName } from '@/lib/education/rosterName';

export async function readAssignmentProgressMatrix(
  sb: SupabaseClient,
  classroomId: string,
): Promise<{ data: AssignmentProgressMatrix | null; error: { message: string } | null }> {
  const { data: assignments, error: assignmentsError } = await sb
    .from('lesson_assignments')
    .select('id, title, due_date, created_at, vocabulary_lessons(name)')
    .eq('classroom_id', classroomId);
  if (assignmentsError) return { data: null, error: { message: assignmentsError.message } };

  const { data: memberships, error: membersError } = await sb
    .from('classroom_memberships')
    .select('student_id, roster_name')
    .eq('classroom_id', classroomId)
    .order('joined_at', { ascending: true });
  if (membersError) return { data: null, error: { message: membersError.message } };

  const studentIds = [...new Set((memberships ?? []).map((m: { student_id: string }) => m.student_id))];
  const { data: profiles } = studentIds.length
    ? await sb.from('public_profiles').select('id, username, display_name').in('id', studentIds)
    : { data: [] };

  const assignmentIds = (assignments ?? []).map((a: { id: string }) => a.id);
  const { data: progressRows, error: progressError } = assignmentIds.length
    ? await sb
        .from('student_lesson_progress')
        .select('student_id, assignment_id, completed_at, words_attempted')
        .in('assignment_id', assignmentIds)
        .not('completed_at', 'is', null)
    : { data: [], error: null };
  if (progressError) return { data: null, error: { message: progressError.message } };

  type NameProfile = { id: string; username?: string | null; display_name?: string | null };
  const profileMap = new Map((profiles ?? []).map((p: NameProfile) => [p.id, p]));
  type ProgressRow = AssignmentProgressSourceRow & { assignment_id?: string | null };
  const matrix = buildAssignmentProgressMatrix({
    students: (memberships ?? []).map((m: { student_id: string; roster_name?: string | null }) => ({
      studentId: m.student_id,
      name: teacherFacingName(m.roster_name, profileMap.get(m.student_id), m.student_id.slice(0, 8)),
    })),
    assignments: (assignments ?? []).map((a: {
      id: string;
      title?: string | null;
      due_date?: string | null;
      created_at?: string | null;
      vocabulary_lessons?: { name?: string | null } | { name?: string | null }[] | null;
    }) => {
      const lesson = Array.isArray(a.vocabulary_lessons) ? a.vocabulary_lessons[0] : a.vocabulary_lessons;
      return {
        id: a.id,
        title: a.title || lesson?.name || 'Untitled lesson',
        dueDate: a.due_date ?? null,
        createdAt: a.created_at ?? null,
      };
    }),
    completions: (progressRows ?? []).map((row: ProgressRow) =>
      mapProgressRowToCompletion(String(row.assignment_id ?? ''), row),
    ) satisfies AssignmentProgressCompletion[],
  });

  return { data: matrix, error: null };
}
