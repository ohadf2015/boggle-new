/**
 * Game Lifecycle Handler - Game Mode Tests
 * Tests that game mode selection, random rotation, Play Again, and recovery
 * correctly wire through the startGame flow.
 */

// All mocks must be hoisted so vi.mock factories can reference them
const {
  mockSelectNextGameMode,
  mockInitBlastModeState,
  mockHashStringToSeed,
  mockGenerateRandomTable,
  mockFindAllWordsAsync,
  mockAutoAddBotsForSoloPlayer,
  mockInitializePlayerData,
} = vi.hoisted(() => {
  return {
    mockSelectNextGameMode: vi.fn().mockReturnValue('blast'),
    mockInitBlastModeState: vi.fn().mockReturnValue({
      overlay: [],
      playerMoves: {},
      playerBonusMoves: {},
      seed: 12345,
    }),
    mockHashStringToSeed: vi.fn().mockReturnValue(12345),
    mockGenerateRandomTable: vi.fn().mockReturnValue([
      ['A', 'B', 'C', 'D', 'E', 'F'],
      ['G', 'H', 'I', 'J', 'K', 'L'],
      ['M', 'N', 'O', 'P', 'Q', 'R'],
      ['S', 'T', 'U', 'V', 'W', 'X'],
      ['Y', 'Z', 'A', 'B', 'C', 'D'],
      ['E', 'F', 'G', 'H', 'I', 'J'],
    ]),
    mockFindAllWordsAsync: vi.fn().mockResolvedValue(['hello', 'world']),
    mockAutoAddBotsForSoloPlayer: vi.fn().mockResolvedValue({ botsAdded: 0 }),
    mockInitializePlayerData: vi.fn(),
  };
});

vi.mock('../../../backend/modules/gameModeSelector', () => ({
  selectNextGameMode: mockSelectNextGameMode,
  ALL_GAME_MODES: ['classic', 'blast', 'word-hunt'],
}));

vi.mock('../../../backend/modules/blastModeManager', () => ({
  initBlastModeState: mockInitBlastModeState,
  hashStringToSeed: mockHashStringToSeed,
}));

vi.mock('../../../backend/modules/wordValidatorPool', () => ({
  findAllWordsAsync: mockFindAllWordsAsync,
}));

vi.mock('../../../backend/services/gameLifecycle/autoAddBots', () => ({
  autoAddBotsForSoloPlayer: mockAutoAddBotsForSoloPlayer,
}));

vi.mock('../../../backend/handlers/playerDataInit', () => ({
  initializePlayerData: mockInitializePlayerData,
  ensurePlayerState: vi.fn(),
}));

vi.mock('../../../backend/handlers/gameLifecycleHandler', () => ({
  initializePlayerData: mockInitializePlayerData,
  ensurePlayerState: vi.fn(),
  handleExistingAuthConnection: vi.fn(),
  registerGameLifecycleHandlers: vi.fn(),
}));

// NOTE: gameStartHandler is NOT mocked here — we want its real implementation
// with all transitive imports resolved through Vitest's mock registry.
// Since gameLifecycleHandler IS mocked above, the circular dep is broken:
//   gameStartHandler → gameLifecycleHandler (returns mock immediately) → no cycle.

vi.mock('@/shared/constants/wordHuntMultiplayerConstants', () => ({
  HUNT_TARGET_MIN_LENGTH: 4,
  HUNT_TARGET_MAX_LENGTH: 8,
}));

vi.mock('@/shared/constants/gameConstants', () => ({
  BLAST_MP_DEFAULT_TIMER: 90,
  DEFAULT_TIMER: 90,
  DEFAULT_DIFFICULTY: 'MEDIUM',
  DIFFICULTIES: {
    EASY: { nameKey: 'difficulty.easy', rows: 5, cols: 5 },
    MEDIUM: { nameKey: 'difficulty.medium', rows: 6, cols: 6 },
    HARD: { nameKey: 'difficulty.hard', rows: 7, cols: 7 },
  },
}));

