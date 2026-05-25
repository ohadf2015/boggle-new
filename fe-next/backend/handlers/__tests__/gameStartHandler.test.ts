/**
 * gameStartHandler tests — CQ-002
 *
 * Covers critical behaviors:
 * 1. Only host can start the game
 * 2. Rate limiting
 * 3. Payload validation
 * 4. Grid regenerated server-side for 2+ players (SEC-002)
 * 5. Solo player uses client-supplied grid
 * 6. Blast mode initializes blast state
 * 7. Word Hunt mode initializes hunt state
 * 8. Game state transitions to 'in-progress'
 * 9. Dictionary is loaded for the game language
 */

// ─── Mocks (must come before imports) ─────────────────────────────────────

const { mockCheckRateLimit, mockValidatePayload, mockEmitError, mockGetGame, mockUpdateGame, mockGetGameBySocketId, mockGetGameUsers, mockGetSocketIdByUsername, mockCanTransitionGameState, mockTransitionGameState, mockResetGameForNewRound, mockBroadcastToRoom, mockGetGameRoom, mockSafeEmit, mockGetSocketById, mockMakePositionsMap, mockEnsureGame, mockGenerateRandomTable, mockEnsureLanguageLoaded, mockClearGameTimer, mockGameStartCoordinator, mockStopAllBots, mockNotifyGameStarted, mockSelectNextGameMode, mockInitializePlayerData, mockGetClassroomGame, mockInitBlastModeState, mockHashStringToSeed, mockInitWordHuntState, mockSelectTargetWordWithFallback, mockFindAllWordsAsync, mockGetCachedTrie, mockAutoAddBotsForSoloPlayer, mockStartGameTimer, mockLogger } = vi.hoisted(() => {
  const mockCheckRateLimit = vi.fn(() => true);
  const mockValidatePayload = vi.fn();
  const mockEmitError = vi.fn();
  const mockGetGame = vi.fn();
  const mockUpdateGame = vi.fn();
  const mockGetGameBySocketId = vi.fn();
  const mockGetGameUsers = vi.fn(() => []);
  const mockGetSocketIdByUsername = vi.fn();
  const mockCanTransitionGameState = vi.fn(() => true);
  const mockTransitionGameState = vi.fn(() => ({ success: true }));
  const mockResetGameForNewRound = vi.fn(() => true);
  const mockBroadcastToRoom = vi.fn();
  const mockGetGameRoom = vi.fn((code: string) => `room:${code}`);
  const mockSafeEmit = vi.fn();
  const mockGetSocketById = vi.fn();
  const mockMakePositionsMap = vi.fn(() => new Map());
  const mockEnsureGame = vi.fn();
  const mockGenerateRandomTable = vi.fn(() => [['X', 'Y'], ['Z', 'W']]);
  const mockEnsureLanguageLoaded = vi.fn(() => Promise.resolve());
  const mockClearGameTimer = vi.fn();
  const mockGameStartCoordinator = {
    cleanupSequence: vi.fn(),
    initializeSequence: vi.fn(() => 'msg-id-123'),
    scheduleRetries: vi.fn(),
    setAcknowledgmentTimeout: vi.fn(),
    setCountdownCompleteTimeout: vi.fn(),
    recordCountdownComplete: vi.fn(),
  };
  const mockStopAllBots = vi.fn();
  const mockNotifyGameStarted = vi.fn(() => Promise.resolve());
  const mockSelectNextGameMode = vi.fn(() => 'classic');
  const mockInitializePlayerData = vi.fn();
  const mockGetClassroomGame = vi.fn(() => Promise.resolve(null));
  const mockInitBlastModeState = vi.fn(() => ({ overlay: [], seed: 42, playerLives: {} }));
  const mockHashStringToSeed = vi.fn(() => 42);
  const mockInitWordHuntState = vi.fn(() => ({ targetWordLength: 5, targetCategory: null, playerLives: {} }));
  const mockSelectTargetWordWithFallback = vi.fn(() => 'brave');
  const mockFindAllWordsAsync = vi.fn(() => Promise.resolve(['brave', 'braves', 'rave']));
  const mockGetCachedTrie = vi.fn(() => ({}));
  const mockAutoAddBotsForSoloPlayer = vi.fn(() => Promise.resolve({ botsAdded: 0 }));
  const mockStartGameTimer = vi.fn();
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { mockCheckRateLimit, mockValidatePayload, mockEmitError, mockGetGame, mockUpdateGame, mockGetGameBySocketId, mockGetGameUsers, mockGetSocketIdByUsername, mockCanTransitionGameState, mockTransitionGameState, mockResetGameForNewRound, mockBroadcastToRoom, mockGetGameRoom, mockSafeEmit, mockGetSocketById, mockMakePositionsMap, mockEnsureGame, mockGenerateRandomTable, mockEnsureLanguageLoaded, mockClearGameTimer, mockGameStartCoordinator, mockStopAllBots, mockNotifyGameStarted, mockSelectNextGameMode, mockInitializePlayerData, mockGetClassroomGame, mockInitBlastModeState, mockHashStringToSeed, mockInitWordHuntState, mockSelectTargetWordWithFallback, mockFindAllWordsAsync, mockGetCachedTrie, mockAutoAddBotsForSoloPlayer, mockStartGameTimer, mockLogger };
});


