import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';

const getGame = vi.fn();
vi.mock('../../modules/gameStateManager', () => ({ getGame: (code: string) => getGame(code) }));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn(async () => ({ classroomId: 'cls-1', status: 'waiting' })),
}));
vi.mock('../../modules/classroomGameSessionState', () => ({ isClassroomSessionEnded: () => false }));
vi.mock('../../utils/educationTelemetry', () => ({
  buildClassroomJoinRefusedEvent: vi.fn(),
  captureEduServerEvents: vi.fn(),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { answerMissingRoom } from '../classroomMissingRoom';

function fakeSocket() {
  const emit = vi.fn();
  const socket = {
    id: 's1',
    data: {},
    join: vi.fn(),
    emit,
    once: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
  };
  return { socket: socket as unknown as Socket, emit };
}

describe('answerMissingRoom - the room opens while the record is being read', () => {
  beforeEach(() => getGame.mockReset());

  it('given the teacher created the room during the read, then it reports the room open and parks nobody', async () => {
    getGame.mockReturnValue({ gameCode: 'ABC123' });
    const { socket, emit } = fakeSocket();

    const answer = await answerMissingRoom(socket, 'ABC123', 'Pip');

    expect(answer).toBe('opened');
    expect(emit).not.toHaveBeenCalled();
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('given the room is still not open, then the child is parked to wait', async () => {
    getGame.mockReturnValue(undefined);
    const { socket } = fakeSocket();

    const answer = await answerMissingRoom(socket, 'ABC123', 'Pip');

    expect(answer).toBeUndefined();
    expect(socket.join).toHaveBeenCalledWith('classroomRoomWait:ABC123');
  });
});
