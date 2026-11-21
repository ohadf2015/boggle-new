/**
 * Teacher-scoped read of student_lesson_progress totals and recent classroom games.
 * RLS already limits progress to is_teacher_of_student; the roster filter keeps
 * another class's students out of this digest.
 */
import { CLASSROOM_WEEK_MS, summarizeTeacherClassrooms, type TeacherClassroomWeek } from './classroomWeekActivity';

const ROW_CAP = 2000;
const TRUNCATED = 'progress window truncated';

function fullPage(count: number, cap: number): boolean {
  return count >= cap;
}

export interface WeekQuery extends PromiseLike<QueryResult<Record<string, unknown>>> {
  select(columns: string): WeekQuery;
  in(column: string, values: readonly string[]): WeekQuery;
  gte(column: string, value: string): WeekQuery;
  not(column: string, operator: string, value: null): WeekQuery;
  order(column: string, options: { ascending: boolean }): WeekQuery;
  limit(count: number): WeekQuery;
}

export interface WeekDb {
  from(table: string): WeekQuery;
}

interface QueryResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export interface LoadedClassroomWeek {
  summary: TeacherClassroomWeek;
  error: string | null;
}

const NOT_QUIET: TeacherClassroomWeek = { byClass: {}, quietFor7Days: false, lastGameAt: null };

function asRows<T>(result: QueryResult<T>): { rows: T[]; error: string | null } {
  if (result.error) return { rows: [], error: result.error.message };
  return { rows: result.data ?? [], error: null };
}

export async function loadClassroomWeekRows(
  db: WeekDb | null,
  classroomIds: readonly string[],
  nowMs: number,
  rowCap: number = ROW_CAP,
): Promise<LoadedClassroomWeek> {
  const ids = [...new Set(classroomIds.filter(Boolean))];
  if (ids.length === 0) {
    return { summary: NOT_QUIET, error: null };
  }
  if (!db) return { summary: NOT_QUIET, error: 'Supabase not configured' };

  const since = new Date(nowMs - CLASSROOM_WEEK_MS).toISOString();
  const start = since.slice(0, 10);
  const memberships = asRows(
    await db.from('classroom_memberships').select('classroom_id, student_id').in('classroom_id', ids).limit(rowCap),
  );
  if (memberships.error) return { summary: NOT_QUIET, error: memberships.error };
  if (fullPage(memberships.rows.length, rowCap)) return { summary: NOT_QUIET, error: TRUNCATED };

  const studentIds = [...new Set(memberships.rows.map((row) => row.student_id).filter((id): id is string => typeof id === 'string' && id !== ''))];
  const weekProgress = studentIds.length
    ? asRows(
        await db
          .from('student_lesson_progress')
          .select('student_id, lesson_id, total_xp, total_practice_sessions, last_practice_date')
          .in('student_id', studentIds)
          .gte('last_practice_date', start)
          .limit(rowCap),
      )
    : { rows: [], error: null };
  if (weekProgress.error) return { summary: NOT_QUIET, error: weekProgress.error };
  if (fullPage(weekProgress.rows.length, rowCap)) return { summary: NOT_QUIET, error: TRUNCATED };

  const activeIds = [...new Set(weekProgress.rows.map((row) => row.student_id).filter((id): id is string => typeof id === 'string' && id !== ''))];
  const progress = activeIds.length
    ? asRows(
        await db
          .from('student_lesson_progress')
          .select('student_id, lesson_id, total_xp, total_practice_sessions, last_practice_date')
          .in('student_id', activeIds)
          .limit(rowCap),
      )
    : { rows: [], error: null };
  if (progress.error) return { summary: NOT_QUIET, error: progress.error };
  if (fullPage(progress.rows.length, rowCap)) return { summary: NOT_QUIET, error: TRUNCATED };

  const games = asRows(
    await db
      .from('practice_sessions')
      .select('classroom_id, completed_at')
      .in('classroom_id', ids)
      .gte('completed_at', since)
      .not('results->>gameCode', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1),
  );
  if (games.error) return { summary: NOT_QUIET, error: games.error };

  return {
    summary: summarizeTeacherClassrooms({
      roster: memberships.rows.flatMap((row) =>
        typeof row.classroom_id === 'string' && typeof row.student_id === 'string'
          ? [{ classroomId: row.classroom_id, studentId: row.student_id }]
          : [],
      ),
      progress: progress.rows.flatMap((row) =>
        typeof row.student_id === 'string' && typeof row.lesson_id === 'string'
          ? [{
              studentId: row.student_id,
              lessonId: row.lesson_id,
              totalXp: typeof row.total_xp === 'number' ? row.total_xp : null,
              totalPracticeSessions: typeof row.total_practice_sessions === 'number' ? row.total_practice_sessions : null,
              lastPracticeDate: typeof row.last_practice_date === 'string' ? row.last_practice_date : null,
            }]
          : [],
      ),
      games: games.rows.flatMap((row) =>
        typeof row.classroom_id === 'string' && typeof row.completed_at === 'string'
          ? [{ classroomId: row.classroom_id, completedAt: row.completed_at }]
          : [],
      ),
      nowMs,
    }),
    error: null,
  };
}