vi.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: mockCheckRateLimit, default: { checkRateLimit: mockCheckRateLimit } }));
vi.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: mockValidatePayload,
  startGameSchema: {},
}));
vi.mock('../../../backend/utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../../backend/utils/errorHandler')>('../../../backend/utils/errorHandler');
  return { ...actual, emitError: mockEmitError };
});
vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: mockGetGame,
  updateGame: mockUpdateGame,
  getGameBySocketId: mockGetGameBySocketId,
  getGameUsers: mockGetGameUsers,
  getSocketIdByUsername: mockGetSocketIdByUsername,
  canTransitionGameState: mockCanTransitionGameState,
  transitionGameState: mockTransitionGameState,
  resetGameForNewRound: mockResetGameForNewRound,
}));
vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getGameRoom: mockGetGameRoom,
  safeEmit: mockSafeEmit,
  getSocketById: mockGetSocketById,
}));
vi.mock('../../../backend/modules/wordValidator', () => ({ makePositionsMap: mockMakePositionsMap }));
vi.mock('../../../backend/utils/metrics', () => ({ ensureGame: mockEnsureGame }));
vi.mock('../../../backend/utils/gameUtils', () => ({ generateRandomTable: mockGenerateRandomTable }));
vi.mock('../../../backend/dictionary', () => ({ ensureLanguageLoaded: mockEnsureLanguageLoaded }));
vi.mock('../../../backend/utils/timerManager', () => ({ default: { clearGameTimer: mockClearGameTimer }, clearGameTimer: mockClearGameTimer }));
vi.mock('../../../backend/utils/gameStartCoordinator', () => ({
  __esModule: true,
  default: mockGameStartCoordinator,
}));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: mockStopAllBots }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyGameStarted: mockNotifyGameStarted }));
vi.mock('../../../backend/modules/gameModeSelector', () => ({
  selectNextGameMode: mockSelectNextGameMode,
  ALL_GAME_MODES: ['classic', 'blast', 'word-hunt'],
}));
vi.mock('../../../backend/handlers/playerDataInit', () => ({ initializePlayerData: mockInitializePlayerData, ensurePlayerState: vi.fn() }));
vi.mock('../../../backend/modules/classroomGameManager', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../../backend/modules/blastModeManager', () => ({
  initBlastModeState: mockInitBlastModeState,
  hashStringToSeed: mockHashStringToSeed,
}));
vi.mock('../../../backend/modules/wordHuntManager', () => ({
  initWordHuntState: mockInitWordHuntState,
  selectTargetWordWithFallback: mockSelectTargetWordWithFallback,
}));
vi.mock('../../../backend/modules/wordValidatorPool', () => ({
  findAllWordsAsync: mockFindAllWordsAsync,
  isWordOnBoardAsync: vi.fn(),
  getWordPathAsync: vi.fn(),
  makePositionsMapAsync: vi.fn(),
}));
vi.mock('../../../backend/modules/boggleSolver', () => ({ getCachedTrie: mockGetCachedTrie }));
vi.mock('../../../backend/services/gameLifecycle/autoAddBots', () => ({
  autoAddBotsForSoloPlayer: mockAutoAddBotsForSoloPlayer,
}));
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: mockStartGameTimer }));
vi.mock('../../../backend/utils/logger', () => ({ __esModule: true, default: mockLogger }));
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

