import type { JoinClassroomErrorCode } from '@/hooks/useJoinClassroom';
import type { ClassroomJoinResult } from '@/lib/education/telemetry';
import { ROOM_LOCKED } from '@/shared/types/classroomLobbyLock';

export type JoinFailureEffect = 'name_taken' | 'full' | 'locked' | 'invalid_code' | 'ended' | 'error';

export const ROOM_LOCKED_KEY = 'education.student.join.roomLocked.title';

export interface JoinFailure {
  /** An ended game is still reported as invalid_code until the telemetry union grows a session_ended value. */
  outcome: ClassroomJoinResult;
  effect: JoinFailureEffect;
  /** The line shown under the form, for refusals the student can only wait out. */
  formErrorKey?: string;
}

const BY_CODE: Record<JoinClassroomErrorCode | typeof ROOM_LOCKED, JoinFailure> = {
  INVALID_CODE: { outcome: 'invalid_code', effect: 'invalid_code' },
  STUDENT_LIMIT_REACHED: { outcome: 'full', effect: 'full', formErrorKey: 'education.student.join.classroomFull' },
  ROOM_LOCKED: { outcome: 'room_locked', effect: 'locked', formErrorKey: ROOM_LOCKED_KEY },
  NAME_TAKEN: { outcome: 'name_taken', effect: 'name_taken' },
  SESSION_ENDED: { outcome: 'invalid_code', effect: 'ended' },
};

export function joinFailure(code: JoinClassroomErrorCode | typeof ROOM_LOCKED | undefined): JoinFailure {
  return (code && BY_CODE[code]) || { outcome: 'server_error', effect: 'error' };
}
