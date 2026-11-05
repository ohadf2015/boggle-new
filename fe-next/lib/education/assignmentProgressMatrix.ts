/**
 * Pure model for the per-student assignment progress matrix (Teacher Pro).
 *
 * One row per roster student, one cell per assignment, assignments in
 * due_date order (then created time). Each cell carries `completed` and a
 * `correctness` percent (0-100) or null. The trend per student compares their
 * last two SCORED cells: 'up' | 'down' | 'flat', or 'none' when fewer than two
 * scored assignments exist.
 *
 * Correctness is derived exactly the way AssignmentProgressReport and the
 * Google Classroom grade passback derive it — `student_lesson_progress` has no
 * score column, so the number comes from `words_attempted` / `completed_at`
 * via `mapProgressRowToCompletion` (gradePercentFromProgress), never from an
 * invented column. Nothing here fetches or translates.
 */

import type { AssignmentProgressCompletion } from './assignmentProgressReport';

export type CorrectnessTrend = 'up' | 'down' | 'flat' | 'none';

export interface ProgressMatrixAssignment {
  id: string;
  title: string;
  dueDate: string | null;
  /** Tiebreaker after due_date; keep so equal due dates sort stably. */
  createdAt?: string | null;
}

export interface ProgressMatrixStudent {
  studentId: string;
  name: string;
}

export interface ProgressMatrixCell {
  completed: boolean;
  /** 0-100 when the assignment is completed, else null. */
  correctness: number | null;
}

export interface ProgressMatrixRow {
  studentId: string;
  studentName: string;
  /** One cell per entry in `assignments`, same order. */
  cells: ProgressMatrixCell[];
  trend: CorrectnessTrend;
}

export interface AssignmentProgressMatrix {
  assignments: { id: string; title: string; dueDate: string | null }[];
  rows: ProgressMatrixRow[];
}

/** Due date ascending; assignments without a due date go last; created time breaks ties. */
export function sortAssignmentsByDueDate<T extends ProgressMatrixAssignment>(assignments: T[]): T[] {
  return [...assignments].sort((a, b) => {
    const da = a.dueDate ? Date.parse(a.dueDate) : NaN;
    const db = b.dueDate ? Date.parse(b.dueDate) : NaN;
    const aHas = Number.isFinite(da);
    const bHas = Number.isFinite(db);
    if (aHas && bHas && da !== db) return da - db;
    if (aHas !== bHas) return aHas ? -1 : 1;
    const ca = a.createdAt ? Date.parse(a.createdAt) : NaN;
    const cb = b.createdAt ? Date.parse(b.createdAt) : NaN;
    if (Number.isFinite(ca) && Number.isFinite(cb) && ca !== cb) return ca - cb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function buildAssignmentProgressMatrix(args: {
  students: ProgressMatrixStudent[];
  assignments: ProgressMatrixAssignment[];
  /** Same shape AssignmentProgressReport consumes; `score` is the correctness percent. */
  completions: AssignmentProgressCompletion[];
}): AssignmentProgressMatrix {
  const assignments = sortAssignmentsByDueDate(args.assignments);
  const byPair = new Map<string, AssignmentProgressCompletion>();
  for (const c of args.completions) {
    byPair.set(`${c.studentId}\0${c.assignmentId}`, c);
  }

  const rows: ProgressMatrixRow[] = args.students.map((student) => {
    const cells: ProgressMatrixCell[] = assignments.map((assignment) => {
      const hit = byPair.get(`${student.studentId}\0${assignment.id}`);
      return {
        completed: Boolean(hit),
        correctness: hit && hit.score != null ? hit.score : null,
      };
    });

    const scored = cells.filter((cell) => cell.correctness != null).map((cell) => cell.correctness as number);
    let trend: CorrectnessTrend = 'none';
    if (scored.length >= 2) {
      const delta = scored[scored.length - 1] - scored[scored.length - 2];
      trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    }

    return { studentId: student.studentId, studentName: student.name, cells, trend };
  });

  return {
    assignments: assignments.map(({ id, title, dueDate }) => ({ id, title, dueDate: dueDate ?? null })),
    rows,
  };
}
