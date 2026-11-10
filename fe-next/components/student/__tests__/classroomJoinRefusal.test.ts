import { describe, it, expect } from 'vitest';
import {
  classifyClassroomJoinRefusal,
  CLASSROOM_JOIN_REFUSAL_KEYS,
  REASON_BY_CODE,
} from '../classroomJoinRefusal';
import { CLASSROOM_GAME_ERROR_CODES } from '@/shared/constants/classroomGameErrors';

describe('classifyClassroomJoinRefusal', () => {
  it.each([
    [{ code: 'GAME_ENDED' }, 'ended', 'student.activeGame.joinEnded'],
    [{ code: 'NOT_A_MEMBER' }, 'notMember', 'student.activeGame.joinNotMember'],
    [{ code: 'AUTH_REQUIRED' }, 'signIn', 'student.activeGame.joinSignIn'],
    [{ code: 'USER_ID_MISMATCH' }, 'signIn', 'student.activeGame.joinSignIn'],
    [{ code: 'LOOKUP_UNAVAILABLE' }, 'busy', 'student.activeGame.joinBusy'],
    [{ code: 'JOIN_THREW' }, 'busy', 'student.activeGame.joinBusy'],
    [{ code: 'GAME_FULL' }, 'full', 'student.activeGame.joinFull'],
    [{ code: 'PLAYER_KICKED' }, 'removed', 'student.activeGame.joinRemoved'],
    [{ code: 'PLAYER_BLOCKED' }, 'removed', 'student.activeGame.joinRemoved'],
    [{ code: 'ROOM_LOCKED' }, 'locked', 'education.student.join.roomLocked.hint'],
    [{ code: 'NOT_TEACHER' }, 'teacherOnly', 'economy.error.not_teacher'],
    [{ code: 'NO_QUIZ_QUESTIONS' }, 'noQuestions', 'vocabQuiz.errors.noQuestions'],
    [{ code: 'CREATE_FAILED' }, 'busy', 'student.activeGame.joinBusy'],
  ])('%j is its own reason (%s)', (payload, refusal, messageKey) => {
    expect(classifyClassroomJoinRefusal(payload)).toEqual({ refusal, messageKey });
  });

  it('a room lost to a restart (GAME_NOT_FOUND) is retryable, never "the game ended"', () => {
    expect(classifyClassroomJoinRefusal({ error: 'Game not found', code: 'GAME_NOT_FOUND' })).toEqual({
      refusal: 'retry',
      messageKey: 'student.activeGame.joinRetry',
    });
  });

  it('no payload (silent server, timeout) falls back to retry', () => {
    expect(classifyClassroomJoinRefusal(null)).toEqual({
      refusal: 'retry',
      messageKey: 'student.activeGame.joinRetry',
    });
    expect(classifyClassroomJoinRefusal(undefined).refusal).toBe('retry');
  });

  it('Given a sign-in the server could not check, When classified, Then the student is told to try again, not to sign in', () => {
    expect(classifyClassroomJoinRefusal({ code: 'AUTH_UNVERIFIED' }).refusal).toBe('busy');
  });

  it('maps every code the server can send to a reason of its own choosing', () => {
    for (const code of CLASSROOM_GAME_ERROR_CODES) {
      expect(REASON_BY_CODE[code], code).toBeDefined();
    }
  });

  it('an unknown code falls back to retry', () => {
    expect(classifyClassroomJoinRefusal({ code: 'SOMETHING_NEW' }).refusal).toBe('retry');
  });

  it('every refusal reason has its own message key, so no two reasons read the same', () => {
    const keys = Object.values(CLASSROOM_JOIN_REFUSAL_KEYS);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
