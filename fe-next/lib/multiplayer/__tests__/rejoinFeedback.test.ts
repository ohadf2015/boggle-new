import { describe, it, expect } from 'vitest';
import { rejoinFeedback } from '../rejoinFeedback';

describe('rejoinFeedback', () => {
  it('returns null for a normal (non-reconnect) join', () => {
    expect(rejoinFeedback({ wasReconnecting: false, roomCode: 'ABC123' })).toBeNull();
  });

  it('returns room-coded toast when rejoining after a reconnect', () => {
    expect(rejoinFeedback({ wasReconnecting: true, roomCode: 'ABC123' })).toEqual({
      key: 'multiplayerFlow.rejoinedRoom',
      params: { code: 'ABC123' },
      icon: '🔄',
    });
  });

  it('falls back to generic key when room code is empty', () => {
    expect(rejoinFeedback({ wasReconnecting: true, roomCode: '' })).toEqual({
      key: 'multiplayerFlow.rejoinedGame',
      icon: '🔄',
    });
  });
});
