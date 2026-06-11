/**
 * Lobby Ad-Gate Handler Tests
 *
 * Relays "this player is watching a rewarded ad in the lobby" presence so the
 * host's Start button can disable while anyone is mid-ad (starting would yank a
 * watcher out of their ad and void the reward). Transient relay, lobby-only,
 * with disconnect cleanup so a dropped watcher never wedges Start.
 */
import { vi } from 'vitest';
import type { Server, Socket } from 'socket.io';

const { mockGetGame, mockGetGameBySocketId, mockGetUsernameBySocketId } = vi.hoisted(() => ({
  mockGetGame: vi.fn(),
  mockGetGameBySocketId: vi.fn(),
  mockGetUsernameBySocketId: vi.fn(),
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: (...a: unknown[]) => mockGetGame(...a),
  getGameBySocketId: (...a: unknown[]) => mockGetGameBySocketId(...a),
  getUsernameBySocketId: (...a: unknown[]) => mockGetUsernameBySocketId(...a),
}));

const mockGetGameRoom = vi.fn().mockReturnValue('game:TEST123');
vi.mock('../../utils/socketHelpers', () => ({
  getGameRoom: (...a: unknown[]) => mockGetGameRoom(...a),
}));

const mockCheckRateLimit = vi.fn().mockReturnValue(true);
vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}));

vi.mock('../../utils/metrics', () => ({ inc: vi.fn() }));
vi.mock('../../utils/logger', () => ({ __esModule: true, default: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() } }));
vi.mock('../shared', () => ({ isSocketMigrating: vi.fn().mockReturnValue(false) }));

import { registerLobbyAdGateHandlers, __resetLobbyAdGateState } from '../lobbyAdGateHandler';

function createMockSocket(id: string): Socket & { _handlers: Record<string, Function> } {
  const handlers: Record<string, Function> = {};
  return {
    id,
    on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    emit: vi.fn(),
    data: {},
    _handlers: handlers,
  } as unknown as Socket & { _handlers: Record<string, Function> };
}

function createMockIO(): Server & { emit: ReturnType<typeof vi.fn> } {
  const emit = vi.fn();
  return { to: vi.fn().mockReturnValue({ emit }), emit } as unknown as Server & { emit: ReturnType<typeof vi.fn> };
}

function lastUpdate(io: Server & { emit: ReturnType<typeof vi.fn> }): { usernames: string[] } | null {
  const calls = io.emit.mock.calls.filter((c) => c[0] === 'lobbyAdWatchingUpdate');
  return calls.length ? (calls[calls.length - 1][1] as { usernames: string[] }) : null;
}

describe('lobbyAdGateHandler', () => {
  let io: Server & { emit: ReturnType<typeof vi.fn> };
  let socket: Socket & { _handlers: Record<string, Function> };

  beforeEach(() => {
    vi.clearAllMocks();
    __resetLobbyAdGateState();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetGameRoom.mockReturnValue('game:TEST123');
    mockGetGame.mockReturnValue({ gameState: 'waiting' });
    mockGetGameBySocketId.mockReturnValue('TEST123');
    mockGetUsernameBySocketId.mockReturnValue('Alice');
    io = createMockIO();
    socket = createMockSocket('sock-1');
    registerLobbyAdGateHandlers(io, socket);
  });

  it('registers the lobby:adWatching handler', () => {
    expect(socket.on).toHaveBeenCalledWith('lobby:adWatching', expect.any(Function));
  });

  it('broadcasts the watcher username to the room when a player starts an ad', () => {
    socket._handlers['lobby:adWatching']({ active: true });
    expect(io.to).toHaveBeenCalledWith('game:TEST123');
    expect(lastUpdate(io)).toEqual({ usernames: ['Alice'] });
  });

  it('clears the watcher when the ad ends (active=false)', () => {
    socket._handlers['lobby:adWatching']({ active: true });
    socket._handlers['lobby:adWatching']({ active: false });
    expect(lastUpdate(io)).toEqual({ usernames: [] });
  });

  it('ignores the signal outside the lobby (gameState !== waiting)', () => {
    mockGetGame.mockReturnValue({ gameState: 'playing' });
    socket._handlers['lobby:adWatching']({ active: true });
    expect(lastUpdate(io)).toBeNull();
  });

  it('ignores when gameCode or username is unknown', () => {
    mockGetUsernameBySocketId.mockReturnValue(null);
    socket._handlers['lobby:adWatching']({ active: true });
    expect(lastUpdate(io)).toBeNull();
  });

  it('respects rate limiting', () => {
    mockCheckRateLimit.mockReturnValue(false);
    socket._handlers['lobby:adWatching']({ active: true });
    expect(lastUpdate(io)).toBeNull();
  });

  it('removes a watcher and rebroadcasts on disconnect (no wedged Start)', () => {
    socket._handlers['lobby:adWatching']({ active: true });
    expect(lastUpdate(io)).toEqual({ usernames: ['Alice'] });
    socket._handlers['disconnect']?.('transport close');
    expect(lastUpdate(io)).toEqual({ usernames: [] });
  });

  it('tracks multiple watchers independently', () => {
    // Alice (sock-1) starts watching
    socket._handlers['lobby:adWatching']({ active: true });

    // Bob (sock-2) starts watching
    const socket2 = createMockSocket('sock-2');
    registerLobbyAdGateHandlers(io, socket2);
    mockGetGameBySocketId.mockReturnValue('TEST123');
    mockGetUsernameBySocketId.mockReturnValue('Bob');
    socket2._handlers['lobby:adWatching']({ active: true });
    expect(lastUpdate(io)?.usernames.sort()).toEqual(['Alice', 'Bob']);

    // Bob's ad ends — Alice still watching
    socket2._handlers['lobby:adWatching']({ active: false });
    expect(lastUpdate(io)).toEqual({ usernames: ['Alice'] });
  });
});
