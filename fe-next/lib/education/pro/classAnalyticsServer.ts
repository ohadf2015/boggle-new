import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassroomMetrics, CommonMistake, WordsAttemptedRecord } from '@/lib/supabase/analyticsTypes';
import { fetchInChunks } from './fetchAll';

export type ClassAnalytics = ClassroomMetrics & { commonMistakes: CommonMistake[] };

interface ProgressRow {
  student_id: string;
  lesson_id: string;
  total_xp: number | null;
  last_practice_date: string | null;
  words_attempted: WordsAttemptedRecord | null;
}

const MISTAKES_SHOWN = 5;
const NEEDS_HELP_ACCURACY = 0.6;
const MISTAKE_ERROR_RATE = 0.5;

function isoDay(d: Date): string {
  return d.toISOString().split('T')[0];
}

function tally(words: WordsAttemptedRecord | null): { correct: number; attempts: number } {
  let correct = 0;
  let attempts = 0;
  for (const w of Object.values(words ?? {})) {
    if (!w) continue;
    correct += w.correct || 0;
    attempts += w.attempts || 0;
  }
  return { correct, attempts };
}

function weekMetrics(rows: ProgressRow[], totalStudents: number): ClassroomMetrics {
  const today = isoDay(new Date());
  const perStudent = new Map<string, { xp: number; correct: number; attempts: number; last: string | null }>();
  for (const row of rows) {
    const { correct, attempts } = tally(row.words_attempted);
    const s = perStudent.get(row.student_id) ?? { xp: 0, correct: 0, attempts: 0, last: null };
    s.xp += row.total_xp || 0;
    s.correct += correct;
    s.attempts += attempts;
    if (row.last_practice_date && (!s.last || row.last_practice_date > s.last)) s.last = row.last_practice_date;
    perStudent.set(row.student_id, s);
  }
  let xp = 0;
  let needsHelp = 0;
  let activeToday = 0;
  for (const s of perStudent.values()) {
    xp += s.xp;
    if (s.attempts > 0 && s.correct / s.attempts < NEEDS_HELP_ACCURACY) needsHelp++;
    if (s.last === today) activeToday++;
  }
  return {
    studentsNeedingHelp: needsHelp,
    classAverageXp: perStudent.size > 0 ? Math.round(xp / perStudent.size) : 0,
    activeStudentsToday: activeToday,
    weeklyEngagement: 0,
    totalStudents,
  };
}

function commonMistakes(rows: ProgressRow[]): CommonMistake[] {
  const stats = new Map<string, { attempts: number; correct: number; students: Set<string> }>();
  for (const row of rows) {
    for (const [word, w] of Object.entries(row.words_attempted ?? {})) {
      if (!w) continue;
      const s = stats.get(word) ?? { attempts: 0, correct: 0, students: new Set<string>() };
      s.attempts += w.attempts || 0;
      s.correct += w.correct || 0;
      s.students.add(row.student_id);
      stats.set(word, s);
    }
  }
  const out: CommonMistake[] = [];
  for (const [word, s] of stats) {
    if (s.attempts === 0) continue;
    const errorRate = 1 - s.correct / s.attempts;
    if (errorRate > MISTAKE_ERROR_RATE) out.push({ word, errorRate, studentCount: s.students.size });
  }
  return out.sort((a, b) => b.errorRate - a.errorRate).slice(0, MISTAKES_SHOWN);
}

/**
 * Pro class dashboard numbers, read on the caller's own client so RLS still scopes every row.
 * Only the teacher's own and this class's assigned lessons count, and the teacher's own preview seat is not a student.
 */
export async function readClassAnalytics(
  sb: SupabaseClient,
  classroomId: string,
  teacherId: string,
): Promise<{ data: ClassAnalytics | null; error: { message: string } | null }> {
  const members = await fetchInChunks<{ student_id: string }>(
    sb, 'classroom_memberships', 'student_id', 'classroom_id', [classroomId], [{ op: 'neq', column: 'student_id', value: teacherId }],
  );
  if (members.error) return { data: null, error: members.error };
  const ids = [...new Set(members.data.map((m) => m.student_id))];
  if (ids.length === 0) return { data: { ...weekMetrics([], 0), commonMistakes: [] }, error: null };

  const [lessons, assigned] = await Promise.all([
    fetchInChunks<{ id: string }>(sb, 'vocabulary_lessons', 'id', 'teacher_id', [teacherId]),
    fetchInChunks<{ lesson_id: string }>(sb, 'lesson_assignments', 'lesson_id', 'classroom_id', [classroomId]),
  ]);
  const lessonError = lessons.error ?? assigned.error;
  if (lessonError) return { data: null, error: lessonError };
  const teacherLessons = new Set([...lessons.data.map((l) => l.id), ...assigned.data.map((a) => a.lesson_id)]);

  const progress = await fetchInChunks<ProgressRow>(
    sb, 'student_lesson_progress', 'id, student_id, lesson_id, total_xp, words_attempted, last_practice_date', 'student_id', ids,
  );
  if (progress.error) return { data: null, error: progress.error };

  const rows = progress.data.filter((r) => teacherLessons.has(r.lesson_id));
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const since = isoDay(weekStart);
  const thisWeek = rows.filter((r) => r.last_practice_date !== null && r.last_practice_date >= since);
  return { data: { ...weekMetrics(thisWeek, ids.length), commonMistakes: commonMistakes(rows) }, error: null };
}
