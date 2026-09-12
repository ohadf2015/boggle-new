/**
 * `isClassroom` must survive the Redis round-trip.
 *
 * WHY THIS FILE EXISTS (2026-09-12, round-end piece):
 * `saveGameState` serialised `isRanked`, `isPrivate` and `allowLateJoin` but
 * NOT `isClassroom`, while `restoreGameFromRedis` read `persisted.isClassroom
 * ?? false`. Every classroom room restored from Redis — a dev-server restart, a
 * production deploy mid-lesson, or any cold read of a room that had aged out of
 * the in-memory map — therefore came back as an ORDINARY multiplayer room.
 *
 * Downstream, three things are keyed on that one boolean:
 *   1. connectionHandler's `allowAutoTransfer = !game.isClassroom && ...`
 *      (audit T4) — with the flag lost, a teacher whose projector tab blips for
 *      a second has the host seat auto-promoted to a STUDENT, who is then shown
 *      the teacher's share-code lobby.
 *   2. teacherControlsHandler's `resolveTeacherGame` — requires
 *      `game.isClassroom`, so END ROUND / pause / +time are dropped SILENTLY
 *      (`.claude/rules/60-recurring-pitfalls.md` Class 4) for the rest of the
 *      lesson.
 *   3. the classroom seat gate and the classroom results/persistence branches.
 *
 * Observed live on 2026-09-11 in room VHT76G: `Restoring game VHT76G from
 * Redis` → `Host transferred in game VHT76G: Mr. Gauntlet B -> Noa` (the
 * teacher losing the room to a guest student) → END ROUND dead for round 2.
 *
 * The control case ('an ordinary room restores as isClassroom:false') is
 * deliberate: without it the fix could pass by hardcoding `true`.
 */

// Mock logger
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

// Capture hset calls and return them from hgetall (same fake as gameState.roundtrip)
let storedHash: Record<string, string> = {};

const mockPipeline = {
  hset: vi.fn((key: string, field: string, value: string) => {
    storedHash[field] = value;
    return mockPipeline;
  }),
  expire: vi.fn(() => mockPipeline),
  exec: vi.fn(async () => []),
};

const mockRedisClient = {
  pipeline: vi.fn(() => mockPipeline),
  hgetall: vi.fn(async () => ({ ...storedHash })),
  del: vi.fn(async () => 1),
};

vi.mock('../connection', () => ({
  getRedisClient: () => mockRedisClient,
  isRedisAvailable: () => true,
}));

vi.mock('../circuitBreaker', () => ({
  circuitBreaker: {
    execute: (fn: () => Promise<unknown>) => fn(),
  },
}));

import { vi } from 'vitest';
import { saveGameState, getGameState } from '../gameState';
import { restoreGameFromRedis } from '../../modules/gameState/persistence';
import type { GameState } from '../../modules/gameState/types';

function classroomGameInput(overrides: Record<string, unknown> = {}) {
  return {
    roomName: 'Room 4B',
    users: {
      'Mr. Gauntlet B': { socketId: 'sock-teacher', isHost: true, authUserId: 'teacher-1', isBot: false },
      Noa: { socketId: 'sock-noa', isHost: false, authUserId: 'student-1', isBot: false },
    },
    playerScores: { 'Mr. Gauntlet B': 0, Noa: 155 },
    playerWords: {},
    gameState: 'in-progress',
    letterGrid: [['A', 'B'], ['C', 'D']],
    timerSeconds: 120,
    language: 'en',
    gameMode: 'classic',
    isClassroom: true,
    hostUsername: 'Mr. Gauntlet B',
    ...overrides,
  };
}

describe('isClassroom survives the Redis round-trip', () => {
  beforeEach(() => {
    storedHash = {};
    vi.clearAllMocks();
  });

  it('writes isClassroom into the Redis hash', async () => {
    await saveGameState('CLASS1', classroomGameInput() as never);

    // The raw serialised hash is what a restart reads back. If the key is
    // absent the flag is gone before restore ever runs.
    expect(Object.keys(storedHash)).toContain('isClassroom');
    expect(storedHash.isClassroom).toBe('true');
  });

  it('reads isClassroom back out of the Redis hash', async () => {
    await saveGameState('CLASS1', classroomGameInput() as never);

    const redisState = await getGameState('CLASS1');

    expect(redisState).not.toBeNull();
    expect(redisState!.isClassroom).toBe(true);
  });

  it('restores a classroom room as a classroom room', async () => {
    await saveGameState('CLASS1', classroomGameInput() as never);

    const games: Record<string, GameState> = {};
    const restored = await restoreGameFromRedis('CLASS1', games);

    expect(restored).not.toBeNull();
    expect(restored!.isClassroom).toBe(true);
  });

  it('leaves an ordinary multiplayer room as isClassroom:false (control)', async () => {
    await saveGameState('ARCADE1', classroomGameInput({ isClassroom: false }) as never);

    const games: Record<string, GameState> = {};
    const restored = await restoreGameFromRedis('ARCADE1', games);

    expect(restored).not.toBeNull();
    expect(restored!.isClassroom).toBe(false);
  });

  it('defaults to false when the field was never written (legacy record)', async () => {
    const legacy = classroomGameInput();
    delete (legacy as Record<string, unknown>).isClassroom;
    await saveGameState('LEGACY1', legacy as never);
    // Simulate a record saved before this field existed.
    delete storedHash.isClassroom;

    const games: Record<string, GameState> = {};
    const restored = await restoreGameFromRedis('LEGACY1', games);

    expect(restored).not.toBeNull();
    expect(restored!.isClassroom).toBe(false);
  });

  it('keeps a restored classroom room out of the auto-host-transfer path', async () => {
    await saveGameState('CLASS1', classroomGameInput() as never);

    const games: Record<string, GameState> = {};
    const restored = await restoreGameFromRedis('CLASS1', games);

    // This is verbatim connectionHandler.ts's `allowAutoTransfer` guard (audit
    // T4). It is what decides whether a student can be silently promoted to
    // host when the teacher's socket drops.
    const allowAutoTransfer =
      !restored!.isClassroom && !restored!.isRanked && !restored!.tournamentId;

    expect(allowAutoTransfer).toBe(false);
  });

  it('keeps a restored classroom room eligible for teacher live controls', async () => {
    await saveGameState('CLASS1', classroomGameInput() as never);

    const games: Record<string, GameState> = {};
    const restored = await restoreGameFromRedis('CLASS1', games);

    // teacherControlsHandler.resolveTeacherGame drops END ROUND / pause /
    // +time silently when this is false.
    expect(restored!.isClassroom).toBe(true);
  });
});
