/**
 * Game Lifecycle Handler - Game Mode Tests
 * Tests that game mode selection, random rotation, Play Again, and recovery
 * correctly wire through the startGame flow.
 */

// Mock gameModeSelector BEFORE importing handler
const mockSelectNextGameMode = jest.fn().mockReturnValue('blast');
jest.mock('../../../backend/modules/gameModeSelector', () => ({
  selectNextGameMode: mockSelectNextGameMode,
  ALL_GAME_MODES: ['classic', 'blast', 'word-hunt'],
}));

jest.mock('../../../backend/modules/gameStateManager', () => ({
  createGame: jest.fn().mockReturnValue({ hostSocketId: 'socket-1', modeHistory: [] }),
  getGame: jest.fn(),
  updateGame: jest.fn(),
  deleteGame: jest.fn(),
  gameExists: jest.fn().mockReturnValue(false),
  addUserToGame: jest.fn(),
  getGameBySocketId: jest.fn(),
  getUsernameBySocketId: jest.fn(),
  getSocketIdByUsername: jest.fn(),
  getGameUsers: jest.fn().mockReturnValue([]),
  getActiveRooms: jest.fn().mockReturnValue([]),
  resetGameForNewRound: jest.fn().mockReturnValue(true),
  getAuthUserConnection: jest.fn(),
  transitionGameState: jest.fn().mockReturnValue({ success: true }),
  canTransitionGameState: jest.fn().mockReturnValue(true),
  isRoomEmpty: jest.fn(),
  markPlayerReadyForNextGame: jest.fn(),
  getPlayersReadyCount: jest.fn(),
  removeUserFromGame: jest.fn(),
  updateUsernameMapping: jest.fn(),
}));

jest.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: jest.fn(),
  getGameRoom: jest.fn().mockReturnValue('room:TEST'),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  safeEmit: jest.fn(),
  getSocketById: jest.fn(),
  disconnectSocket: jest.fn(),
}));

jest.mock('../../../backend/modules/wordValidator', () => ({
  makePositionsMap: jest.fn().mockReturnValue(new Map()),
}));

jest.mock('../../../backend/utils/errorHandler', () => ({
  emitError: jest.fn(),
  ErrorMessages: { NOT_IN_GAME: 'Not in game', GAME_NOT_FOUND: 'Game not found', ONLY_HOST_CAN_START: 'Only host' },
}));

jest.mock('../../../backend/utils/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../backend/utils/gameStartCoordinator', () => ({
  __esModule: true,
  default: {
    initializeSequence: jest.fn().mockReturnValue('msg-1'),
    scheduleRetries: jest.fn(),
    setAcknowledgmentTimeout: jest.fn(),
    cleanupSequence: jest.fn(),
  },
}));

jest.mock('../../../backend/utils/timerManager', () => ({
  clearGameTimer: jest.fn(),
}));

jest.mock('../../../backend/redisClient', () => ({
  saveGameState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../backend/utils/metrics', () => ({
  inc: jest.fn(),
  incPerGame: jest.fn(),
  ensureGame: jest.fn(),
}));

jest.mock('../../../backend/utils/gameUtils', () => ({
  generateRandomAvatar: jest.fn(),
}));

jest.mock('../../../backend/dictionary', () => ({
  getRandomLongWordsWithTheme: jest.fn(),
  ensureLanguageLoaded: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), log: jest.fn() },
}));

jest.mock('../../../backend/handlers/shared', () => ({
  startGameTimer: jest.fn(),
  endGame: jest.fn(),
}));

jest.mock('../../../backend/modules/boggleSolver', () => ({
  findAllWords: jest.fn().mockReturnValue([]),
  getCachedTrie: jest.fn(),
}));

jest.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: jest.fn().mockReturnValue({ success: true, data: {} }),
  createGameSchema: {},
}));

jest.mock('../../../backend/modules/botManager', () => ({
  stopAllBots: jest.fn(),
}));

jest.mock('../../../backend/modules/spamDetector', () => ({
  spamDetector: { clearGame: jest.fn() },
}));

jest.mock('../../../backend/modules/notificationService', () => ({
  notifyRoomCreated: jest.fn().mockResolvedValue(undefined),
  notifyGameStarted: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../backend/utils/gameStateMachine', () => ({
  isInProgress: jest.fn().mockReturnValue(true),
}));

jest.mock('../../../backend/modules/classroomGameManager', () => ({
  getClassroomGame: jest.fn().mockResolvedValue(null),
}));

import {
  getGame,
  getGameBySocketId,
  updateGame,
} from '../../../backend/modules/gameStateManager';
import { broadcastToRoom, safeEmit } from '../../../backend/utils/socketHelpers';

