/** Fold lesson_assignments + student_lesson_progress into digest inputs.
 *
 * Same mapping the Monday weekly-digest cron uses: expected = assignments ×
 * roster size; each completed_at row is one completion. Pure so HQ and cron
 * cannot drift.
 */

import type { WeeklyAssignmentCompletion } from './weeklyProgressDigest';

export function foldClassroomAssignmentWindow({
  assignments,
  completionRows,
  rosterSize,
}: {
  assignments: Array<{ id?: string | null; classroom_id?: string | null }>;
  completionRows: Array<{ assignment_id?: string | null; completed_at?: string | null }>;
  rosterSize: number;
}): {
  assignmentCount: number;
  assignmentExpected: number;
  assignmentCompletions: WeeklyAssignmentCompletion[];
} {
  const ids = new Set<string>();
  for (const row of assignments) {
    if (typeof row.id === 'string' && row.id) ids.add(row.id);
  }
  const assignmentCount = ids.size;
  const assignmentExpected = assignmentCount * Math.max(0, rosterSize);
  const assignmentCompletions: WeeklyAssignmentCompletion[] = [];
  for (const row of completionRows) {
    if (!row.assignment_id || !row.completed_at || !ids.has(row.assignment_id)) continue;
    assignmentCompletions.push({ completedAt: row.completed_at });
  }
  return { assignmentCount, assignmentExpected, assignmentCompletions };
}