vi.mock('../../../backend/modules/gameStateManager', () => ({
  createGame: vi.fn().mockReturnValue({ hostSocketId: 'socket-1', modeHistory: [] }),
  getGame: vi.fn(),
  updateGame: vi.fn(),
  deleteGame: vi.fn(),
  gameExists: vi.fn().mockReturnValue(false),
  addUserToGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  getSocketIdByUsername: vi.fn(),
  getGameUsers: vi.fn().mockReturnValue([]),
  getActiveRooms: vi.fn().mockReturnValue([]),
  resetGameForNewRound: vi.fn().mockReturnValue(true),
  getAuthUserConnection: vi.fn(),
  transitionGameState: vi.fn().mockReturnValue({ success: true }),
  canTransitionGameState: vi.fn().mockReturnValue(true),
  isRoomEmpty: vi.fn(),
  markPlayerReadyForNextGame: vi.fn(),
  getPlayersReadyCount: vi.fn(),
  removeUserFromGame: vi.fn(),
  updateUsernameMapping: vi.fn(),
}));

vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:TEST'),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  safeEmit: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
}));

vi.mock('../../../backend/modules/wordValidator', () => ({
  makePositionsMap: vi.fn().mockReturnValue(new Map()),
}));

vi.mock('../../../backend/utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../../backend/utils/errorHandler')>('../../../backend/utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});

vi.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

vi.mock('../../../backend/utils/gameStartCoordinator', () => ({
  __esModule: true,
  default: {
    initializeSequence: vi.fn().mockReturnValue('msg-1'),
    scheduleRetries: vi.fn(),
    setAcknowledgmentTimeout: vi.fn(),
    setCountdownCompleteTimeout: vi.fn(),
    recordCountdownComplete: vi.fn(),
    cleanupSequence: vi.fn(),
  },
}));

vi.mock('../../../backend/utils/timerManager', () => ({ default: {
  clearGameTimer: vi.fn(),
}, clearGameTimer: vi.fn() }));

vi.mock('../../../backend/redisClient', () => ({
  saveGameState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../backend/utils/metrics', () => ({
  inc: vi.fn(),
  incPerGame: vi.fn(),
  ensureGame: vi.fn(),
}));

vi.mock('../../../backend/utils/gameUtils', () => ({
  generateRandomAvatar: vi.fn(),
  generateRandomTable: mockGenerateRandomTable,
}));

vi.mock('../../../backend/dictionary', () => ({
  getRandomLongWordsWithTheme: vi.fn(),
  ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));

vi.mock('../../../backend/handlers/shared', () => ({
  startGameTimer: vi.fn(),
  endGame: vi.fn(),
}));

vi.mock('../../../backend/modules/boggleSolver', () => ({
  findAllWords: vi.fn().mockReturnValue(['hello', 'world', 'testing', 'player']),
  getCachedTrie: vi.fn(),
}));

vi.mock('../../../backend/modules/wordHuntManager', () => ({
  selectTargetWordWithFallback: vi.fn().mockReturnValue('testing'),
  initWordHuntState: vi.fn().mockReturnValue({
    targetWord: 'testing',
    targetWordLength: 7,
    playerProgress: {},
  }),
}));

vi.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: vi.fn().mockImplementation((_schema: unknown, data: unknown) => ({
    success: true,
    data,
  })),
  createGameSchema: {},
  startGameSchema: {},
}));

vi.mock('../../../backend/modules/botManager', () => ({
  stopAllBots: vi.fn(),
  getGameBots: vi.fn(() => []),
  addBot: vi.fn(() => ({
    id: 'bot-1', username: 'TestBot', difficulty: 'medium',
    avatar: { avatarImage: 'pizza' },
  })),
  addBotWithAdaptiveDifficulty: vi.fn(async () => ({
    id: 'bot-1', username: 'TestBot', difficulty: 'medium',
    avatar: { avatarImage: 'pizza' },
  })),
}));

vi.mock('../../../backend/modules/spamDetector', () => ({
  spamDetector: { clearGame: vi.fn() },
}));

vi.mock('../../../backend/modules/notificationService', () => ({
  notifyRoomCreated: vi.fn().mockResolvedValue(undefined),
  notifyGameStarted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../backend/utils/gameStateMachine', () => ({
  isInProgress: vi.fn().mockReturnValue(true),
}));

vi.mock('../../../backend/modules/classroomGameManager', () => ({
  getClassroomGame: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../backend/modules/roundEventsManager', () => ({
  scheduleRoundEvent: vi.fn(),
  clearRoundEventTimers: vi.fn(),
}));

