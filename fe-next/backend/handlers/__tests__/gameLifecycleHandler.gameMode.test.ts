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

// Mock blastModeManager to spy on initBlastModeState wave parameter
const mockInitBlastModeState = jest.fn().mockReturnValue({
  overlay: [],
  playerMoves: {},
  playerBonusMoves: {},
  seed: 12345,
});
jest.mock('../../../backend/modules/blastModeManager', () => ({
  initBlastModeState: (...args: any[]) => mockInitBlastModeState(...args),
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

const mockGenerateRandomTable = jest.fn().mockReturnValue([
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['Y', 'Z', 'A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H', 'I', 'J'],
]);
jest.mock('../../../backend/utils/gameUtils', () => ({
  generateRandomAvatar: jest.fn(),
  generateRandomTable: (...args: any[]) => mockGenerateRandomTable(...args),
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
  getGameUsers,
  getSocketIdByUsername,
  updateGame,
} from '../../../backend/modules/gameStateManager';
import { broadcastToRoom, safeEmit, getSocketById } from '../../../backend/utils/socketHelpers';
import gameStartCoordinator from '../../../backend/utils/gameStartCoordinator';

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

    it('should regenerate 6x6 grid when random resolves to blast and grid is not 6x6', async () => {
      // GIVEN: host sends small grid with random mode, server resolves to blast
      mockSelectNextGameMode.mockReturnValue('blast');

      const handler = getHandler('startGame');

      // WHEN
      await handler({
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 180,
        gameMode: 'random',
      });

      // THEN: generateRandomTable was called with 6x6
      expect(mockGenerateRandomTable).toHaveBeenCalledWith(6, 6, 'en');

      // AND: updateGame received the regenerated 6x6 grid
      expect(updateGame).toHaveBeenCalledWith('TEST', expect.objectContaining({
        letterGrid: expect.arrayContaining([
          expect.arrayContaining(['A', 'B', 'C', 'D', 'E', 'F']),
        ]),
      }));
    });

    it('should NOT regenerate grid when random resolves to classic', async () => {
      // GIVEN: host sends small grid, random resolves to classic
      mockSelectNextGameMode.mockReturnValue('classic');
      mockGenerateRandomTable.mockClear();

      const handler = getHandler('startGame');

      // WHEN
      await handler({
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 180,
        gameMode: 'random',
      });

      // THEN: generateRandomTable was NOT called
      expect(mockGenerateRandomTable).not.toHaveBeenCalled();
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

    it('should include blastTileOverlay and blastSeed in recovery when gameMode is blast', () => {
      // GIVEN: blast game in progress with blastModeState
      (getGameBySocketId as jest.Mock).mockReturnValue('TEST');
      (getGame as jest.Mock).mockReturnValue({
        gameState: 'in-progress',
        letterGrid: [['A', 'B'], ['C', 'D']],
        remainingTime: 100,
        timerSeconds: 180,
        language: 'en',
        minWordLength: 2,
        gameMode: 'blast',
        blastModeState: {
          overlay: [['normal', 'bomb'], ['ice', 'normal']],
          seed: 42,
        },
      });

      const handler = getHandler('requestGameState');

      // WHEN
      handler();

      // THEN: safeEmit includes blast-specific fields
      expect(safeEmit).toHaveBeenCalledWith(
        socket,
        'startGame',
        expect.objectContaining({
          gameMode: 'blast',
          blastTileOverlay: [['normal', 'bomb'], ['ice', 'normal']],
          blastSeed: 42,
        })
      );
    });

    it('should NOT include blast fields in recovery when gameMode is classic', () => {
      // GIVEN: classic game in progress
      (getGameBySocketId as jest.Mock).mockReturnValue('TEST');
      (getGame as jest.Mock).mockReturnValue({
        gameState: 'in-progress',
        letterGrid: [['A']],
        remainingTime: 100,
        timerSeconds: 180,
        language: 'en',
        minWordLength: 2,
        gameMode: 'classic',
      });

      const handler = getHandler('requestGameState');

      // WHEN
      handler();

      // THEN: no blast fields in payload
      const payload = (safeEmit as jest.Mock).mock.calls[0][2];
      expect(payload).not.toHaveProperty('blastTileOverlay');
      expect(payload).not.toHaveProperty('blastSeed');
    });
  });

  describe('startGame - MP blast uses elevated wave for richer tile variety', () => {
    const mpBlastGame = {
      hostSocketId: 'socket-1',
      gameState: 'waiting',
      language: 'en',
      modeHistory: [],
      gameSessionId: 1,
      users: { alice: {}, bob: {} },
    };

    beforeEach(() => {
      (getGameBySocketId as jest.Mock).mockReturnValue('TEST');
      (getGame as jest.Mock).mockReturnValue({ ...mpBlastGame });
      (getGameUsers as jest.Mock).mockReturnValue([
        { username: 'alice' },
        { username: 'bob' },
      ]);
    });

    it('should pass wave=3 to initBlastModeState for multiplayer blast games', async () => {
      // GIVEN: a multiplayer game (2+ players) starting blast mode
      const handler = getHandler('startGame');

      // WHEN
      await handler({
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 180,
        gameMode: 'blast',
      });

      // THEN: initBlastModeState was called with the regenerated 6x6 grid and wave=3
      expect(mockInitBlastModeState).toHaveBeenCalledWith(
        mockGenerateRandomTable(),
        ['alice', 'bob'],
        3
      );
    });
  });

  describe('startGame retry - blast data in retry payload', () => {
    it('should include gameMode, blastTileOverlay and blastSeed in retry emit', async () => {
      // GIVEN: a blast game where retry callback is invoked
      // Configure initBlastModeState to return specific overlay/seed
      const blastOverlay = [['normal', 'bomb'], ['ice', 'normal']];
      mockInitBlastModeState.mockReturnValueOnce({
        overlay: blastOverlay,
        playerMoves: {},
        playerBonusMoves: {},
        seed: 42,
      });

      // Use a single mutable game object so the handler's mutation persists
      const gameObj: any = {
        hostSocketId: 'socket-1',
        gameState: 'waiting',
        language: 'en',
        modeHistory: [],
        gameSessionId: 1,
      };

      (getGameBySocketId as jest.Mock).mockReturnValue('TEST');
      (getGame as jest.Mock).mockReturnValue(gameObj);
      (getSocketIdByUsername as jest.Mock).mockReturnValue('socket-2');
      const targetSocket = { id: 'socket-2', emit: jest.fn() };
      (getSocketById as jest.Mock).mockReturnValue(targetSocket);
      (safeEmit as jest.Mock).mockReturnValue(true);

      const handler = getHandler('startGame');

      // WHEN: start game with blast mode
      await handler({
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 180,
        gameMode: 'blast',
      });

      // THEN: scheduleRetries was called; extract the retry callback
      expect(gameStartCoordinator.scheduleRetries).toHaveBeenCalled();
      const retryCallback = (gameStartCoordinator.scheduleRetries as jest.Mock).mock.calls[0][2];

      // Clear mocks to isolate the retry call
      (safeEmit as jest.Mock).mockClear();

      // WHEN: retry callback fires for a player
      retryCallback('player1');

      // THEN: safeEmit includes blast fields from initBlastModeState
      expect(safeEmit).toHaveBeenCalledWith(
        targetSocket,
        'startGame',
        expect.objectContaining({
          gameMode: 'blast',
          blastTileOverlay: blastOverlay,
          blastSeed: 42,
          retry: true,
        })
      );
    });

    it('should NOT include blast fields in retry when gameMode is classic', async () => {
      // GIVEN: a classic game
      (getGameBySocketId as jest.Mock).mockReturnValue('TEST');
      (getGame as jest.Mock).mockReturnValue({
        hostSocketId: 'socket-1',
        gameState: 'waiting',
        language: 'en',
        modeHistory: [],
        gameSessionId: 1,
        gameMode: 'classic',
      });
      (getSocketIdByUsername as jest.Mock).mockReturnValue('socket-2');
      const targetSocket = { id: 'socket-2', emit: jest.fn() };
      (getSocketById as jest.Mock).mockReturnValue(targetSocket);
      (safeEmit as jest.Mock).mockReturnValue(true);

      const handler = getHandler('startGame');

      // WHEN
      await handler({
        letterGrid: [['A']],
        timerSeconds: 180,
        gameMode: 'classic',
      });

      const retryCallback = (gameStartCoordinator.scheduleRetries as jest.Mock).mock.calls[0][2];
      (safeEmit as jest.Mock).mockClear();

      // WHEN: retry fires
      retryCallback('player1');

      // THEN: no blast fields
      const payload = (safeEmit as jest.Mock).mock.calls[0][2];
      expect(payload).not.toHaveProperty('blastTileOverlay');
      expect(payload).not.toHaveProperty('blastSeed');
    });
  });
});
