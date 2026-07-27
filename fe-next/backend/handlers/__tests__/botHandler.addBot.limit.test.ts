import { vi, type Mock } from 'vitest';
import { registerBotHandlers } from '../botHandler';
import {
  getGame,
  getGameBySocketId,
  addUserToGame,
} from '../../modules/gameStateManager';
import * as botManager from '../../modules/botManager';
import { isInProgress } from '../../utils/gameStateMachine';
import { checkRateLimit } from '../../utils/rateLimiter';
import { MAX_BOTS_PER_ROOM } from '@/shared/constants/gameConstants';

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
const mockAddUserToGame = addUserToGame as Mock;
const mockGetGameBots = botManager.getGameBots as Mock;
const mockAddBot = botManager.addBot as Mock;
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

function makeGame() {
  return {
    gameCode: 'GAME1',
    hostSocketId: 'socket-host',
    gameState: 'waiting',
    language: 'en',
    users: {
      Host: { socketId: 'socket-host', isHost: true, isBot: false },
    },
  } as any;
}

describe('botHandler.addBot - bot count cap', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockIsInProgress.mockReturnValue(false);
    mockGetGameBySocketId.mockReturnValue('GAME1');
    mockAddBot.mockReturnValue({ id: 'bot-x', username: 'BotX', difficulty: 'medium', avatar: { emoji: '🤖' } });
  });

  it(`allows adding a bot when the room has fewer than ${MAX_BOTS_PER_ROOM} bots`, () => {
    mockGetGame.mockReturnValue(makeGame());
    mockGetGameBots.mockReturnValue(Array.from({ length: MAX_BOTS_PER_ROOM - 1 }, (_, i) => ({ id: `bot-${i}` })));

    const { socket, handlers } = createMockSocket();
    registerBotHandlers(mockIo, socket);

    handlers['addBot']({ difficulty: 'medium' });

    expect(mockAddBot).toHaveBeenCalled();
    expect(mockAddUserToGame).toHaveBeenCalled();
    const errorCalls = (socket.emit as Mock).mock.calls.filter((c: any[]) => c[0] === 'error');
    expect(errorCalls).toHaveLength(0);
  });

  it(`rejects adding a bot once the room already has ${MAX_BOTS_PER_ROOM} bots`, () => {
    mockGetGame.mockReturnValue(makeGame());
    mockGetGameBots.mockReturnValue(Array.from({ length: MAX_BOTS_PER_ROOM }, (_, i) => ({ id: `bot-${i}` })));

    const { socket, handlers } = createMockSocket();
    registerBotHandlers(mockIo, socket);

    handlers['addBot']({ difficulty: 'medium' });

    expect(mockAddBot).not.toHaveBeenCalled();
    expect(mockAddUserToGame).not.toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({ code: 'GAME_FULL' }));
  });
});
