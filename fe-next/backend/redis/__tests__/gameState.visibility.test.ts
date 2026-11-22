// A room's visibility must survive a restart: a lost value restores a private room as public.
import { vi } from 'vitest';

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
vi.mock('../connection', () => ({ getRedisClient: () => mockRedisClient, isRedisAvailable: () => true }));
vi.mock('../circuitBreaker', () => ({ circuitBreaker: { execute: (fn: () => Promise<unknown>) => fn() } }));

import { saveGameState } from '../gameState';
import { restoreGameFromRedis } from '../../modules/gameState/persistence';
import type { GameState } from '../../modules/gameState/types';

const room = (overrides: Record<string, unknown> = {}) => ({
  roomName: 'Ada Room',
  users: { Ada: { socketId: 's1', isHost: true, isBot: false } },
  playerScores: {},
  playerWords: {},
  gameState: 'waiting',
  letterGrid: null,
  timerSeconds: 120,
  language: 'en',
  hostUsername: 'Ada',
  ...overrides,
});

describe('room visibility survives the Redis round-trip', () => {
  beforeEach(() => {
    storedHash = {};
    vi.clearAllMocks();
  });

  it.each(['private', 'friends', 'public'] as const)('Given a %s room, When restored, Then it keeps its visibility', async (visibility) => {
    await saveGameState('VIS1', room({ visibility }) as never);
    const restored = await restoreGameFromRedis('VIS1', {} as Record<string, GameState>);
    expect(restored!.visibility).toBe(visibility);
  });

  it('Given a record saved before visibility existed, When restored, Then it is public', async () => {
    await saveGameState('OLD1', room() as never);
    delete storedHash.visibility;
    const restored = await restoreGameFromRedis('OLD1', {} as Record<string, GameState>);
    expect(restored!.visibility).toBe('public');
  });
});
