/**
 * The round chest over a real socket.io connection. Only the storage edges are
 * mocked (Redis, Supabase, the game registry); the handler, the chest grant and
 * the results-payload fallback are the production code.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// The shared test setup replaces socket.io-client with a stub; this test needs the real one.
vi.unmock('socket.io-client');
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';

const mocks = vi.hoisted(() => ({
  game: null as null | Record<string, unknown>,
  classroomGame: null as null | Record<string, unknown>,
  insert: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../modules/gameStateManager.js', () => ({
  getGameAsync: vi.fn(async () => mocks.game),
}));
vi.mock('../../modules/classroomGameManager.js', () => ({
  getClassroomGame: vi.fn(async () => mocks.classroomGame),
}));
vi.mock('../../modules/classroomEconomyStore.js', () => ({
  loadConfig: vi.fn(),
  saveEconomyConfig: vi.fn(),
  readEconomy: vi.fn(),
}));
vi.mock('../../modules/classroomEconomyLocker.js', () => ({ readLocker: vi.fn() }));
vi.mock('../../modules/classroomEconomyService.js', () => ({
  applyCorrectWord: vi.fn(),
  applyWrongWord: vi.fn(),
  buildBoard: vi.fn(),
  buyPowerUpFor: vi.fn(),
  roundSummaryFor: vi.fn(async () => ({ roundCash: 4, rank: 1, size: 2 })),
  toSnapshot: vi.fn(),
  spendHintFor: vi.fn(),
}));
vi.mock('../../redisClient.js', () => ({ getRedisClient: () => null }));
vi.mock('@/lib/server/claimOnce', () => ({ claimOnce: vi.fn(async () => 'claimed') }));
vi.mock('../../modules/supabase/client.js', () => ({
  getSupabase: () => ({
    from: () => ({ insert: mocks.insert }),
    rpc: mocks.rpc,
  }),
}));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { registerClassroomEconomyHandlers } from '../classroomEconomyHandler';
import { buildFallbackResultsPayload } from '../../services/gameLifecycle/fallbackResultsPayload';

let httpServer: HttpServer;
let client: ClientSocket;

beforeAll(async () => {
  httpServer = createServer();
  const io = new Server(httpServer);
  io.use((socket, next) => {
    (socket.data as Record<string, unknown>).verifiedUserId = 'student-1';
    next();
  });
  io.on('connection', (socket) => registerClassroomEconomyHandlers(io, socket));
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  client = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew: true });
  await new Promise<void>((resolve, reject) => {
    client.on('connect', () => resolve());
    client.on('connect_error', (err) => reject(err));
  });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.rpc.mockResolvedValue({ error: null });
});

afterAll(() => {
  client?.disconnect();
  httpServer?.close();
});

function requestReward(roundId: string): Promise<unknown> {
  return new Promise((resolve) => {
    client.once('classroomEconomy:reward', resolve);
    client.emit('classroomEconomy:requestReward', { gameCode: 'ABC123', roundId });
  });
}

describe('round chest over a live socket', () => {
  it('Given the round is still playing, Then no chest is rolled', async () => {
    mocks.game = { gameState: 'playing', gameSessionId: 7, cachedResultsPayload: null };
    mocks.classroomGame = { teacherId: 't', players: [{ userId: 'student-1' }] };
    expect(await requestReward('7')).toBeNull();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('Given scoring fell back and the results were sent, Then the student gets the round chest', async () => {
    mocks.game = {
      gameState: 'finished',
      gameSessionId: 7,
      letterGrid: [['a']],
      users: { ana: {} },
      playerScores: { ana: 3 },
      playerWords: { ana: [] },
      cachedResultsPayload: buildFallbackResultsPayload({
        gameSessionId: 7,
        letterGrid: [['a']],
        users: { ana: {} },
        playerScores: { ana: 3 },
        playerWords: { ana: [] },
      }),
    };
    const reveal = (await requestReward('7')) as { gameCode: string; roundId: string; xp: number } | null;
    expect(reveal).not.toBeNull();
    expect(reveal?.gameCode).toBe('ABC123');
    expect(reveal?.roundId).toBe('7');
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });
});
