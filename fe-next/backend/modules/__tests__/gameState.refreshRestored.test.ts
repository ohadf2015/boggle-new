vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

const mockGetGameState = vi.fn();

vi.mock('../../redisClient', () => ({
  saveGameState: vi.fn(),
  getGameState: (...args: unknown[]) => mockGetGameState(...args),
  deleteGameState: vi.fn(),
  getAllGameCodes: vi.fn(),
}));

import { vi } from 'vitest';
import {
  restoreGameFromRedis,
  refreshRestoredGameFromRedis,
} from '../gameState/persistence';
import type { GameState, GameUser } from '../gameState/types';

const user = (extra: Partial<GameUser> = {}): GameUser =>
  ({ socketId: 'old-socket', isBot: false, ...extra } as unknown as GameUser);

// Snapshot the new instance read at boot, while the old instance still served joins.
const bootSnapshot = () => ({
  roomName: 'DDNS5S',
  hostUsername: 'Lazy Sloth',
  gameState: 'waiting',
  usersV2: { 'Lazy Sloth': user(), 'Twisty Pretzel': user() },
  playerScores: {},
  playerWords: {},
});

// What the old instance wrote last: two more joins and the host cascade of its shutdown.
const finalSnapshot = () => ({
  roomName: 'DDNS5S',
  hostUsername: 'IsNickBaf',
  gameState: 'waiting',
  usersV2: {
    'Lazy Sloth': user({ disconnected: true } as Partial<GameUser>),
    'Twisty Pretzel': user({ disconnected: true } as Partial<GameUser>),
    'Secret Dragon': user({ disconnected: true, guestTokenHash: 'sd-hash' } as Partial<GameUser>),
    IsNickBaf: user({ disconnected: true } as Partial<GameUser>),
  },
  playerScores: {},
  playerWords: {},
});

let seq = 0;
async function bootRestore(games: Record<string, GameState>): Promise<string> {
  const code = `RF${++seq}`;
  mockGetGameState.mockResolvedValueOnce(bootSnapshot());
  await restoreGameFromRedis(code, games);
  return code;
}

describe('refreshRestoredGameFromRedis', () => {
  let games: Record<string, GameState>;

  beforeEach(() => {
    games = {};
    mockGetGameState.mockReset();
  });

  it('given a boot-restored room nobody has rejoined, when the first join arrives, then it re-reads the old instance\'s final write', async () => {
    const code = await bootRestore(games);
    mockGetGameState.mockResolvedValueOnce(finalSnapshot());

    const game = await refreshRestoredGameFromRedis(code, games);

    expect(Object.keys(game!.users).sort()).toEqual(['IsNickBaf', 'Lazy Sloth', 'Secret Dragon', 'Twisty Pretzel']);
    expect(game!.users['Secret Dragon'].guestTokenHash).toBe('sd-hash');
    expect(game!.users['Secret Dragon'].socketId).toBeNull();
    expect(game!.hostSocketId).toBeNull();
    expect(games[code]).toBe(game);
  });

  it('given two joins racing, when both refresh, then Redis is read once and both get the same room object', async () => {
    const code = await bootRestore(games);
    mockGetGameState.mockResolvedValueOnce(finalSnapshot());

    const [a, b] = await Promise.all([
      refreshRestoredGameFromRedis(code, games),
      refreshRestoredGameFromRedis(code, games),
    ]);

    expect(a).toBe(b);
    expect(mockGetGameState).toHaveBeenCalledTimes(2);
  });

  it('given a refresh already happened, when a later join arrives, then the live room is never replaced again', async () => {
    const code = await bootRestore(games);
    mockGetGameState.mockResolvedValueOnce(finalSnapshot());
    const first = await refreshRestoredGameFromRedis(code, games);

    const second = await refreshRestoredGameFromRedis(code, games);

    expect(second).toBe(first);
    expect(mockGetGameState).toHaveBeenCalledTimes(2);
  });

  it('given someone is already seated on this instance, when a join arrives, then the in-memory room stays', async () => {
    const code = await bootRestore(games);
    const current = games[code];
    current.users['Twisty Pretzel'].socketId = 'live-socket';

    const game = await refreshRestoredGameFromRedis(code, games);

    expect(game).toBe(current);
    expect(mockGetGameState).toHaveBeenCalledTimes(1);
  });

  it('given a socket is seated while Redis is being read, when the read returns, then the seated room is kept', async () => {
    const code = await bootRestore(games);
    const current = games[code];
    let release!: (v: unknown) => void;
    mockGetGameState.mockReturnValueOnce(new Promise((r) => { release = r; }));

    const pending = refreshRestoredGameFromRedis(code, games);
    current.users['Lazy Sloth'].socketId = 'seated-meanwhile';
    release(finalSnapshot());

    expect(await pending).toBe(current);
  });

  it('given Redis no longer holds the room, when a join arrives, then the in-memory copy is kept', async () => {
    const code = await bootRestore(games);
    const current = games[code];
    mockGetGameState.mockResolvedValueOnce(null);

    expect(await refreshRestoredGameFromRedis(code, games)).toBe(current);
  });

  it('given a room created on this instance, when a join arrives, then Redis is not read', async () => {
    games.LIVE1 = { gameCode: 'LIVE1', users: {}, spectators: {}, hostSocketId: null } as unknown as GameState;

    expect(await refreshRestoredGameFromRedis('LIVE1', games)).toBe(games.LIVE1);
    expect(mockGetGameState).not.toHaveBeenCalled();
  });
});
