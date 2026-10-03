/**
 * Teacher HQ "start live classroom game" CTA after the first assignment.
 *
 * FirstAssignmentPanel owns students + 0 assignments. GetStudentsInCard (PR
 * #1207) owns the empty-roster join panel. This helper is the next step:
 * students are in AND at least one assignment exists — start a live class
 * before Teacher Pro conversion.
 *
 * `assignmentCount === null` is unknown. Unknown must not look like "has an
 * assignment" (same pitfall as firstAssignmentCta).
 */
export interface StartLiveClassCtaState {
  studentCount: number;
  /** Null while the assignment list is unresolved or failed. */
  assignmentCount: number | null;
}

export function shouldShowStartLiveClassCta({
  studentCount,
  assignmentCount,
}: StartLiveClassCtaState): boolean {
  if (assignmentCount === null) return false;
  if (studentCount < 1) return false;
  if (assignmentCount < 1) return false;
  return true;
}

/** Deep-link into the existing classroom-game lobby for this class. */
export function liveClassroomHref(language: string, classroomId: string): string {
  return `/${language}/education/classroom-game?classroomId=${encodeURIComponent(classroomId)}`;
}