describe('gameLifecycleHandler - gameMode', () => {
  let io: any;
  let socket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    io = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    socket = {
      id: 'socket-1',
      on: jest.fn(),
      emit: jest.fn(),
      join: jest.fn(),
    };
  });

  // Helper to get the registered handler for a given event
  function getHandler(eventName: string) {
    // Import and register handlers
    const { registerGameLifecycleHandlers } = require('../../../backend/handlers/gameLifecycleHandler');
    registerGameLifecycleHandlers(io, socket);

    const call = socket.on.mock.calls.find((c: any[]) => c[0] === eventName);
    if (!call) throw new Error(`No handler registered for '${eventName}'`);
    return call[1];
  }

  describe('startGame - gameMode resolution', () => {
    const baseGame = {
      hostSocketId: 'socket-1',
      gameState: 'waiting',
      language: 'en',
      modeHistory: [],
      gameSessionId: 1,
    };

    beforeEach(() => {
      (getGameBySocketId as jest.Mock).mockReturnValue('TEST');
      (getGame as jest.Mock).mockReturnValue({ ...baseGame });
    });

    it('should resolve random gameMode via selectNextGameMode', async () => {
      // GIVEN: host sends gameMode 'random'
      mockSelectNextGameMode.mockReturnValue('word-hunt');

      const handler = getHandler('startGame');

      // WHEN
      await handler({
        letterGrid: [['A']],
        timerSeconds: 180,
        gameMode: 'random',
      });

      // THEN: selectNextGameMode was called
      expect(mockSelectNextGameMode).toHaveBeenCalledWith([], ['classic', 'blast', 'word-hunt']);

      // AND: updateGame received the resolved mode
      expect(updateGame).toHaveBeenCalledWith('TEST', expect.objectContaining({
        gameMode: 'word-hunt',
        modeHistory: ['word-hunt'],
      }));

      // AND: broadcast includes resolved mode
      expect(broadcastToRoom).toHaveBeenCalledWith(
        io,
        'room:TEST',
        'startGame',
        expect.objectContaining({ gameMode: 'word-hunt' })
      );
    });

    it('should resolve missing gameMode via selectNextGameMode', async () => {
      // GIVEN: host sends no gameMode
      mockSelectNextGameMode.mockReturnValue('blast');

      const handler = getHandler('startGame');

      // WHEN
      await handler({
        letterGrid: [['A']],
        timerSeconds: 180,
        // no gameMode
      });

      // THEN: selectNextGameMode was called
      expect(mockSelectNextGameMode).toHaveBeenCalled();
      expect(updateGame).toHaveBeenCalledWith('TEST', expect.objectContaining({
        gameMode: 'blast',
      }));
    });

    it('should use explicit gameMode when provided (not random)', async () => {
      // GIVEN: host sends explicit 'blast' mode
      const handler = getHandler('startGame');

      // WHEN
      await handler({
        letterGrid: [['A']],
        timerSeconds: 180,
        gameMode: 'blast',
      });

      // THEN: selectNextGameMode was NOT called
      expect(mockSelectNextGameMode).not.toHaveBeenCalled();

      // AND: updateGame used explicit mode
      expect(updateGame).toHaveBeenCalledWith('TEST', expect.objectContaining({
        gameMode: 'blast',
        modeHistory: ['blast'],
      }));
    });

    it('should append to modeHistory from previous games', async () => {
      // GIVEN: game already played classic mode
      (getGame as jest.Mock).mockReturnValue({
        ...baseGame,
        modeHistory: ['classic'],
      });
      mockSelectNextGameMode.mockReturnValue('blast');

      const handler = getHandler('startGame');

      // WHEN: host starts with random
      await handler({
        letterGrid: [['A']],
        timerSeconds: 180,
        gameMode: 'random',
      });

      // THEN: selectNextGameMode received history
      expect(mockSelectNextGameMode).toHaveBeenCalledWith(['classic'], ['classic', 'blast', 'word-hunt']);

      // AND: modeHistory includes both
      expect(updateGame).toHaveBeenCalledWith('TEST', expect.objectContaining({
        modeHistory: ['classic', 'blast'],
      }));
    });
  });

  describe('requestGameState - recovery includes gameMode', () => {
    it('should include gameMode in recovery startGame emit', () => {
      // GIVEN: game in progress with blast mode
      (getGameBySocketId as jest.Mock).mockReturnValue('TEST');
      (getGame as jest.Mock).mockReturnValue({
        gameState: 'in-progress',
        letterGrid: [['A']],
        remainingTime: 100,
        timerSeconds: 180,
        language: 'en',
        minWordLength: 2,
        gameMode: 'blast',
      });

      const handler = getHandler('requestGameState');

      // WHEN
      handler();

      // THEN: safeEmit includes gameMode
      expect(safeEmit).toHaveBeenCalledWith(
        socket,
        'startGame',
        expect.objectContaining({
          gameMode: 'blast',
        })
      );
    });

    it('should default to classic when gameMode is not set', () => {
      // GIVEN: game without gameMode field
      (getGameBySocketId as jest.Mock).mockReturnValue('TEST');
      (getGame as jest.Mock).mockReturnValue({
        gameState: 'in-progress',
        letterGrid: [['A']],
        remainingTime: 100,
        timerSeconds: 180,
        language: 'en',
        minWordLength: 2,
      });

      const handler = getHandler('requestGameState');

      // WHEN
      handler();

      // THEN: defaults to 'classic'
      expect(safeEmit).toHaveBeenCalledWith(
        socket,
        'startGame',
        expect.objectContaining({
          gameMode: 'classic',
        })
      );
    });
  });
});
