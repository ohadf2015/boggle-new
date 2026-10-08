/**
 * Only GAME_ENDED is a real "it's over". Everything else the server says
 * ("Game not found" covers a room lost to a restart too) is retryable: the
 * student's Join button is right there, so the message names that action.
 */
export interface ClassroomJoinRefusal {
  refusal: 'ended' | 'unknown';
  messageKey: 'student.activeGame.joinEnded' | 'student.activeGame.joinRetry';
}

export function classifyClassroomJoinRefusal(
  payload: { code?: string } | null | undefined
): ClassroomJoinRefusal {
  if (payload?.code === 'GAME_ENDED') {
    return { refusal: 'ended', messageKey: 'student.activeGame.joinEnded' };
  }
  return { refusal: 'unknown', messageKey: 'student.activeGame.joinRetry' };
}
