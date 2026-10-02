/**
 * Teacher HQ class-progress strip.
 *
 * After a class has students AND at least one assignment, HQ should show
 * counts in-view (including zeros) so teachers see evidence of value before
 * the Teacher Pro ask. `assignmentCount === null` is unknown — never treat
 * unknown as zero (same pitfall as firstAssignmentCta).
 */

export interface ClassProgressStripState {
  studentCount: number;
  /** Null while the assignment list is unresolved or failed. */
  assignmentCount: number | null;
}

export function shouldShowClassProgressStrip({
  studentCount,
  assignmentCount,
}: ClassProgressStripState): boolean {
  if (assignmentCount === null) return false;
  if (studentCount < 1) return false;
  if (assignmentCount < 1) return false;
  return true;
}

export function sumAssignmentSubmissions(
  assignments: ReadonlyArray<{ completion_count?: number | null }>,
): number {
  return assignments.reduce((n, a) => n + (a.completion_count ?? 0), 0);
}
