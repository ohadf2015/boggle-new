/**
 * This week in the classroom, from student_lesson_progress totals.
 *
 * The award grant in #2096 reads total_xp and total_practice_sessions — columns
 * students cannot write. This folds those same totals for the teacher, scoped
 * to students whose last_practice_date falls in the last 7 days. Session counts
 * are the totals on record for those students, not a reconstructed weekly delta
 * the table does not store.
 */
import { ACHIEVEMENT_DEFINITIONS } from '@/backend/modules/educationAchievementDefinitions';
import { SERVER_AWARD_KEYS, serverAwardValues, type LessonXpRow } from '@/lib/education/studentAwards';

export const CLASSROOM_WEEK_MS = 7 * 86_400_000;

export interface RosterRow {
  classroomId: string;
  studentId: string;
}

export interface ProgressTotalRow {
  studentId: string;
  lessonId: string;
  totalXp: number | null;
  totalPracticeSessions: number | null;
  lastPracticeDate: string | null;
}

export interface GameActivityRow {
  classroomId: string;
  completedAt: string;
}

export interface ClassroomWeekDigest {
  studentsPracticed: number;
  practiceSessions: number;
  awardsEarned: number;
  practicedThisWeek: boolean;
}

export interface TeacherClassroomWeek {
  byClass: Record<string, ClassroomWeekDigest>;
  quietFor7Days: boolean;
  lastGameAt: string | null;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DEFINITIONS = new Map(ACHIEVEMENT_DEFINITIONS.map((def) => [def.key, def]));

export const EMPTY_CLASSROOM_WEEK: ClassroomWeekDigest = {
  studentsPracticed: 0,
  practiceSessions: 0,
  awardsEarned: 0,
  practicedThisWeek: false,
};

export function weekStartDate(nowMs: number): string {
  return new Date(nowMs - CLASSROOM_WEEK_MS).toISOString().slice(0, 10);
}

function practiceDate(value: string | null): string | null {
  if (!value || !DATE.test(value)) return null;
  return Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) ? null : value;
}

function awardsFromTotals(rows: LessonXpRow[]): number {
  const values = serverAwardValues(rows);
  let earned = 0;
  for (const key of SERVER_AWARD_KEYS) {
    const def = DEFINITIONS.get(key);
    if (def && values[key] >= def.tiers.bronze) earned += 1;
  }
  return earned;
}

export function summarizeTeacherClassrooms({
  roster,
  progress,
  games,
  nowMs,
}: {
  roster: readonly RosterRow[];
  progress: readonly ProgressTotalRow[];
  games: readonly GameActivityRow[];
  nowMs: number;
}): TeacherClassroomWeek {
  const start = weekStartDate(nowMs);
  const gameCutoff = nowMs - CLASSROOM_WEEK_MS;
  const studentsByClass = new Map<string, Set<string>>();
  for (const row of roster) {
    if (!row.classroomId || !row.studentId) continue;
    const set = studentsByClass.get(row.classroomId) ?? new Set<string>();
    set.add(row.studentId);
    studentsByClass.set(row.classroomId, set);
  }

  const lessonsByStudent = new Map<string, LessonXpRow[]>();
  const activeStudents = new Set<string>();
  for (const row of progress) {
    if (!row.studentId || !row.lessonId) continue;
    const lessons = lessonsByStudent.get(row.studentId) ?? [];
    lessons.push({
      lesson_id: row.lessonId,
      total_xp: row.totalXp,
      total_practice_sessions: row.totalPracticeSessions,
    });
    lessonsByStudent.set(row.studentId, lessons);
    const practicedOn = practiceDate(row.lastPracticeDate);
    if (practicedOn && practicedOn >= start) activeStudents.add(row.studentId);
  }

  const byClass: Record<string, ClassroomWeekDigest> = {};
  for (const [classroomId, studentIds] of studentsByClass) {
    let practiceSessions = 0;
    let awardsEarned = 0;
    let studentsPracticed = 0;
    for (const studentId of studentIds) {
      if (!activeStudents.has(studentId)) continue;
      studentsPracticed += 1;
      const lessons = lessonsByStudent.get(studentId) ?? [];
      practiceSessions += lessons.reduce((sum, lesson) => sum + (lesson.total_practice_sessions ?? 0), 0);
      awardsEarned += awardsFromTotals(lessons);
    }
    byClass[classroomId] = {
      studentsPracticed,
      practiceSessions,
      awardsEarned,
      practicedThisWeek: studentsPracticed > 0,
    };
  }

  let lastGameAt: string | null = null;
  let gameThisWeek = false;
  for (const game of games) {
    const at = Date.parse(game.completedAt);
    if (!Number.isFinite(at)) continue;
    if (!lastGameAt || game.completedAt > lastGameAt) lastGameAt = game.completedAt;
    if (at >= gameCutoff) gameThisWeek = true;
  }

  const rostered = new Set<string>();
  for (const ids of studentsByClass.values()) for (const id of ids) rostered.add(id);
  const practiceThisWeek = [...activeStudents].some((id) => rostered.has(id));

  return {
    byClass,
    quietFor7Days: !gameThisWeek && !practiceThisWeek,
    lastGameAt,
  };
}
