/**
 * Pure model for the per-classroom assignment progress report.
 *
 * One row per (student × assignment): completed vs missing, plus word-level
 * score/accuracy when the completion row actually has them. Nothing here
 * fetches or translates — callers pass names and CSV column labels so a
 * Hebrew export is Hebrew end to end.
 *
 * `student_lesson_progress` has NO `score`/`accuracy` column (see
 * fe-next/supabase/migrations/056_teacher_vocabulary_builder.sql +
 * 062_education_xp_tracking.sql) — it only has `words_attempted` (jsonb) and
 * `completed_at`. `mapProgressRowToCompletion` below derives the percentage
 * from those real columns via `gradePercentFromProgress`, the SAME function
 * the Google Classroom grade passback uses, so the on-screen/CSV score and
 * the pushed passback grade can never disagree.
 */

import { gradePercentFromProgress, type ProgressRowLike } from './googleClassroomGrades';

export type AssignmentProgressStatus = 'completed' | 'missing';

export interface AssignmentProgressStudent {
  studentId: string;
  name: string;
}

export interface AssignmentProgressAssignment {
  id: string;
  title: string;
}

export interface AssignmentProgressCompletion {
  assignmentId: string;
  studentId: string;
  score?: number | null;
  accuracy?: number | null;
  completedAt?: string | null;
}

/** Shape of a real `student_lesson_progress` row, as returned by `getAssignmentCompletions`. */
export interface AssignmentProgressSourceRow extends ProgressRowLike {
  student_id: string;
}

/**
 * Turn one raw `student_lesson_progress` row into a completion the pure model
 * above understands. `assignmentId` is passed explicitly rather than read off
 * the row: the caller already knows which assignment this batch belongs to
 * (it queried `.eq('assignment_id', assignmentId)`), so trusting that over an
 * echoed column keeps a null/mismatched `assignment_id` from ever mattering.
 *
 * There is only one derivable number for a single assignment completion —
 * Σcorrect/Σattempts from `words_attempted`, or 100 for a bare completion —
 * so `score` and `accuracy` both carry that same percentage. No data at all
 * (row not completed / nothing attempted) → `null`, rendered as "—", never 0.
 */
export function mapProgressRowToCompletion(
  assignmentId: string,
  row: AssignmentProgressSourceRow,
): AssignmentProgressCompletion {
  const percent = gradePercentFromProgress(row);
  return {
    assignmentId,
    studentId: row.student_id,
    score: percent,
    accuracy: percent,
    completedAt: row.completed_at ?? null,
  };
}

export interface AssignmentProgressRow {
  studentId: string;
  studentName: string;
  assignmentId: string;
  assignmentTitle: string;
  status: AssignmentProgressStatus;
  score: number | null;
  accuracy: number | null;
  completedAt: string | null;
}

export interface AssignmentProgressCsvLabels {
  student: string;
  assignment: string;
  status: string;
  score: string;
  accuracy: string;
  completedAt: string;
  completed: string;
  missing: string;
}

export function buildAssignmentProgressRows(args: {
  students: AssignmentProgressStudent[];
  assignments: AssignmentProgressAssignment[];
  completions: AssignmentProgressCompletion[];
}): AssignmentProgressRow[] {
  const { students, assignments, completions } = args;
  if (students.length === 0 || assignments.length === 0) return [];

  const byPair = new Map<string, AssignmentProgressCompletion>();
  for (const c of completions) {
    byPair.set(`${c.studentId}\0${c.assignmentId}`, c);
  }

  const rows: AssignmentProgressRow[] = [];
  for (const student of students) {
    for (const assignment of assignments) {
      const hit = byPair.get(`${student.studentId}\0${assignment.id}`);
      const completed = Boolean(hit);
      rows.push({
        studentId: student.studentId,
        studentName: student.name,
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        status: completed ? 'completed' : 'missing',
        score: completed && hit?.score != null ? hit.score : null,
        accuracy: completed && hit?.accuracy != null ? hit.accuracy : null,
        completedAt: completed ? hit?.completedAt ?? null : null,
      });
    }
  }
  return rows;
}

/**
 * RFC4180 cell + CSV-formula-injection guard, shared by every CSV export in
 * the app (reused by teacherExportAllClasses.ts).
 *
 * Order matters: neutralize a leading =, +, -, or @ FIRST (Excel/Sheets treat
 * any of those as "this cell is a formula", so a student/classroom name like
 * `=HYPERLINK(...)` would otherwise execute when the teacher opens the file),
 * then apply the normal quote/comma/newline wrap on the result.
 */
export function csvEscape(value: string): string {
  const neutralized = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(neutralized)) return `"${neutralized.replace(/"/g, '""')}"`;
  return neutralized;
}

export function assignmentProgressToCsv(
  rows: AssignmentProgressRow[],
  labels: AssignmentProgressCsvLabels,
): string {
  const header = [
    labels.student,
    labels.assignment,
    labels.status,
    labels.score,
    labels.accuracy,
    labels.completedAt,
  ]
    .map(csvEscape)
    .join(',');

  const body = rows.map((row) =>
    [
      csvEscape(row.studentName),
      csvEscape(row.assignmentTitle),
      csvEscape(row.status === 'completed' ? labels.completed : labels.missing),
      row.score == null ? '' : String(row.score),
      row.accuracy == null ? '' : String(row.accuracy),
      row.completedAt == null ? '' : csvEscape(row.completedAt),
    ].join(','),
  );

  return [header, ...body].join('\n');
}

export function downloadCsvFile(fileName: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim()}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
