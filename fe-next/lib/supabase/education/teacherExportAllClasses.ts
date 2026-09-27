/**
 * Data source for the Teacher Pro "Export all classes" CSV.
 *
 * Fetches every classroom a teacher owns and every student in them with a
 * FIXED number of queries regardless of how many classrooms/students the
 * teacher has (no N+1 per student — see fetchInChunks below), then hands the
 * raw rows to the pure aggregator in lib/education/teacherExportAllClasses.ts.
 */

import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import { resolveDisplayName } from '@/lib/displayName';
import {
  buildTeacherExportRows,
  type TeacherExportRow,
} from '@/lib/education/teacherExportAllClasses';

/** Keeps `.in()` URLs well under PostgREST/proxy length limits. */
const CHUNK_SIZE = 100;
/** PostgREST's default page size — a table with more rows than this in one
 *  chunk would otherwise be silently truncated without paging. */
const PAGE_SIZE = 1000;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Fetches every row of `table` matching `column IN ids`, chunking the id
 * list and paginating each chunk past the 1000-row cap. Query count is
 * O(ids / CHUNK_SIZE * pages), never O(ids).
 */
async function fetchInChunks<Row>(
  table: string,
  select: string,
  column: string,
  ids: string[],
): Promise<{ data: Row[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };
  if (ids.length === 0) return { data: [], error: null };

  const out: Row[] = [];
  for (const idChunk of chunk(ids, CHUNK_SIZE)) {
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .in(column, idChunk)
        // Offset paging needs a stable order or rows can skip/repeat across pages.
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        logger.error(`Error fetching ${table} for teacher export:`, error);
        return { data: out, error: { message: error.message } };
      }
      if (!data || data.length === 0) break;
      out.push(...(data as Row[]));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return { data: out, error: null };
}

export async function getTeacherExportRows(
  teacherId: string,
): Promise<{ data: TeacherExportRow[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    const { data: classroomRows, error: classroomsError } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('teacher_id', teacherId);

    if (classroomsError) {
      logger.error('Error fetching classrooms for teacher export:', classroomsError);
      return { data: [], error: { message: classroomsError.message } };
    }

    const classrooms = (classroomRows ?? []) as Array<{ id: string; name: string }>;
    if (classrooms.length === 0) return { data: [], error: null };

    const classroomIds = classrooms.map((c) => c.id);

    const [membershipsResult, lessonAssignmentsResult] = await Promise.all([
      fetchInChunks<{ classroom_id: string; student_id: string }>(
        'classroom_memberships',
        'classroom_id, student_id',
        'classroom_id',
        classroomIds,
      ),
      fetchInChunks<{ classroom_id: string; lesson_id: string }>(
        'lesson_assignments',
        'classroom_id, lesson_id',
        'classroom_id',
        classroomIds,
      ),
    ]);

    if (membershipsResult.error) return { data: [], error: membershipsResult.error };
    if (lessonAssignmentsResult.error) return { data: [], error: lessonAssignmentsResult.error };

    const lessonAssignments = lessonAssignmentsResult.data.map((la) => ({
      classroomId: la.classroom_id,
      lessonId: la.lesson_id,
    }));

    const studentIds = [...new Set(membershipsResult.data.map((m) => m.student_id))];

    if (studentIds.length === 0) {
      return {
        data: buildTeacherExportRows({
          classrooms,
          memberships: [],
          profiles: [],
          lessonAssignments,
          progress: [],
          sessions: [],
        }),
        error: null,
      };
    }

    const [profilesResult, progressResult, sessionsResult] = await Promise.all([
      fetchInChunks<{ id: string; display_name: string | null; username: string | null }>(
        'public_profiles',
        'id, display_name, username',
        'id',
        studentIds,
      ),
      fetchInChunks<{
        student_id: string;
        lesson_id: string;
        total_xp: number | null;
        words_mastered: unknown[] | null;
        last_practice_date: string | null;
        completed_at: string | null;
      }>(
        'student_lesson_progress',
        'student_id, lesson_id, total_xp, words_mastered, last_practice_date, completed_at',
        'student_id',
        studentIds,
      ),
      fetchInChunks<{ student_id: string; lesson_id: string; completed_at: string | null }>(
        'practice_sessions',
        'student_id, lesson_id, completed_at',
        'student_id',
        studentIds,
      ),
    ]);

    if (profilesResult.error) return { data: [], error: profilesResult.error };
    if (progressResult.error) return { data: [], error: progressResult.error };
    if (sessionsResult.error) return { data: [], error: sessionsResult.error };

    const rows = buildTeacherExportRows({
      classrooms,
      memberships: membershipsResult.data.map((m) => ({
        classroomId: m.classroom_id,
        studentId: m.student_id,
      })),
      profiles: profilesResult.data.map((p) => {
        // resolveDisplayName's own contract: fallback must already be
        // localized via t() at the call site. This layer has no LanguageContext,
        // so it passes '' as a sentinel and lets a real placeholder/no-match
        // collapse to `null` — the CSV layer (which does have t()) then
        // substitutes the translated anonymous-student label instead of a
        // hardcoded English "Unknown".
        const resolved = resolveDisplayName([p.display_name, p.username], '');
        return { studentId: p.id, name: resolved.length > 0 ? resolved : null };
      }),
      lessonAssignments,
      progress: progressResult.data.map((p) => ({
        studentId: p.student_id,
        lessonId: p.lesson_id,
        totalXp: p.total_xp ?? 0,
        wordsMasteredCount: p.words_mastered?.length ?? 0,
        // last_practice_date is a DATE column but completed_at/practice
        // session timestamps are timestamptz — normalize both to YYYY-MM-DD
        // so "last active" never mixes date-only and full-timestamp values
        // in the same CSV column.
        lastPracticeDate: p.last_practice_date ? p.last_practice_date.slice(0, 10) : null,
        completedAt: p.completed_at,
      })),
      sessions: sessionsResult.data.map((s) => ({
        studentId: s.student_id,
        lessonId: s.lesson_id,
        completedAt: s.completed_at ? s.completed_at.slice(0, 10) : null,
      })),
    });

    return { data: rows, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Exception in getTeacherExportRows:', error);
    return { data: [], error: { message: error } };
  }
}