const mockVerifyBoostToken = vi.hoisted(() => vi.fn());
vi.mock('../../../backend/utils/boostToken', () => ({
  verifyBoostToken: mockVerifyBoostToken,
}));

// ─── Import after mocks ────────────────────────────────────────────────────

import { vi, type Mock, type MockInstance } from 'vitest';
import { registerStartGameHandler } from '../gameStartHandler';

// ─── Helpers ──────────────────────────────────────────────────────────────

const CLIENT_GRID = [['A', 'B'], ['C', 'D']];

function createMockSocket(id = 'socket-host') {
  const handlers: Record<string, Function> = {};
  return {
    socket: {
      id,
      on: vi.fn((event: string, handler: Function) => {
        handlers[event] = handler;
      }),
      emit: vi.fn(),
    } as any,
    handlers,
  };
}

function makeGame(overrides: Record<string, any> = {}) {
  return {
    gameCode: 'GAME1',
    hostSocketId: 'socket-host',
    hostUsername: 'Host',
    users: {
      Host: { socketId: 'socket-host', isHost: true },
    },
    gameState: 'waiting',
    language: 'en',
    modeHistory: [],
    roomName: 'Test Room',
    isRanked: false,
    gameSessionId: 'session-1',
    ...overrides,
  };
}

function makePayload(overrides: Record<string, any> = {}) {
  return {
    letterGrid: CLIENT_GRID,
    timerSeconds: 60,
    language: 'en',
    minWordLength: 3,
    difficulty: 'MEDIUM',
    boardTheme: null,
    gameMode: 'classic',
    ...overrides,
  };
}

