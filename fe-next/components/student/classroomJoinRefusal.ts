import type { ClassroomGameErrorCode } from '@/shared/constants/classroomGameErrors';

/** Retry reasons get a Join-again message; terminal ones say who to ask. */
export const CLASSROOM_JOIN_REFUSAL_KEYS = {
  ended: 'student.activeGame.joinEnded',
  notMember: 'student.activeGame.joinNotMember',
  signIn: 'student.activeGame.joinSignIn',
  busy: 'student.activeGame.joinBusy',
  full: 'student.activeGame.joinFull',
  removed: 'student.activeGame.joinRemoved',
  locked: 'education.student.join.roomLocked.hint',
  teacherOnly: 'economy.error.not_teacher',
  noQuestions: 'vocabQuiz.errors.noQuestions',
  retry: 'student.activeGame.joinRetry',
} as const;

export type ClassroomJoinRefusalReason = keyof typeof CLASSROOM_JOIN_REFUSAL_KEYS;

export interface ClassroomJoinRefusal {
  refusal: ClassroomJoinRefusalReason;
  messageKey: (typeof CLASSROOM_JOIN_REFUSAL_KEYS)[ClassroomJoinRefusalReason];
}

export const REASON_BY_CODE: Record<ClassroomGameErrorCode | 'GAME_FULL' | 'PLAYER_KICKED' | 'PLAYER_BLOCKED', ClassroomJoinRefusalReason> = {
  AUTH_REQUIRED: 'signIn',
  AUTH_UNVERIFIED: 'busy',
  USER_ID_MISMATCH: 'signIn',
  INVALID_PAYLOAD: 'retry',
  NOT_TEACHER: 'teacherOnly',
  NOT_A_MEMBER: 'notMember',
  LOOKUP_UNAVAILABLE: 'busy',
  // A room lost to a server restart reads "not found" too; joining again usually works.
  GAME_NOT_FOUND: 'retry',
  GAME_ENDED: 'ended',
  GAME_ALREADY_STARTED: 'teacherOnly',
  ROOM_LOCKED: 'locked',
  JOIN_THREW: 'busy',
  CREATE_FAILED: 'busy',
  LIST_FAILED: 'busy',
  START_FAILED: 'busy',
  MODE_SWITCH_FAILED: 'teacherOnly',
  MODE_SWITCH_MID_ROUND: 'teacherOnly',
  PRESSURE_FAILED: 'teacherOnly',
  PRESSURE_NEEDS_PRO: 'teacherOnly',
  LOBBY_LOCK_FAILED: 'teacherOnly',
  NO_QUIZ_QUESTIONS: 'noQuestions',
  GAME_FULL: 'full',
  PLAYER_KICKED: 'removed',
  PLAYER_BLOCKED: 'removed',
};

export function classifyClassroomJoinRefusal(
  payload: { code?: string } | null | undefined
): ClassroomJoinRefusal {
  const refusal = (payload?.code && (REASON_BY_CODE as Record<string, ClassroomJoinRefusalReason>)[payload.code]) || 'retry';
  return { refusal, messageKey: CLASSROOM_JOIN_REFUSAL_KEYS[refusal] };
}
