import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';

const getClassroomGame = vi.fn();
const buildClassroomJoinRefusedEvent = vi.fn((r: unknown) => ({ event: 'edu_classroom_join_refused', r }));
const captureEduServerEvents = vi.fn();

vi.mock('../../modules/gameStateManager', () => ({ getGame: () => undefined }));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: (code: string) => getClassroomGame(code),
}));
vi.mock('../../utils/educationTelemetry', () => ({
  buildClassroomJoinRefusedEvent: (r: unknown) => buildClassroomJoinRefusedEvent(r),
  captureEduServerEvents: (e: unknown) => captureEduServerEvents(e),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

import { answerMissingRoom } from '../classroomMissingRoom';

function fakeSocket() {
  const emit = vi.fn();
  const socket = { id: 's1', data: {}, join: vi.fn(), emit, once: vi.fn(), to: vi.fn(() => ({ emit: vi.fn() })) };
  return { socket: socket as unknown as Socket, emit };
}

function reasonRecorded(): string | undefined {
  const call = buildClassroomJoinRefusedEvent.mock.calls[0]?.[0] as { reason?: string } | undefined;
  return call?.reason;
}

describe('answerMissingRoom - why a classroom join with no room was refused', () => {
  beforeEach(() => {
    getClassroomGame.mockReset();
    buildClassroomJoinRefusedEvent.mockClear();
    captureEduServerEvents.mockClear();
  });

  it('given the teacher ended the session (room torn down), then it is recorded as SESSION_ENDED, not ROOM_GONE', async () => {
    getClassroomGame.mockResolvedValue({ classroomId: 'cls-1', status: 'ended', endedAt: '2026-10-01T13:36:00Z' });
    const { socket } = fakeSocket();

    await answerMissingRoom(socket, 'SWYGBF', 'Pip');

    expect(reasonRecorded()).toBe('SESSION_ENDED');
  });

  it('given a live session whose room vanished, then it is still recorded as ROOM_GONE', async () => {
    getClassroomGame.mockResolvedValue({ classroomId: 'cls-1', status: 'playing' });
    const { socket } = fakeSocket();

    await answerMissingRoom(socket, 'TRV4X7', 'Pip');

    expect(reasonRecorded()).toBe('ROOM_GONE');
  });

  it('given either reason, then the student hears the same GAME_NOT_FOUND', async () => {
    getClassroomGame.mockResolvedValue({ classroomId: 'cls-1', status: 'ended', endedAt: 'x' });
    const { socket, emit } = fakeSocket();

    await answerMissingRoom(socket, 'SWYGBF', 'Pip');

    const codes = emit.mock.calls.map((c) => JSON.stringify(c));
    expect(codes.some((c) => c.includes('GAME_NOT_FOUND'))).toBe(true);
  });
});
