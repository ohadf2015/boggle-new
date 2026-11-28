import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Socket } from 'socket.io';

const mockDbRooms = new Map<string, Record<string, unknown>>();

vi.mock('../../modules/supabase/client.js', () => ({
  getSupabase: () => ({
    from: (table: string) => {
      if (table === 'classroom_live_rooms') {
        return {
          upsert: async (row: Record<string, unknown>) => {
            mockDbRooms.set(String(row.room_code), { ...row });
            return { error: null };
          },
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                const data = mockDbRooms.get(val);
                return { data: data ? { ...data } : null, error: null };
              },
            }),
          }),
          update: (updates: Record<string, unknown>) => ({
            eq: (_col: string, val: string) => {
              const existing = mockDbRooms.get(val);
              if (existing) {
                mockDbRooms.set(val, { ...existing, ...updates });
              }
              return Promise.resolve({ error: null });
            },
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
  }),
}));

vi.mock('../../redisClient.js', () => ({
  getRedisClient: () => null,
}));

vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  persistLiveRoomState,
  getPersistedLiveRoomState,
  markLiveRoomEnded,
  restoreLiveRoomFromDb,
} from '../../modules/classroomLiveRoomPersistence.js';
import { getGame, clearAllGames } from '../../modules/gameStateManager.js';
import { answerMissingRoom } from '../classroomMissingRoom.js';

function fakeSocket(id = 'sock-teacher', verifiedUserId?: string) {
  const emits: Array<{ event: string; payload: unknown }> = [];
  const rooms = new Set<string>();
  const socket = {
    id,
    data: { verifiedUserId },
    join: vi.fn((room: string) => rooms.add(room)),
    leave: vi.fn((room: string) => rooms.delete(room)),
    emit: vi.fn((event: string, payload: unknown) => {
      emits.push({ event, payload });
    }),
    to: vi.fn(() => ({ emit: vi.fn() })),
    once: vi.fn(),
  };
  return { socket: socket as unknown as Socket, emits, rooms };
}

