/**
 * The other half of the early-join wait: when the teacher's host page creates
 * the room, every child parked on "waiting for your teacher" is told at once,
 * so they walk in without polling and without a bounce.
 */
import { vi } from 'vitest';
import type { Server } from 'socket.io';

vi.mock('../../modules/classroomGameManager', () => ({ getClassroomGame: vi.fn() }));
vi.mock('../../utils/educationTelemetry', () => ({
  buildClassroomJoinRefusedEvent: vi.fn(),
  captureEduServerEvents: vi.fn(),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { announceClassroomRoomOpened, classroomWaitRoom } from '../classroomMissingRoom';

describe('announceClassroomRoomOpened', () => {
  it('tells the parked sockets the room is open, then releases them from the wait room', () => {
    const emit = vi.fn();
    const socketsLeave = vi.fn();
    const io = {
      to: vi.fn().mockReturnValue({ emit }),
      in: vi.fn().mockReturnValue({ socketsLeave }),
    } as unknown as Server;

    announceClassroomRoomOpened(io, 'ABC123');

    expect(classroomWaitRoom('ABC123')).toBe('classroomRoomWait:ABC123');
    expect(io.to).toHaveBeenCalledWith('classroomRoomWait:ABC123');
    expect(emit).toHaveBeenCalledWith('classroomRoomOpened', { gameCode: 'ABC123' });
    expect(socketsLeave).toHaveBeenCalledWith('classroomRoomWait:ABC123');
  });

  it('never throws into createGame', () => {
    const io = { to: vi.fn(() => { throw new Error('adapter down'); }) } as unknown as Server;
    expect(() => announceClassroomRoomOpened(io, 'ABC123')).not.toThrow();
  });
});
