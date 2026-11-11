import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClassroomMetrics, CommonMistake, WordsAttemptedRecord } from '@/lib/supabase/analyticsTypes';
import { fetchInChunks } from './fetchAll';
import { buildDailyActive, buildStudentPulses, lastActivityDay, type DailyActive, type StudentPulse } from './classInsights';

export type ClassAnalytics = ClassroomMetrics & {
  commonMistakes: CommonMistake[];
  students: StudentPulse[];
  dailyActive: DailyActive[];
};

interface ProgressRow {
  student_id: string;
  lesson_id: string;
  total_xp: number | null;
  last_practice_date: string | null;
  words_attempted: WordsAttemptedRecord | null;
}

const MISTAKES_SHOWN = 5;
const MISTAKE_ERROR_RATE = 0.5;

function isoDay(d: Date): string {
  return d.toISOString().split('T')[0];
}

function weekMetrics(rows: ProgressRow[], totalStudents: number): ClassroomMetrics {
  const today = isoDay(new Date());
  const perStudent = new Map<string, { xp: number; last: string | null }>();
  for (const row of rows) {
    const s = perStudent.get(row.student_id) ?? { xp: 0, last: null };
    s.xp += row.total_xp || 0;
    const day = lastActivityDay(row);
    if (day && (!s.last || day > s.last)) s.last = day;
    perStudent.set(row.student_id, s);
  }
  let xp = 0;
  let activeToday = 0;
  for (const s of perStudent.values()) {
    xp += s.xp;
    if (s.last === today) activeToday++;
  }
  return {
    studentsNeedingHelp: 0,
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
  if (ids.length === 0) return { data: { ...weekMetrics([], 0), commonMistakes: [], students: [], dailyActive: buildDailyActive([], isoDay(new Date())) }, error: null };

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
  const thisWeek = rows.filter((r) => {
    const day = lastActivityDay(r);
    return day !== null && day >= since;
  });
  const today = isoDay(new Date());
  const students = buildStudentPulses(rows, ids, today);
  return {
    data: {
      ...weekMetrics(thisWeek, ids.length),
      studentsNeedingHelp: students.filter((s) => s.status === 'needsHelp').length,
      commonMistakes: commonMistakes(rows),
      students,
      dailyActive: buildDailyActive(rows, today),
    },
    error: null,
  };
}
