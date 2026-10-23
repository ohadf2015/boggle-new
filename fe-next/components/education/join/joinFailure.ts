import type { JoinClassroomErrorCode } from '@/hooks/useJoinClassroom';
import type { ClassroomJoinResult } from '@/lib/education/telemetry';

export type JoinFailureEffect = 'name_taken' | 'full' | 'invalid_code' | 'ended' | 'error';

export interface JoinFailure {
  /** An ended game is still reported as invalid_code until the telemetry union grows a session_ended value. */
  outcome: ClassroomJoinResult;
  effect: JoinFailureEffect;
}

const BY_CODE: Record<JoinClassroomErrorCode, JoinFailure> = {
  INVALID_CODE: { outcome: 'invalid_code', effect: 'invalid_code' },
  STUDENT_LIMIT_REACHED: { outcome: 'full', effect: 'full' },
  NAME_TAKEN: { outcome: 'name_taken', effect: 'name_taken' },
  SESSION_ENDED: { outcome: 'invalid_code', effect: 'ended' },
};

export function joinFailure(code: JoinClassroomErrorCode | undefined): JoinFailure {
  return (code && BY_CODE[code]) || { outcome: 'server_error', effect: 'error' };
}
