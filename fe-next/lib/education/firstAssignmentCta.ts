/**
 * Teacher HQ "first assignment" empty state.
 *
 * After a student joins, the next drop-off is "never run a class" — teachers
 * who never assign or go live never see teaching value and never convert.
 * This helper is the single visibility contract: show only when the class has
 * students, has never been given an assignment, and has no live room.
 *
 * `assignmentCount === null` is unknown (load/error). Unknown must not look
 * like "zero assignments" (recurring pitfall class 1).
 */
export interface FirstAssignmentCtaState {
  studentCount: number;
  /** Null while the assignment list is unresolved or failed. */
  assignmentCount: number | null;
  hasActiveRoom: boolean;
}

export function shouldShowFirstAssignmentCta({
  studentCount,
  assignmentCount,
  hasActiveRoom,
}: FirstAssignmentCtaState): boolean {
  if (assignmentCount === null) return false;
  if (studentCount < 1) return false;
  if (assignmentCount >= 1) return false;
  if (hasActiveRoom) return false;
  return true;
}

/** This browser started a live classroom room for this class. */
export function readHqLiveRoom(classroomId: string | null): boolean {
  if (typeof window === 'undefined' || !classroomId) return false;
  try {
    const raw = sessionStorage.getItem('lessonGameData');
    if (!raw) return false;
    const data = JSON.parse(raw) as { classroomId?: string; gameCode?: string };
    return data.classroomId === classroomId && typeof data.gameCode === 'string' && data.gameCode.length > 0;
  } catch {
    return false;
  }
}
