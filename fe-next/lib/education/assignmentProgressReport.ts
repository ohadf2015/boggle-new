/**
 * Pure model for the per-classroom assignment progress report.
 *
 * One row per (student × assignment): completed vs missing, plus word-level
 * score/accuracy when the completion row actually has them. Nothing here
 * fetches or translates — callers pass names and CSV column labels so a
 * Hebrew export is Hebrew end to end.
 */

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

/** RFC4180 cell: quote when the value contains comma, quote, or newline. */
export function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
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
