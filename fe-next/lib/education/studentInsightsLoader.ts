/**
 * The one read both the parent page and the teacher's student view use, so the
 * two can only ever show the same numbers. Takes a service-role client: the
 * parent page has no session, and a teacher's RLS-scoped read can return zero
 * rows with no error, which would look like a student with no progress.
 */
import {
  buildStudentInsights,
  type InsightProgressRow,
  type InsightSessionRow,
  type StudentInsights,
} from './studentInsights';

export interface InsightsClient {
  from: (table: string) => any;
}

/** Newest-first sessions. High enough that the all-time practice total is not cut short for any real student. */
export const INSIGHT_SESSION_LIMIT = 2000;

export type StudentInsightsResult =
  | { ok: true; insights: StudentInsights; recentSessions: string[] }
  | { ok: false; message: string };

export async function loadStudentInsights(
  client: InsightsClient,
  studentId: string,
  classroomId: string,
  now: Date = new Date(),
): Promise<StudentInsightsResult> {
  const [progress, sessions] = await Promise.all([
    client
      .from('student_lesson_progress')
      .select('total_xp, words_mastered, words_attempted, completed_at, current_streak, longest_streak')
      .eq('student_id', studentId),
    client
      .from('practice_sessions')
      .select('completed_at, words_attempted, words_correct, time_spent_seconds, duration_seconds')
      .eq('student_id', studentId)
      .eq('classroom_id', classroomId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(INSIGHT_SESSION_LIMIT),
  ]);
  if (progress.error) return { ok: false, message: progress.error.message };
  if (sessions.error) return { ok: false, message: sessions.error.message };

  const sessionRows = (sessions.data ?? []) as InsightSessionRow[];
  return {
    ok: true,
    insights: buildStudentInsights({
      progressRows: (progress.data ?? []) as InsightProgressRow[],
      sessionRows,
      now,
    }),
    recentSessions: sessionRows
      .map((row) => row.completed_at)
      .filter((at): at is string => typeof at === 'string'),
  };
}
