import { describe, it, expect } from 'vitest';
import { lateJoinStudentKey } from '../endedCodeTries';

describe('lateJoinStudentKey', () => {
  it('Given a signed-in student, Then their auth id is the key', () => {
    expect(lateJoinStudentKey({ actorId: 'u1', gameCode: 'ABC123', username: 'Maya', socketId: 's1' })).toBe('u1');
  });

  it('Given a guest retrying under the same name, Then both tries share one key (case and spaces ignored)', () => {
    const a = lateJoinStudentKey({ actorId: null, gameCode: 'ABC123', username: 'Maya ', socketId: 's1' });
    const b = lateJoinStudentKey({ actorId: null, gameCode: 'ABC123', username: 'maya', socketId: 's2' });
    expect(a).toBe('guest:ABC123:maya');
    expect(b).toBe(a);
  });

  it('Given a guest with no name, Then the socket is the key', () => {
    expect(lateJoinStudentKey({ actorId: null, gameCode: 'ABC123', username: null, socketId: 's9' })).toBe('socket:s9');
  });
});
