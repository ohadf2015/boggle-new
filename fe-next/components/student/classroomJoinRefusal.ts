/** Retry reasons get a Join-again message; terminal ones say who to ask. */
export const CLASSROOM_JOIN_REFUSAL_KEYS = {
  ended: 'student.activeGame.joinEnded',
  notMember: 'student.activeGame.joinNotMember',
  signIn: 'student.activeGame.joinSignIn',
  busy: 'student.activeGame.joinBusy',
  full: 'student.activeGame.joinFull',
  removed: 'student.activeGame.joinRemoved',
  retry: 'student.activeGame.joinRetry',
} as const;

export type ClassroomJoinRefusalReason = keyof typeof CLASSROOM_JOIN_REFUSAL_KEYS;

export interface ClassroomJoinRefusal {
  refusal: ClassroomJoinRefusalReason;
  messageKey: (typeof CLASSROOM_JOIN_REFUSAL_KEYS)[ClassroomJoinRefusalReason];
}

const REASON_BY_CODE: Record<string, ClassroomJoinRefusalReason> = {
  GAME_ENDED: 'ended',
  NOT_A_MEMBER: 'notMember',
  AUTH_REQUIRED: 'signIn',
  USER_ID_MISMATCH: 'signIn',
  LOOKUP_UNAVAILABLE: 'busy',
  JOIN_THREW: 'busy',
  GAME_FULL: 'full',
  PLAYER_KICKED: 'removed',
  PLAYER_BLOCKED: 'removed',
};

export function classifyClassroomJoinRefusal(
  payload: { code?: string } | null | undefined
): ClassroomJoinRefusal {
  const refusal = (payload?.code && REASON_BY_CODE[payload.code]) || 'retry';
  return { refusal, messageKey: CLASSROOM_JOIN_REFUSAL_KEYS[refusal] };
}
