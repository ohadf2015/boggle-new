import { vi, type Mock } from 'vitest';
import { registerLobbyEmoteHandlers } from '../lobbyEmoteHandler';
import {
  getGameBySocketId,
  getUsernameBySocketId,
  getGame,
} from '../../modules/gameStateManager';
import { getGameRoom } from '../../utils/socketHelpers';
import { checkRateLimit } from '../../utils/rateLimiter';
import { isSocketMigrating } from '../shared';

vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/socketHelpers');
vi.mock('../../utils/rateLimiter', () => ({
  default: { checkRateLimit: vi.fn().mockReturnValue(true) },
  checkRateLimit: vi.fn().mockReturnValue(true),
}));
vi.mock('../../utils/metrics', () => ({ inc: vi.fn() }));
vi.mock('../shared');
vi.mock('../../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockGetUsernameBySocketId = getUsernameBySocketId as Mock;
const mockGetGame = getGame as Mock;
const mockGetGameRoom = getGameRoom as Mock;
const mockCheckRateLimit = checkRateLimit as Mock;
const mockIsSocketMigrating = isSocketMigrating as Mock;

function createMockSocket() {
  const handlers: Record<string, Function> = {};
  const toEmit = vi.fn();
  return {
    socket: {
      id: 'socket-123',
      on: vi.fn((event: string, handler: Function) => {
        handlers[event] = handler;
      }),
      to: vi.fn(() => ({ emit: toEmit })),
      emit: vi.fn(),
    },
    handlers,
    toEmit,
  };
}

describe('lobbyEmoteHandler', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockIsSocketMigrating.mockReturnValue(false);
    mockGetGameBySocketId.mockReturnValue('GAME1');
    mockGetUsernameBySocketId.mockReturnValue('Alice');
    mockGetGame.mockReturnValue({ gameState: 'waiting' });
    mockGetGameRoom.mockReturnValue('game:GAME1');
  });

  it('registers the lobbyEmote handler', () => {
    const { socket } = createMockSocket();
    registerLobbyEmoteHandlers(mockIo, socket as any);
    expect(socket.on).toHaveBeenCalledWith('lobbyEmote', expect.any(Function));
  });

  it('broadcasts a valid emote to other players with the server username', async () => {
    const { socket, handlers, toEmit } = createMockSocket();
    registerLobbyEmoteHandlers(mockIo, socket as any);

    await handlers['lobbyEmote']({ emote: 'emoteAngry' });

    expect(socket.to).toHaveBeenCalledWith('game:GAME1');
    expect(toEmit).toHaveBeenCalledWith('lobbyEmoteUpdate', {
      username: 'Alice',
      emote: 'emoteAngry',
    });
  });

  it('ignores client-supplied username (anti-spoof)', async () => {
    const { socket, handlers, toEmit } = createMockSocket();
    registerLobbyEmoteHandlers(mockIo, socket as any);

    await handlers['lobbyEmote']({ emote: 'emoteWink', username: 'FakeUser' });

    expect(toEmit).toHaveBeenCalledWith('lobbyEmoteUpdate', {
      username: 'Alice',
      emote: 'emoteWink',
    });
  });

  it('rejects a game-mood id that is not a lobby emote', async () => {
    const { socket, handlers, toEmit } = createMockSocket();
    registerLobbyEmoteHandlers(mockIo, socket as any);

    await handlers['lobbyEmote']({ emote: 'correct' }); // valid AvatarMood, not an emote
    await handlers['lobbyEmote']({ emote: 'nope' });

    expect(toEmit).not.toHaveBeenCalled();
  });

  it('skips when rate limited', async () => {
    mockCheckRateLimit.mockReturnValue(false);
    const { socket, handlers, toEmit } = createMockSocket();
    registerLobbyEmoteHandlers(mockIo, socket as any);

    await handlers['lobbyEmote']({ emote: 'emoteLaugh' });

    expect(toEmit).not.toHaveBeenCalled();
  });

  it('skips when the socket is migrating', async () => {
    mockIsSocketMigrating.mockReturnValue(true);
    const { socket, handlers, toEmit } = createMockSocket();
    registerLobbyEmoteHandlers(mockIo, socket as any);

    await handlers['lobbyEmote']({ emote: 'emoteLaugh' });

    expect(toEmit).not.toHaveBeenCalled();
  });

  it('skips when the player is not in a game', async () => {
    mockGetGameBySocketId.mockReturnValue(null);
    const { socket, handlers, toEmit } = createMockSocket();
    registerLobbyEmoteHandlers(mockIo, socket as any);

    await handlers['lobbyEmote']({ emote: 'emoteLaugh' });

    expect(toEmit).not.toHaveBeenCalled();
  });

  it('skips when the game is no longer in the lobby (not waiting)', async () => {
    mockGetGame.mockReturnValue({ gameState: 'playing' });
    const { socket, handlers, toEmit } = createMockSocket();
    registerLobbyEmoteHandlers(mockIo, socket as any);

    await handlers['lobbyEmote']({ emote: 'emoteLaugh' });

    expect(toEmit).not.toHaveBeenCalled();
  });
});
