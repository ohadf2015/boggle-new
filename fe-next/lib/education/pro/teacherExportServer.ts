import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';
import { resolveDisplayName } from '@/lib/displayName';
import { buildTeacherExportRows, type TeacherExportRow } from '@/lib/education/teacherExportAllClasses';

const CHUNK_SIZE = 100;
const PAGE_SIZE = 1000;

type Result<T> = { data: T[]; error: { message: string } | null };

async function fetchInChunks<Row>(sb: SupabaseClient, table: string, select: string, column: string, ids: string[]): Promise<Result<Row>> {
  const out: Row[] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const idChunk = ids.slice(i, i + CHUNK_SIZE);
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await sb
        .from(table)
        .select(select)
        .in(column, idChunk)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) {
        logger.error(`[export-all] ${table} read failed`, error);
        return { data: [], error: { message: error.message } };
      }
      if (!data || data.length === 0) break;
      out.push(...(data as Row[]));
      if (data.length < PAGE_SIZE) break;
    }
  }
  return { data: out, error: null };
}

/** Server read of the Pro "Export all classes" CSV rows, on the caller's RLS-scoped client. */
export async function readTeacherExportRows(sb: SupabaseClient, teacherId: string): Promise<Result<TeacherExportRow>> {
  const { data: classroomRows, error: classroomsError } = await sb.from('classrooms').select('id, name').eq('teacher_id', teacherId);
  if (classroomsError) return { data: [], error: { message: classroomsError.message } };
  const classrooms = (classroomRows ?? []) as Array<{ id: string; name: string }>;
  if (classrooms.length === 0) return { data: [], error: null };
  const classroomIds = classrooms.map((c) => c.id);

  const [memberships, assignments] = await Promise.all([
    fetchInChunks<{ classroom_id: string; student_id: string }>(sb, 'classroom_memberships', 'classroom_id, student_id', 'classroom_id', classroomIds),
    fetchInChunks<{ classroom_id: string; lesson_id: string }>(sb, 'lesson_assignments', 'classroom_id, lesson_id', 'classroom_id', classroomIds),
  ]);
  const firstError = memberships.error ?? assignments.error;
  if (firstError) return { data: [], error: firstError };

  const studentIds = [...new Set(memberships.data.map((m) => m.student_id))];
  const [profiles, progress, sessions] = studentIds.length
    ? await Promise.all([
        fetchInChunks<{ id: string; display_name: string | null; username: string | null }>(sb, 'public_profiles', 'id, display_name, username', 'id', studentIds),
        fetchInChunks<{ student_id: string; lesson_id: string; total_xp: number | null; words_mastered: unknown[] | null; last_practice_date: string | null; completed_at: string | null }>(
          sb,
          'student_lesson_progress',
          'student_id, lesson_id, total_xp, words_mastered, last_practice_date, completed_at',
          'student_id',
          studentIds,
        ),
        fetchInChunks<{ student_id: string; lesson_id: string; completed_at: string | null }>(sb, 'practice_sessions', 'student_id, lesson_id, completed_at', 'student_id', studentIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const readError = profiles.error ?? progress.error ?? sessions.error;
  if (readError) return { data: [], error: readError };

  return {
    data: buildTeacherExportRows({
      classrooms,
      memberships: memberships.data.map((m) => ({ classroomId: m.classroom_id, studentId: m.student_id })),
      profiles: profiles.data.map((p) => {
        const name = resolveDisplayName([p.display_name, p.username], '');
        return { studentId: p.id, name: name.length > 0 ? name : null };
      }),
      lessonAssignments: assignments.data.map((a) => ({ classroomId: a.classroom_id, lessonId: a.lesson_id })),
      progress: progress.data.map((p) => ({
        studentId: p.student_id,
        lessonId: p.lesson_id,
        totalXp: p.total_xp ?? 0,
        wordsMastered: (p.words_mastered ?? []).filter((w): w is string => typeof w === 'string'),
        lastPracticeDate: p.last_practice_date ? p.last_practice_date.slice(0, 10) : null,
        completedAt: p.completed_at,
      })),
      sessions: sessions.data.map((s) => ({ studentId: s.student_id, lessonId: s.lesson_id, completedAt: s.completed_at ? s.completed_at.slice(0, 10) : null })),
    }),
    error: null,
  };
}
