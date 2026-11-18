vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

let storedHash: Record<string, string> = {};

const mockPipeline = {
  hset: vi.fn((_key: string, field: string, value: string) => {
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
  circuitBreaker: { execute: (fn: () => Promise<unknown>) => fn() },
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { saveGameState, getGameState } from '../gameState';
import { restoreGameFromRedis } from '../../modules/gameState/persistence';
import type { GameState } from '../../modules/gameState/types';

const room = (classroomOfferedWords?: string[]) => ({
  roomName: 'Room 4B',
  users: {},
  playerScores: {},
  playerWords: {},
  gameState: 'in-progress',
  letterGrid: [['A']],
  timerSeconds: 120,
  language: 'en',
  gameMode: 'classic',
  isClassroom: true,
  classroomOfferedWords,
});

describe('the words a classroom round offered survive a restart', () => {
  beforeEach(() => {
    storedHash = {};
  });

  it('GIVEN a round that offered words WHEN saved and read THEN the list comes back', async () => {
    await saveGameState('CLASS1', room(['storm']) as never);
    expect((await getGameState('CLASS1'))!.classroomOfferedWords).toEqual(['storm']);
  });

  it('GIVEN a round that offered none WHEN saved and read THEN it stays a known empty list', async () => {
    await saveGameState('CLASS1', room([]) as never);
    expect((await getGameState('CLASS1'))!.classroomOfferedWords).toEqual([]);
  });

  it('GIVEN a room restored after a restart WHEN the round ends THEN it still knows what it offered', async () => {
    await saveGameState('CLASS1', room([]) as never);
    const games: Record<string, GameState> = {};
    await restoreGameFromRedis('CLASS1', games);
    expect(games.CLASS1.classroomOfferedWords).toEqual([]);
  });

  it('GIVEN a round with no list WHEN saved and read THEN it stays unknown', async () => {
    await saveGameState('CLASS1', room() as never);
    expect((await getGameState('CLASS1'))!.classroomOfferedWords).toBeUndefined();
  });
});
