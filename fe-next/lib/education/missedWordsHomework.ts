/**
 * Teacher Pro — "Missed-words homework": one tap gives every student THEIR OWN
 * missed words from the last live game as homework.
 *
 * STORAGE — no migration, one existing table:
 *   A plain `lesson_assignments` row (practice_focus NULL) per lesson the game
 *   drilled. The per-student words already exist: the live game wrote each
 *   player's per-word attempts/correct to `student_lesson_progress` for that
 *   lesson (backend/handlers/classroomGamePersistence.ts), and
 *   /student/review (`collectReviewCandidates`) ranks a student's own misses
 *   first. So one classroom row delivers different words to each student.
 *   The row also matters on its own: an express-launched lesson has
 *   `classroom_id = null`, and /api/education/practice/lessons only shows it to
 *   students through an assignment — without one the student cannot review it.
 *
 * LIMIT: `lesson_assignments.practice_focus` is CHECK-locked and has no
 * 'review' value, so the row cannot steer a student to the review mode by
 * itself; the Missed Words island on the student map is that entry point.
 * A student absent from the game has no misses on the lesson and gets its
 * unmastered words instead.
 */

import { defaultMissGapDueDate } from './missGapAsyncAssignment';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface HomeworkGameInput {
  lessonIds: string[];
  players: Array<{ studentId: string; name: string; lessonWordsMissed: string[] }>;
}

export interface HomeworkStudent {
  studentId: string;
  name: string;
  words: string[];
}

export interface MissedWordsHomeworkPlan {
  /** Real lessons still to assign (synthetic ids and already-assigned ones dropped). */
  lessonIds: string[];
  /** Every real lesson of the game is already assigned to this class. */
  alreadyAssigned: boolean;
  /** Students with at least one miss, most misses first. */
  students: HomeworkStudent[];
  studentCount: number;
  /** Distinct missed words across the class. */
  wordCount: number;
  /** YYYY-MM-DD, the miss-gap homework default window. */
  dueDate: string;
}

function dedupeWords(words: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const word = (raw || '').trim();
    const key = word.toLocaleLowerCase();
    if (!word || seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

/** Null when there is nothing to assign: no game, no real lesson, or no misses. */
export function buildMissedWordsHomeworkPlan(
  game: HomeworkGameInput | null | undefined,
  assignedLessonIds: Iterable<string>,
  now: Date = new Date()
): MissedWordsHomeworkPlan | null {
  if (!game) return null;
  const realLessons = [...new Set(game.lessonIds.filter((id) => UUID_RE.test(id)))];
  if (realLessons.length === 0) return null;

  const students = game.players
    .map((p) => ({ studentId: p.studentId, name: p.name, words: dedupeWords(p.lessonWordsMissed) }))
    .filter((s) => s.words.length > 0)
    .sort((a, b) => b.words.length - a.words.length);
  if (students.length === 0) return null;

  const assigned = new Set(assignedLessonIds);
  const lessonIds = realLessons.filter((id) => !assigned.has(id));

  return {
    lessonIds,
    alreadyAssigned: lessonIds.length === 0,
    students,
    studentCount: students.length,
    wordCount: dedupeWords(students.flatMap((s) => s.words)).length,
    dueDate: defaultMissGapDueDate(now),
  };
}

export type CreateAssignmentFn = (data: {
  classroom_id: string;
  lesson_id: string;
  teacher_id: string;
  due_date: string;
  practice_focus: null;
}) => Promise<{ data: unknown; error: { message: string } | null }>;

/** Writes the plan. Every failure is COUNTED (pitfalls class 4), never swallowed. */
export async function assignMissedWordsHomework(
  plan: MissedWordsHomeworkPlan,
  deps: { classroomId: string; teacherId: string; createAssignment: CreateAssignmentFn }
): Promise<{ created: number; failed: number }> {
  let created = 0;
  let failed = 0;
  for (const lessonId of plan.lessonIds) {
    try {
      const res = await deps.createAssignment({
        classroom_id: deps.classroomId,
        lesson_id: lessonId,
        teacher_id: deps.teacherId,
        due_date: plan.dueDate,
        practice_focus: null,
      });
      if (res.error || !res.data) failed += 1;
      else created += 1;
    } catch {
      failed += 1;
    }
  }
  return { created, failed };
}