describe('Classroom dead-room recovery across simulated server restart', () => {
  beforeEach(() => {
    mockDbRooms.clear();
    clearAllGames();
  });

  it('persists minimal room state to Postgres on create and updates phase on transition', async () => {
    const persisted = await persistLiveRoomState({
      roomCode: 'CLASS1',
      classroomId: 'c-uuid-1',
      teacherId: 't-uuid-1',
      hostIdentity: { userId: 't-uuid-1', username: 'Teacher Jane', socketId: 'sock-1' },
      roster: [
        { userId: 's-uuid-1', username: 'Student Alex', score: 0 },
        { userId: 's-uuid-2', username: 'Student Beth', score: 0 },
      ],
      gameConfig: { language: 'en', gameMode: 'classic', settings: { timerMinutes: 3 } },
      lessonWords: ['abandon', 'brittle', 'candor'],
      currentPhase: 'waiting',
    });
    expect(persisted).toBe(true);

    const record = await getPersistedLiveRoomState('CLASS1');
    expect(record).not.toBeNull();
    expect(record?.roomCode).toBe('CLASS1');
    expect(record?.teacherId).toBe('t-uuid-1');
    expect(record?.lessonWords).toEqual(['abandon', 'brittle', 'candor']);
    expect(record?.roster).toHaveLength(2);
    expect(record?.currentPhase).toBe('waiting');

    // Phase change to playing
    record!.currentPhase = 'playing';
    await persistLiveRoomState(record!);

    const updated = await getPersistedLiveRoomState('CLASS1');
    expect(updated?.currentPhase).toBe('playing');
  });

  it('restores room from DB after a simulated server restart (wiping memory)', async () => {
    // 1. Initial room in Postgres
    await persistLiveRoomState({
      roomCode: 'RECOVER1',
      classroomId: 'c-uuid-2',
      teacherId: 'teacher-42',
      hostIdentity: { userId: 'teacher-42', username: 'Prof Oak', socketId: 'old-socket' },
      roster: [{ userId: 'student-99', username: 'Ash', score: 10 }],
      gameConfig: { language: 'en', gameMode: 'vocab-quiz' },
      lessonWords: ['photosynthesis', 'chlorophyll'],
      currentPhase: 'playing',
    });

    // 2. Simulate server restart: in-memory state is completely cleared
    clearAllGames();
    expect(getGame('RECOVER1')).toBeNull();

    // 3. A reconnecting student socket arrives at answerMissingRoom
    const { socket: studentSock } = fakeSocket('sock-student-new', 'student-99');
    const result = await answerMissingRoom(studentSock, 'RECOVER1', 'Ash');

    // Room must report 'opened' because DB recovered it into memory
    expect(result).toBe('opened');

    const restoredGame = getGame('RECOVER1');
    expect(restoredGame).not.toBeNull();
    expect(restoredGame?.isClassroom).toBe(true);
    expect(restoredGame?.hostUsername).toBe('Prof Oak');
    expect(restoredGame?.gameMode).toBe('vocab-quiz');
    expect(restoredGame?.users['Prof Oak']).toBeDefined();
    expect(restoredGame?.users['Ash']).toBeDefined();
    expect(Array.from(restoredGame?.selectedVocabulary || [])).toEqual(['photosynthesis', 'chlorophyll']);
  });

  it('teacher rejoin re-binds host socket id and restores hosting', async () => {
    // Persist room
    await persistLiveRoomState({
      roomCode: 'HOSTRECLAIM',
      classroomId: 'c-uuid-3',
      teacherId: 'teacher-real',
      hostIdentity: { userId: 'teacher-real', username: 'Mrs Smith', socketId: 'dead-socket' },
      roster: [],
      gameConfig: { language: 'en', gameMode: 'classic' },
      lessonWords: ['apple', 'banana'],
      currentPhase: 'waiting',
    });

    // Wipe memory (server restart)
    clearAllGames();
    expect(getGame('HOSTRECLAIM')).toBeNull();

    // Teacher connects with a NEW socket id
    const { socket: teacherSock, rooms } = fakeSocket('new-teacher-socket-777', 'teacher-real');
    const restored = await restoreLiveRoomFromDb('HOSTRECLAIM', teacherSock, 'teacher-real');

    expect(restored).toBe(true);

    const game = getGame('HOSTRECLAIM');
    expect(game).not.toBeNull();
    // Host socket ID must be updated to the teacher's new socket
    expect(game?.hostSocketId).toBe('new-teacher-socket-777');
    expect(game?.users['Mrs Smith']?.socketId).toBe('new-teacher-socket-777');
    expect(rooms.has('game:HOSTRECLAIM')).toBe(true);
  });

  it('yields explicit room-ended state when room state is unrecoverable or marked ended', async () => {
    // 1. Ended room in DB
    await persistLiveRoomState({
      roomCode: 'ENDED1',
      classroomId: 'c-uuid-4',
      teacherId: 'teacher-ended',
      hostIdentity: { userId: 'teacher-ended', username: 'Teacher', socketId: 's1' },
      roster: [],
      gameConfig: {},
      lessonWords: [],
      currentPhase: 'waiting',
    });
    await markLiveRoomEnded('ENDED1');

    clearAllGames();

    const { socket: sock1, emits: emits1 } = fakeSocket('sock-ended');
    const res1 = await answerMissingRoom(sock1, 'ENDED1', 'Student');

    expect(res1).toBeUndefined();
    // Emits CLASSROOM_SESSION_WAITING with classroomId so student sees explicit ended/waiting state, not dead spinner
    expect(emits1.some((e) => JSON.stringify(e).includes('CLASSROOM_SESSION_WAITING'))).toBe(true);

    // 2. Completely unknown code
    const { socket: sock2, emits: emits2 } = fakeSocket('sock-unknown');
    const res2 = await answerMissingRoom(sock2, 'UNKNOWN99', 'Student');
    expect(res2).toBeUndefined();
    expect(emits2.some((e) => JSON.stringify(e).includes('GAME_NOT_FOUND'))).toBe(true);
  });
});
