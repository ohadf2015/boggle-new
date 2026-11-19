/**
 * decideClassroomHost must not treat an ended classroom PIN as a free code.
 * Prod 2026-11-19: after a waiting-room host left, createGame resurrected the
 * ended code (4BH936) because the live socket room was already gone.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';
import { decideClassroomHost } from '../classroomHostGate';
import { getClassroomGame } from '../../modules/classroomGameManager';

vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn(),
}));

const getClassroomGameMock = vi.mocked(getClassroomGame);

function socket(verifiedUserId?: string): Socket {
  return { data: { verifiedUserId } } as Socket;
}

const liveRecord = {
  gameCode: 'L29QN6',
  classroomId: 'class-1',
  teacherId: 'teacher-1',
  language: 'en' as const,
  status: 'waiting',
};

const endedRecord = {
  ...liveRecord,
  gameCode: '4BH936',
  status: 'ended' as const,
  endedAt: '2026-11-19T04:14:26.000Z',
};

describe('decideClassroomHost', () => {
  beforeEach(() => {
    getClassroomGameMock.mockReset();
  });

  it('treats an unknown code as ordinary multiplayer', async () => {
    getClassroomGameMock.mockResolvedValue(null);
    await expect(decideClassroomHost(socket(), 'NEW123', false)).resolves.toEqual({
      allowed: true,
      isClassroom: false,
      isPrivate: false,
    });
  });

  it('allows the classroom teacher to open a live classroom code', async () => {
    getClassroomGameMock.mockResolvedValue(liveRecord as never);
    await expect(decideClassroomHost(socket('teacher-1'), 'L29QN6', false)).resolves.toMatchObject({
      allowed: true,
      isClassroom: true,
      isPrivate: true,
      classroomId: 'class-1',
      teacherId: 'teacher-1',
    });
  });

  it('refuses a socket that is not the classroom teacher', async () => {
    getClassroomGameMock.mockResolvedValue(liveRecord as never);
    await expect(decideClassroomHost(socket('someone-else'), 'L29QN6', true)).resolves.toEqual({
      allowed: false,
      reason: 'not_teacher',
    });
  });

  it('refuses to reopen a code whose classroom session has ended, even for the teacher', async () => {
    getClassroomGameMock.mockResolvedValue(endedRecord as never);
    await expect(decideClassroomHost(socket('teacher-1'), '4BH936', true)).resolves.toEqual({
      allowed: false,
      reason: 'ended',
    });
  });
});