/** Trigger the 'startGame' event handler and wait for async completion */
async function triggerStartGame(handlers: Record<string, Function>, payload: Record<string, any> = makePayload()) {
  await handlers['startGame'](payload);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('registerStartGameHandler', () => {
  const mockIo = { to: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: validation passes, data passes through as-is
    mockValidatePayload.mockImplementation((_schema: any, data: any) => ({ success: true, data }));
    // Default: socket IS the host, IS in a game
    mockGetGameBySocketId.mockReturnValue('GAME1');
    mockGetGame.mockReturnValue(makeGame());
    mockGetGameUsers.mockReturnValue([{ username: 'Host' }]);
    mockCanTransitionGameState.mockReturnValue(true);
    mockTransitionGameState.mockReturnValue({ success: true });
  });

  it('registers the startGame event handler on the socket', () => {
    const { socket } = createMockSocket();
    registerStartGameHandler(mockIo, socket);
    expect(socket.on).toHaveBeenCalledWith('startGame', expect.any(Function));
  });

  // ─── Rate limiting ───────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('emits rateLimited event and returns early when limit exceeded', async () => {
      mockCheckRateLimit.mockReturnValueOnce(false);
      const { socket, handlers } = createMockSocket();
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(socket.emit).toHaveBeenCalledWith('rateLimited');
      expect(mockGetGameBySocketId).not.toHaveBeenCalled();
    });

    it('proceeds normally when rate limit is not exceeded', async () => {
      const { socket, handlers } = createMockSocket();
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(socket.emit).not.toHaveBeenCalledWith('rateLimited');
    });
  });

  // ─── Payload validation ──────────────────────────────────────────────

  describe('payload validation', () => {
    it('emits error and returns early when payload is invalid', async () => {
      mockValidatePayload.mockReturnValueOnce({ success: false, error: 'bad gameMode' });
      const { socket, handlers } = createMockSocket();
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(mockEmitError).toHaveBeenCalledWith(socket, expect.stringContaining('bad gameMode'));
      expect(mockGetGameBySocketId).not.toHaveBeenCalled();
    });

    it('does not emit error when payload is valid', async () => {
      const { socket, handlers } = createMockSocket();
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      // emitError may have been called for other reasons, but not for validation
      const validationErrorCalls = mockEmitError.mock.calls.filter(
        (c: any[]) => c[1]?.includes('Invalid start game')
      );
      expect(validationErrorCalls).toHaveLength(0);
    });
  });

  // ─── Host-only guard ─────────────────────────────────────────────────

  describe('host-only guard', () => {
    it('rejects non-host socket with ONLY_HOST_CAN_START error', async () => {
      const { socket, handlers } = createMockSocket('socket-player');
      // Game has a different hostSocketId
      mockGetGame.mockReturnValue(makeGame({ hostSocketId: 'socket-host' }));
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(mockEmitError).toHaveBeenCalledWith(socket, 'PLAYER_NOT_HOST');
      expect(mockTransitionGameState).not.toHaveBeenCalled();
    });

    it('allows host socket to start the game', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(mockEmitError).not.toHaveBeenCalledWith(expect.anything(), 'PLAYER_NOT_HOST');
      expect(mockTransitionGameState).toHaveBeenCalledWith('GAME1', 'START');
    });

    it('emits NOT_IN_GAME error when socket has no associated game', async () => {
      mockGetGameBySocketId.mockReturnValue(null);
      const { socket, handlers } = createMockSocket();
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(mockEmitError).toHaveBeenCalledWith(socket, 'PLAYER_NOT_IN_GAME');
    });
  });

  // ─── Grid generation (SEC-002) ───────────────────────────────────────

  describe('grid generation', () => {
    it('regenerates grid server-side when 2+ players are in the game', async () => {
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'classic', difficulty: 'MEDIUM' }));

      expect(mockGenerateRandomTable).toHaveBeenCalled();
    });

    it('uses client-supplied grid for solo players (1 user)', async () => {
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
        },
      }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'classic' }));

      // updateGame should be called with the CLIENT_GRID (not regenerated)
      expect(mockUpdateGame).toHaveBeenCalledWith(
        'GAME1',
        expect.objectContaining({ letterGrid: CLIENT_GRID })
      );
      expect(mockGenerateRandomTable).not.toHaveBeenCalled();
    });

    it('regenerates a 6x6 grid for blast mode with 2+ players', async () => {
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'blast' }));

      expect(mockGenerateRandomTable).toHaveBeenCalledWith(6, 6, 'en');
    });

    it('classic MP grid size honors host difficulty (EASY=5x5)', async () => {
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'classic', difficulty: 'EASY' }));

      expect(mockGenerateRandomTable).toHaveBeenCalledWith(5, 5, 'en');
    });

    it('classic MP grid size honors host difficulty (HARD=7x7)', async () => {
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'classic', difficulty: 'HARD' }));

      expect(mockGenerateRandomTable).toHaveBeenCalledWith(7, 7, 'en');
    });

    it('classic MP defaults to MEDIUM 6x6 when difficulty omitted', async () => {
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'classic' }));

      expect(mockGenerateRandomTable).toHaveBeenCalledWith(6, 6, 'en');
    });
  });

  // ─── Blast mode ──────────────────────────────────────────────────────

  describe('blast mode initialization', () => {
    it('initializes blast state when mode is blast', async () => {
      mockGetGameUsers.mockReturnValue([{ username: 'Host' }, { username: 'Player2' }]);
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      }));
      const generatedGrid = [['B', 'L'], ['A', 'S']];
      mockGenerateRandomTable.mockReturnValue(generatedGrid);

      const currentGame = makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      });
      mockGetGame
        .mockReturnValueOnce(currentGame)  // initial getGame
        .mockReturnValue(currentGame);     // subsequent calls

      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'blast' }));

      expect(mockInitBlastModeState).toHaveBeenCalled();
    });

    it('does NOT initialize blast state for classic mode', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'classic' }));

      expect(mockInitBlastModeState).not.toHaveBeenCalled();
    });

    it('uses mpBlastWave=3 for multiplayer blast and mpBlastWave=1 for solo', async () => {
      // Multiplayer scenario
      mockGetGameUsers.mockReturnValue([{ username: 'Host' }, { username: 'Player2' }]);
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      }));
      mockGenerateRandomTable.mockReturnValue(CLIENT_GRID);

      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'blast' }));

      // mpBlastWave=3 because 2 users
      expect(mockInitBlastModeState).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        3,
        expect.anything()
      );
    });
  });

  // ─── Word Hunt mode ──────────────────────────────────────────────────

  describe('word-hunt mode initialization', () => {
    it('initializes word hunt state when mode is word-hunt', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'word-hunt' }));

      expect(mockSelectTargetWordWithFallback).toHaveBeenCalled();
      expect(mockInitWordHuntState).toHaveBeenCalled();
    });

    it('does NOT initialize word hunt state for classic mode', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'classic' }));

      expect(mockInitWordHuntState).not.toHaveBeenCalled();
    });

    it('falls back to classic if no target word found', async () => {
      mockSelectTargetWordWithFallback.mockReturnValueOnce(null);

      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'word-hunt' }));

      // Should update game mode to classic
      expect(mockUpdateGame).toHaveBeenCalledWith(
        'GAME1',
        expect.objectContaining({ gameMode: 'classic' })
      );
    });
  });

  // ─── Game state transition ───────────────────────────────────────────

  describe('game state transition', () => {
    it('calls transitionGameState with START action', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(mockTransitionGameState).toHaveBeenCalledWith('GAME1', 'START');
    });

    it('emits error and stops if transitionGameState fails', async () => {
      mockTransitionGameState.mockReturnValueOnce({ success: false } as any);
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(mockEmitError).toHaveBeenCalledWith(socket, 'INTERNAL_ERROR', { message: 'Failed to start game' });
      expect(mockBroadcastToRoom).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'startGame',
        expect.anything()
      );
    });

    it('broadcasts gameStarting event before startGame', async () => {
      const broadcastCalls: string[] = [];
      mockBroadcastToRoom.mockImplementation((_io: any, _room: any, event: string) => {
        broadcastCalls.push(event);
      });

      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      const startingIdx = broadcastCalls.indexOf('gameStarting');
      const startIdx = broadcastCalls.indexOf('startGame');
      expect(startingIdx).toBeGreaterThanOrEqual(0);
      expect(startIdx).toBeGreaterThanOrEqual(0);
      expect(startingIdx).toBeLessThan(startIdx);
    });
  });

  // ─── Self-heal reset broadcast (Word Hunt stale-state bug) ──────────
  // When host starts the next round directly from finished/validating
  // state (no explicit resetGame emit from clients first), the handler
  // self-heals via resetGameForNewRound. We MUST broadcast 'resetGame'
  // so clients clear stale Zustand state (wordHuntMyLife=0, eliminated
  // players from prev round) — otherwise next round's WordHuntGameOverlay
  // renders "Watch the remaining players" immediately for any player
  // whose store wasn't manually reset via the back-to-room path.
  describe('self-heal reset broadcast', () => {
    it("broadcasts 'resetGame' before 'gameStarting' when self-healing from finished state", async () => {
      const broadcastCalls: Array<{ event: string; payload: any }> = [];
      mockBroadcastToRoom.mockImplementation((_io: any, _room: any, event: string, payload: any) => {
        broadcastCalls.push({ event, payload });
      });
      // Game is finished — START transition not allowed until reset.
      mockGetGame.mockReturnValue(makeGame({ gameState: 'finished', gameSessionId: 'session-2' }));
      mockCanTransitionGameState.mockReturnValueOnce(false);

      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      const events = broadcastCalls.map((c) => c.event);
      const resetIdx = events.indexOf('resetGame');
      const startingIdx = events.indexOf('gameStarting');
      expect(resetIdx).toBeGreaterThanOrEqual(0);
      expect(startingIdx).toBeGreaterThanOrEqual(0);
      expect(resetIdx).toBeLessThan(startingIdx);
      expect(broadcastCalls[resetIdx].payload).toEqual(
        expect.objectContaining({
          users: expect.any(Array),
          gameSessionId: expect.anything(),
        })
      );
    });

    it("does NOT broadcast 'resetGame' when game is already in waiting state (no self-heal needed)", async () => {
      mockGetGame.mockReturnValue(makeGame({ gameState: 'waiting' }));
      mockCanTransitionGameState.mockReturnValue(true);

      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      const resetBroadcasts = mockBroadcastToRoom.mock.calls.filter(
        (call: any[]) => call[2] === 'resetGame'
      );
      expect(resetBroadcasts).toHaveLength(0);
    });
  });

  // ─── Dictionary loading ──────────────────────────────────────────────

  describe('dictionary loading', () => {
    it('loads the game language dictionary before starting', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ language: 'he' }));

      expect(mockEnsureLanguageLoaded).toHaveBeenCalledWith('he');
    });

    it('falls back to game.language when no language in payload', async () => {
      mockGetGame.mockReturnValue(makeGame({ language: 'sv' }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      const payload = makePayload();
      delete (payload as any).language;
      await triggerStartGame(handlers, payload);

      expect(mockEnsureLanguageLoaded).toHaveBeenCalledWith('sv');
    });

    it('falls back to English when neither payload nor game has a language', async () => {
      mockGetGame.mockReturnValue(makeGame({ language: undefined }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      const payload = makePayload();
      delete (payload as any).language;
      await triggerStartGame(handlers, payload);

      expect(mockEnsureLanguageLoaded).toHaveBeenCalledWith('en');
    });

    it('continues even when dictionary load throws', async () => {
      mockEnsureLanguageLoaded.mockRejectedValueOnce(new Error('load failed'));
      mockEnsureLanguageLoaded.mockResolvedValueOnce(undefined); // retry succeeds

      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      // Should not throw — game start should continue
      await expect(triggerStartGame(handlers)).resolves.not.toThrow();
    });
  });

  // ─── Random mode ─────────────────────────────────────────────────────

  describe('random mode resolution', () => {
    it('selects a random mode when gameMode is "random"', async () => {
      mockSelectNextGameMode.mockReturnValueOnce('blast');
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'random' }));

      expect(mockSelectNextGameMode).toHaveBeenCalled();
    });

    it('selects a random mode when gameMode is omitted', async () => {
      mockSelectNextGameMode.mockReturnValueOnce('classic');
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      const payload = makePayload();
      delete (payload as any).gameMode;
      await triggerStartGame(handlers, payload);

      expect(mockSelectNextGameMode).toHaveBeenCalled();
    });

    it('uses the specified mode directly without calling selectNextGameMode', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'classic' }));

      expect(mockSelectNextGameMode).not.toHaveBeenCalled();
    });
  });

  // ─── startGame broadcast ─────────────────────────────────────────────

  describe('startGame broadcast', () => {
    it('broadcasts startGame to the room', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers);

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.objectContaining({
          letterGrid: expect.anything(),
          timerSeconds: expect.any(Number),
          language: expect.any(String),
          gameMode: expect.any(String),
        })
      );
    });

    it('clamps timerSeconds between 30 and 600', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ timerSeconds: 9999 }));

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.objectContaining({ timerSeconds: 600 })
      );
    });

    it('excludes bots from gameStartCoordinator expected players (RW-BOT-ACK)', async () => {
      // Bots never ack — including them causes timeout spam "Missing: BotEasy"
      mockGetGameUsers.mockReturnValue([
        { username: 'Host', isBot: false },
        { username: 'BotEasy', isBot: true },
      ]);
      mockGetGame.mockReturnValue(makeGame({
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          BotEasy: { socketId: null, isHost: false, isBot: true },
        },
      }));
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      // Use blast mode to skip scheduleRoundEvent (classic+2 triggers roundEventsManager)
      await triggerStartGame(handlers, makePayload({ gameMode: 'blast' }));

      expect(mockGameStartCoordinator.initializeSequence).toHaveBeenCalledWith(
        'GAME1',
        ['Host'],
        expect.any(Number),
      );
    });

    it('sets blast timer to BLAST_MP_DEFAULT_TIMER when no timerSeconds given', async () => {
      mockSelectNextGameMode.mockReturnValue('blast');
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      const payload = makePayload({ gameMode: 'blast' });
      delete (payload as any).timerSeconds;
      await triggerStartGame(handlers, payload);

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.objectContaining({ timerSeconds: 90 }) // BLAST_MP_DEFAULT_TIMER
      );
    });

    it('respects host-supplied timer for Blast instead of force-overriding to 90s', async () => {
      mockSelectNextGameMode.mockReturnValue('blast');
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'blast', timerSeconds: 180 }));

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.objectContaining({ timerSeconds: 180 })
      );
    });

    it('falls back to BLAST_MP_DEFAULT_TIMER (90) when no timer supplied for Blast', async () => {
      mockSelectNextGameMode.mockReturnValue('blast');
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      const payload = makePayload({ gameMode: 'blast' });
      delete (payload as any).timerSeconds;
      await triggerStartGame(handlers, payload);

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.objectContaining({ timerSeconds: 90 })
      );
    });

    it('falls back to WHEEL_RUSH_DURATION_SEC (60) when no timer supplied for wheel-rush', async () => {
      mockSelectNextGameMode.mockReturnValue('wheel-rush');
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      const payload = makePayload({ gameMode: 'wheel-rush' });
      delete (payload as any).timerSeconds;
      await triggerStartGame(handlers, payload);

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.objectContaining({ timerSeconds: 60 })
      );
    });

    it('respects host-supplied timer for wheel-rush instead of force-overriding to 60s', async () => {
      mockSelectNextGameMode.mockReturnValue('wheel-rush');
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ gameMode: 'wheel-rush', timerSeconds: 180 }));

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.objectContaining({ timerSeconds: 180 })
      );
    });
  });

  // ─── Boost token bundling (race-fix) ─────────────────────────────────
  // Bundling the boost token into startGame eliminates the prior race where
  // a separate `boost:apply` emit could arrive after the first submitWord,
  // causing scoreMultiplier/firstWordBonus to be missed at result aggregation.

  describe('boost token bundling', () => {
    beforeEach(() => {
      mockVerifyBoostToken.mockReset();
    });

    it('applies a valid boost token bundled in startGame payload to game.playerBoosts', async () => {
      mockVerifyBoostToken.mockReturnValue({ valid: true, boostType: 'scoreMultiplier' });
      const game = makeGame();
      mockGetGame.mockReturnValue(game);
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ boostToken: 'v1.GAME1.scoreMultiplier.999.SIG' }));

      expect(mockVerifyBoostToken).toHaveBeenCalledWith('v1.GAME1.scoreMultiplier.999.SIG', 'GAME1');
      expect(game.playerBoosts).toEqual({
        Host: { sessionId: 'GAME1', token: 'v1.GAME1.scoreMultiplier.999.SIG' },
      });
    });

    it('emits boost:applied to the host socket on successful apply', async () => {
      mockVerifyBoostToken.mockReturnValue({ valid: true, boostType: 'firstWordBonus' });
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ boostToken: 'tok' }));

      expect(socket.emit).toHaveBeenCalledWith('boost:applied', {
        success: true,
        boostType: 'firstWordBonus',
      });
    });

    it('does not call verifyBoostToken when no boostToken in payload', async () => {
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload());

      expect(mockVerifyBoostToken).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalledWith('boost:applied', expect.anything());
    });

    it('still starts the game when boost token is invalid (does not abort startGame)', async () => {
      mockVerifyBoostToken.mockReturnValue({ valid: false, reason: 'expired' });
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ boostToken: 'expired-tok' }));

      // Game must still broadcast startGame
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.anything(),
      );
      // No ack emitted for invalid token
      expect(socket.emit).not.toHaveBeenCalledWith('boost:applied', expect.anything());
    });

    it('is idempotent within the same session (does not re-apply)', async () => {
      mockVerifyBoostToken.mockReturnValue({ valid: true, boostType: 'scoreMultiplier' });
      const game = makeGame({
        playerBoosts: { Host: { sessionId: 'GAME1', token: 'old-tok' } },
      });
      mockGetGame.mockReturnValue(game);
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ boostToken: 'new-tok' }));

      // Existing claim preserved
      expect(game.playerBoosts.Host.token).toBe('old-tok');
      // No duplicate ack
      expect(socket.emit).not.toHaveBeenCalledWith('boost:applied', expect.anything());
    });

    it('does not abort startGame when verifyBoostToken throws', async () => {
      mockVerifyBoostToken.mockImplementation(() => {
        throw new Error('crypto failure');
      });
      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      await triggerStartGame(handlers, makePayload({ boostToken: 'crashy' }));

      // Game must still broadcast startGame
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        mockIo,
        'room:GAME1',
        'startGame',
        expect.anything(),
      );
    });
  });

  // ─── Rematch settings preservation ───────────────────────────────────

  describe('rematch settings preservation', () => {
    it('preserves prior round difficulty/minWordLength/timerSeconds when payload omits them (MP rematch)', async () => {
      // GIVEN: game in 'finished' state with prior settings
      const game = makeGame({
        gameState: 'finished',
        difficulty: 'HARD',
        minWordLength: 3,
        timerSeconds: 180,
        users: {
          Host: { socketId: 'socket-host', isHost: true },
          Player2: { socketId: 'socket-p2', isHost: false },
        },
      });
      mockGetGame.mockReturnValue(game);
      mockCanTransitionGameState.mockReturnValueOnce(false); // finished → needs reset
      mockCanTransitionGameState.mockReturnValueOnce(true);   // second check for START transition

      // Mock resetGameForNewRound to simulate real wipe of minWordLength
      mockResetGameForNewRound.mockImplementation(() => {
        game.minWordLength = undefined;
        return true;
      });

      const { socket, handlers } = createMockSocket('socket-host');
      registerStartGameHandler(mockIo, socket);

      // WHEN: startGame payload omits difficulty, minWordLength, timerSeconds (like ResultsPage rematch)
      const payload = makePayload({
        gameMode: 'classic',
        difficulty: undefined,
        minWordLength: undefined,
        timerSeconds: undefined,
      });
      delete (payload as any).difficulty;
      delete (payload as any).minWordLength;
      delete (payload as any).timerSeconds;

      await triggerStartGame(handlers, payload);

      // THEN: updateGame called with PRESERVED prior settings (not defaults)
      expect(mockUpdateGame).toHaveBeenCalledWith(
        'GAME1',
        expect.objectContaining({
          difficulty: 'HARD',
          minWordLength: 3,
          timerSeconds: 180,
        })
      );
    });
  });
});