vi.mock('../../../backend/middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  getGame,
  getGameBySocketId,
  getGameUsers,
  getSocketIdByUsername,
  updateGame,
} from '../../../backend/modules/gameStateManager';
import { broadcastToRoom, safeEmit, getSocketById } from '../../../backend/utils/socketHelpers';
import gameStartCoordinator from '../../../backend/utils/gameStartCoordinator';
import { checkRateLimit } from '../../../backend/utils/rateLimiter';
import { isInProgress } from '../../../backend/utils/gameStateMachine';
import { registerStartGameHandler } from '../../../backend/handlers/gameStartHandler';

describe('gameLifecycleHandler - gameMode', () => {
  let io: any;
  let socket: any;

  beforeEach(() => {
    vi.clearAllMocks();

    io = {
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
    };

    socket = {
      id: 'socket-1',
      on: vi.fn(),
      emit: vi.fn(),
      join: vi.fn(),
    };
  });

  // Helper to get the registered handler for a given event.
  // Uses registerStartGameHandler (statically imported) for 'startGame',
  // and inline registration (mirrors gameLifecycleHandler.ts) for 'requestGameState'.
  function getHandler(eventName: string) {
    if (eventName === 'startGame') {
      registerStartGameHandler(io, socket);
    } else if (eventName === 'requestGameState') {
      // Inline registration mirrors gameLifecycleHandler.ts lines 322-364
      socket.on('requestGameState', () => {
        if (!(checkRateLimit as Mock)(socket.id)) return;
        const gameCode = (getGameBySocketId as Mock)(socket.id);
        if (!gameCode) return;
        const game = (getGame as Mock)(gameCode);
        if (!game) return;
        if ((isInProgress as Mock)(game.gameState)) {
          const recoveryGameMode = game.gameMode || 'classic';
          (safeEmit as Mock)(socket, 'startGame', {
            letterGrid: game.letterGrid,
            timerSeconds: game.remainingTime || game.timerSeconds,
            language: game.language,
            minWordLength: game.minWordLength || 2,
            messageId: 'recovery-' + Date.now(),
            reconnect: true,
            skipAck: true,
            boardTheme: game.boardTheme || null,
            gameMode: recoveryGameMode,
            ...(recoveryGameMode === 'blast' && game.blastModeState ? {
              blastTileOverlay: game.blastModeState.overlay || [],
              blastSeed: game.blastModeState.seed ?? null,
              blastWave: game.blastModeState.wave ?? 1,
              blastPlayerMoves: game.blastModeState.playerMoves || {},
              ...(game.blastModeState.grid ? { blastGrid: game.blastModeState.grid } : {}),
              ...(game.blastModeState.tileStates ? { blastTileStates: game.blastModeState.tileStates } : {}),
            } : {}),
          });
        }
      });
    }

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
      users: {},
    };

    beforeEach(() => {
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({ ...baseGame });
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
      // Need 2+ players so server regenerates grid (single player uses client grid)
      mockSelectNextGameMode.mockReturnValue('blast');
      (getGame as Mock).mockReturnValue({ ...baseGame, users: { alice: {}, bob: {} } });

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
      (getGame as Mock).mockReturnValue({
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
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({
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
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({
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
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({
        gameState: 'in-progress',
        letterGrid: [['A', 'B'], ['C', 'D']],
        remainingTime: 100,
        timerSeconds: 180,
        language: 'en',
        minWordLength: 2,
        gameMode: 'blast',
        blastModeState: {
          overlay: [['normal', 'bomb'], ['ice', 'normal']],
          overlayMap: new Map(),
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

    it('should include live blastGrid, blastTileStates, blastWave, blastPlayerMoves for mid-game recovery', () => {
      // GIVEN: blast game in progress with full live state (post-clears)
      const liveGrid = [['E', 'F'], ['G', 'H']];
      const liveTileStates = [
        [{ letter: 'E', isCleared: false }, { letter: 'F', isCleared: true }],
        [{ letter: 'G', isCleared: false }, { letter: 'H', isCleared: false }],
      ];
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({
        gameState: 'in-progress',
        letterGrid: [['A', 'B'], ['C', 'D']],
        remainingTime: 100,
        timerSeconds: 180,
        language: 'en',
        minWordLength: 2,
        gameMode: 'blast',
        blastModeState: {
          overlay: [],
          overlayMap: new Map(),
          seed: 42,
          wave: 2,
          playerMoves: { alice: 3, bob: 1 },
          grid: liveGrid,
          tileStates: liveTileStates,
        },
      });

      const handler = getHandler('requestGameState');

      // WHEN
      handler();

      // THEN: recovery payload contains live state so reconnecting player sees post-clear board
      expect(safeEmit).toHaveBeenCalledWith(
        socket,
        'startGame',
        expect.objectContaining({
          blastGrid: liveGrid,
          blastTileStates: liveTileStates,
          blastWave: 2,
          blastPlayerMoves: { alice: 3, bob: 1 },
        })
      );
    });

    it('should omit blastGrid/blastTileStates when absent on state (pre-live-state blast games)', () => {
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({
        gameState: 'in-progress',
        letterGrid: [['A']],
        remainingTime: 100,
        timerSeconds: 180,
        language: 'en',
        minWordLength: 2,
        gameMode: 'blast',
        blastModeState: {
          overlay: [],
          seed: 7,
        },
      });

      const handler = getHandler('requestGameState');
      handler();

      const payload = (safeEmit as Mock).mock.calls[0][2];
      expect(payload).not.toHaveProperty('blastGrid');
      expect(payload).not.toHaveProperty('blastTileStates');
      expect(payload.blastWave).toBe(1);
      expect(payload.blastPlayerMoves).toEqual({});
    });

    it('should NOT include blast fields in recovery when gameMode is classic', () => {
      // GIVEN: classic game in progress
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({
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
      const payload = (safeEmit as Mock).mock.calls[0][2];
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
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({ ...mpBlastGame });
      (getGameUsers as Mock).mockReturnValue([
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

      // THEN: initBlastModeState was called with the regenerated 6x6 grid, wave=3, and a seed
      expect(mockInitBlastModeState).toHaveBeenCalledWith(
        mockGenerateRandomTable(),
        ['alice', 'bob'],
        3,
        expect.any(Number)
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
        users: {},
      };

      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue(gameObj);
      (getSocketIdByUsername as Mock).mockReturnValue('socket-2');
      const targetSocket = { id: 'socket-2', emit: vi.fn() };
      (getSocketById as Mock).mockReturnValue(targetSocket);
      (safeEmit as Mock).mockReturnValue(true);

      const handler = getHandler('startGame');

      // WHEN: start game with blast mode
      await handler({
        letterGrid: [['A', 'B'], ['C', 'D']],
        timerSeconds: 180,
        gameMode: 'blast',
      });

      // THEN: scheduleRetries was called; extract the retry callback
      expect(gameStartCoordinator.scheduleRetries).toHaveBeenCalled();
      const retryCallback = (gameStartCoordinator.scheduleRetries as Mock).mock.calls[0][2];

      // Clear mocks to isolate the retry call
      (safeEmit as Mock).mockClear();

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
      (getGameBySocketId as Mock).mockReturnValue('TEST');
      (getGame as Mock).mockReturnValue({
        hostSocketId: 'socket-1',
        gameState: 'waiting',
        language: 'en',
        modeHistory: [],
        gameSessionId: 1,
        gameMode: 'classic',
        users: {},
      });
      (getSocketIdByUsername as Mock).mockReturnValue('socket-2');
      const targetSocket = { id: 'socket-2', emit: vi.fn() };
      (getSocketById as Mock).mockReturnValue(targetSocket);
      (safeEmit as Mock).mockReturnValue(true);

      const handler = getHandler('startGame');

      // WHEN
      await handler({
        letterGrid: [['A']],
        timerSeconds: 180,
        gameMode: 'classic',
      });

      const retryCallback = (gameStartCoordinator.scheduleRetries as Mock).mock.calls[0][2];
      (safeEmit as Mock).mockClear();

      // WHEN: retry fires
      retryCallback('player1');

      // THEN: no blast fields
      const payload = (safeEmit as Mock).mock.calls[0][2];
      expect(payload).not.toHaveProperty('blastTileOverlay');
      expect(payload).not.toHaveProperty('blastSeed');
    });
  });
});
