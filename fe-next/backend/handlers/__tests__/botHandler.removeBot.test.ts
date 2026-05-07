import { vi, type Mock } from 'vitest';
import { registerBotHandlers } from '../botHandler';
import {
  getGame,
  getGameBySocketId,
  getGameUsers,
  removeUserFromGame,
  isRoomEmpty,
  getActiveRooms,
} from '../../modules/gameStateManager';
import * as botManager from '../../modules/botManager';
import { isInProgress } from '../../utils/gameStateMachine';
import { checkRateLimit } from '../../utils/rateLimiter';

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../modules/botManager');
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastActiveRooms: vi.fn(),
  getGameRoom: (code: string) => `game:${code}`,
}));
vi.mock('../../utils/errorHandler', () => ({
  emitError: vi.fn((socket: any, code: string, payload?: any) => {
    socket.emit('error', { code, message: payload?.message });
  }),
  ErrorCodes: {
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
    PLAYER_NOT_HOST: 'PLAYER_NOT_HOST',
    GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
    GAME_FULL: 'GAME_FULL',
    AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
    VALIDATION_INVALID_PAYLOAD: 'VALIDATION_INVALID_PAYLOAD',
  },
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true) }));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockReturnValue({ success: true, data: {} }),
  addBotSchema: {},
  removeBotSchema: {},
}));
vi.mock('../../utils/gameStateMachine');

const mockGetGame = getGame as Mock;
const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockGetGameUsers = getGameUsers as Mock;
const mockRemoveUserFromGame = removeUserFromGame as Mock;
const mockIsRoomEmpty = isRoomEmpty as Mock;
const mockGetActiveRooms = getActiveRooms as Mock;
const mockGetGameBots = botManager.getGameBots as Mock;
const mockRemoveBot = botManager.removeBot as Mock;
const mockIsInProgress = isInProgress as Mock;
const mockCheckRateLimit = checkRateLimit as Mock;

function createMockSocket(id = 'socket-host') {
  const handlers: Record<string, Function> = {};
  return {
    socket: {
      id,
      on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
      emit: vi.fn(),
    } as any,
    handlers,
  };
}

describe('botHandler.removeBot - idempotency', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockIsInProgress.mockReturnValue(false);
    mockGetGameBySocketId.mockReturnValue('GAME1');
    mockGetGameUsers.mockReturnValue([]);
    mockIsRoomEmpty.mockReturnValue(false);
    mockGetActiveRooms.mockReturnValue([]);
  });

  it('treats removing an already-gone bot as success (no "Bot not found" error)', () => {
    // Bot is NOT in botManager and NOT in game.users — already fully removed,
    // but the client UI still shows it (stale state, race, double-click, etc).
    const game: any = {
      gameCode: 'GAME1',
      hostSocketId: 'socket-host',
      gameState: 'waiting',
      users: {
        Host: { socketId: 'socket-host', isHost: true, isBot: false },
      },
    };
    mockGetGame.mockReturnValue(game);
    mockGetGameBots.mockReturnValue([]);

    const { socket, handlers } = createMockSocket();
    registerBotHandlers(mockIo, socket);

    handlers['removeBot']({ username: 'GhostBot' });

    // Must NOT emit an error — that's what surfaces as "Bot not found" on the client.
    const errorCalls = (socket.emit as Mock).mock.calls.filter((c: any[]) => c[0] === 'error');
    expect(errorCalls).toHaveLength(0);

    // Must confirm botRemoved success so the client clears its stale entry.
    expect(socket.emit).toHaveBeenCalledWith('botRemoved', expect.objectContaining({
      success: true,
      username: 'GhostBot',
    }));
  });

  it('falls back to game.users when bot is not in botManager but is in game.users', () => {
    const game: any = {
      gameCode: 'GAME1',
      hostSocketId: 'socket-host',
      gameState: 'waiting',
      users: {
        Host: { socketId: 'socket-host', isHost: true, isBot: false },
        StaleBot: { socketId: 'bot-stale', isHost: false, isBot: true },
      },
    };
    mockGetGame.mockReturnValue(game);
    mockGetGameBots.mockReturnValue([]);

    const { socket, handlers } = createMockSocket();
    registerBotHandlers(mockIo, socket);

    handlers['removeBot']({ username: 'StaleBot' });

    expect(mockRemoveUserFromGame).toHaveBeenCalledWith('GAME1', 'StaleBot');
    expect(socket.emit).toHaveBeenCalledWith('botRemoved', expect.objectContaining({
      success: true,
      username: 'StaleBot',
    }));
  });

  it('removes bot via the normal botManager path', () => {
    const bot = { id: 'bot-1', username: 'Bot1', difficulty: 'medium', avatar: { emoji: '🤖' } };
    const game: any = {
      gameCode: 'GAME1',
      hostSocketId: 'socket-host',
      gameState: 'waiting',
      users: {
        Host: { socketId: 'socket-host', isHost: true, isBot: false },
        Bot1: { socketId: 'bot-1', isHost: false, isBot: true },
      },
    };
    mockGetGame.mockReturnValue(game);
    mockGetGameBots.mockReturnValue([bot]);

    const { socket, handlers } = createMockSocket();
    registerBotHandlers(mockIo, socket);

    handlers['removeBot']({ botId: 'bot-1' });

    expect(mockRemoveBot).toHaveBeenCalledWith('GAME1', 'bot-1');
    expect(mockRemoveUserFromGame).toHaveBeenCalledWith('GAME1', 'Bot1');
    expect(socket.emit).toHaveBeenCalledWith('botRemoved', expect.objectContaining({
      success: true,
      username: 'Bot1',
    }));
  });
});
