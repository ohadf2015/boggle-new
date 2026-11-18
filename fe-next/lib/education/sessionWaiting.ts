import { classroomTeacherHomePath } from '@/lib/education/classroomRoomGone';

/**
 * An ended classroom code is not a dead room and not a retry.
 * The join page enrolls the student and the class page waits for the next game.
 */
export const SESSION_WAITING_CODE = 'CLASSROOM_SESSION_WAITING';

export function isSessionWaiting(code: string | undefined): boolean {
  return code === SESSION_WAITING_CODE;
}

export function sessionWaitingHref(code: string, language: string, isHost = false): string {
  if (isHost) return classroomTeacherHomePath(language);
  return `/${language || 'en'}/join/${code.trim().toUpperCase()}`;
}
