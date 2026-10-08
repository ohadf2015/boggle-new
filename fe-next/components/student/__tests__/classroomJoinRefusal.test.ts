import { describe, it, expect } from 'vitest';
import { classifyClassroomJoinRefusal } from '../classroomJoinRefusal';

describe('classifyClassroomJoinRefusal', () => {
  it('GAME_ENDED means the round is over, so the student is told to wait for the next one', () => {
    expect(classifyClassroomJoinRefusal({ code: 'GAME_ENDED' })).toEqual({
      refusal: 'ended',
      messageKey: 'student.activeGame.joinEnded',
    });
  });

  it('a plain "Game not found" is retryable, never "the game ended"', () => {
    expect(classifyClassroomJoinRefusal({ error: 'Game not found' })).toEqual({
      refusal: 'unknown',
      messageKey: 'student.activeGame.joinRetry',
    });
  });

  it('no payload (silent server, timeout) falls back to retry', () => {
    expect(classifyClassroomJoinRefusal(null)).toEqual({
      refusal: 'unknown',
      messageKey: 'student.activeGame.joinRetry',
    });
    expect(classifyClassroomJoinRefusal(undefined)).toEqual({
      refusal: 'unknown',
      messageKey: 'student.activeGame.joinRetry',
    });
  });

  it('a membership refusal is retryable too (student may have been seated late)', () => {
    expect(classifyClassroomJoinRefusal({ error: 'You are not a member of this classroom' }).messageKey).toBe(
      'student.activeGame.joinRetry'
    );
  });
});
