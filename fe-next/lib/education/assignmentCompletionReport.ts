/**
 * Compact per-assignment submitted/roster counts for the classroom
 * report/assignments view. 0 submitted is a valid classroom state.
 */

export interface AssignmentCompletionInput {
  id: string;
  title?: string | null;
  vocabulary_lessons?: { name?: string | null } | null;
  completion_count?: number | null;
  student_count?: number | null;
}

export interface AssignmentCompletionSummary {
  assignmentId: string;
  title: string;
  submitted: number;
  roster: number;
}

export function summarizeAssignmentCompletions(
  assignments: AssignmentCompletionInput[],
  untitled = 'Untitled lesson',
): AssignmentCompletionSummary[] {
  return assignments.map((assignment) => ({
    assignmentId: assignment.id,
    title: assignment.title || assignment.vocabulary_lessons?.name || untitled,
    submitted: Math.max(0, assignment.completion_count ?? 0),
    roster: Math.max(0, assignment.student_count ?? 0),
  }));
}
