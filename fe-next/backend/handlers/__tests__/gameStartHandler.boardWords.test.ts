/**
 * gameStartHandler - emitTotalBoardWords async offloading tests (PERF-012)
 *
 * Verifies that total board word counting is delegated to
 * wordValidatorPool.findAllWordsAsync, keeping the event loop free.
 */

const { mockFindAllWordsAsync, mockGetCachedTrie, mockGetGame, mockBroadcastToRoom, mockGetGameRoom, mockLogger } = vi.hoisted(() => {
  const mockFindAllWordsAsync = vi.fn();
  const mockGetCachedTrie = vi.fn();
  const mockGetGame = vi.fn();
  const mockBroadcastToRoom = vi.fn();
  const mockGetGameRoom = vi.fn(() => 'room:TEST');
  const mockLogger = { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() };
  return { mockFindAllWordsAsync, mockGetCachedTrie, mockGetGame, mockBroadcastToRoom, mockGetGameRoom, mockLogger };
});

vi.mock('../../../backend/modules/wordValidatorPool', () => ({
  findAllWordsAsync: mockFindAllWordsAsync,
  isWordOnBoardAsync: vi.fn(),
  getWordPathAsync: vi.fn(),
  makePositionsMapAsync: vi.fn(),
}));

vi.mock('../../../backend/modules/boggleSolver', () => ({
  // findAllWords should NOT be called directly — only via the pool
  findAllWords: vi.fn(() => { throw new Error('findAllWords called directly — must use pool'); }),
  getCachedTrie: mockGetCachedTrie,
}));

vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: mockGetGame,
  updateGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getGameUsers: vi.fn(() => []),
  getSocketIdByUsername: vi.fn(),
  canTransitionGameState: vi.fn(() => true),
  transitionGameState: vi.fn(),
  resetGameForNewRound: vi.fn(),
}));

vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getGameRoom: mockGetGameRoom,
  safeEmit: vi.fn(),
  getSocketById: vi.fn(),
}));

vi.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));
vi.mock('../../../backend/modules/wordValidator', () => ({ makePositionsMap: vi.fn(() => new Map()) }));
vi.mock('../../../backend/utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../../backend/utils/errorHandler')>('../../../backend/utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});
vi.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true), default: { checkRateLimit: vi.fn(() => true) } }));
vi.mock('../../../backend/utils/gameStartCoordinator', () => ({ default: { prepareGame: vi.fn() } }));
vi.mock('../../../backend/utils/timerManager', () => ({ default: { clearGameTimer: vi.fn() }, clearGameTimer: vi.fn() }));
vi.mock('../../../backend/utils/metrics', () => ({ ensureGame: vi.fn() }));
vi.mock('../../../backend/utils/gameUtils', () => ({ generateRandomTable: vi.fn(() => [['A']]) }));
vi.mock('../../../backend/dictionary', () => ({ ensureLanguageLoaded: vi.fn() }));
vi.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: vi.fn(() => ({ success: true, data: {} })),
  startGameSchema: {},
}));
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: vi.fn() }));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: vi.fn() }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyGameStarted: vi.fn() }));
vi.mock('../../../backend/modules/gameModeSelector', () => ({
  selectNextGameMode: vi.fn(() => 'classic'),
  ALL_GAME_MODES: [],
}));
vi.mock('../../../backend/handlers/playerDataInit', () => ({ initializePlayerData: vi.fn(), ensurePlayerState: vi.fn() }));
vi.mock('../../../backend/modules/classroomGameManager', () => ({ getClassroomGame: vi.fn(() => null) }));
vi.mock('../../../backend/modules/blastModeManager', () => ({
  initBlastModeState: vi.fn(),
  hashStringToSeed: vi.fn(() => 0),
}));
vi.mock('../../../backend/modules/wordHuntManager', () => ({
  initWordHuntState: vi.fn(),
  selectTargetWordWithFallback: vi.fn(),
}));
vi.mock('../../../backend/services/gameLifecycle/autoAddBots', () => ({ autoAddBotsForSoloPlayer: vi.fn() }));
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

// Import the internal function under test via the module's exports.
// We test the observable side-effect: broadcastToRoom called with totalBoardWords.
import { vi, type Mock, type MockInstance } from 'vitest';
import { emitTotalBoardWordsForTest } from '../gameStartHandler';

const GRID = [
  ['C', 'A', 'T'],
  ['D', 'O', 'G'],
  ['E', 'F', 'S'],
];

describe('emitTotalBoardWords (PERF-012)', () => {
  const fakeIo = {} as never;
  const gameCode = 'TEST';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCachedTrie.mockReturnValue({});
    const mockGame = { totalBoardWords: 0 };
    mockGetGame.mockReturnValue(mockGame);
  });

  it('uses findAllWordsAsync from the pool instead of direct findAllWords', async () => {
    mockFindAllWordsAsync.mockResolvedValue(['cat', 'dog', 'cog', 'goats', 'doges']);

    await emitTotalBoardWordsForTest(fakeIo, gameCode, GRID, 'en', 3);

    expect(mockFindAllWordsAsync).toHaveBeenCalledWith(
      GRID,
      'en',
      expect.objectContaining({ minLength: 3 })
    );
  });

  it('broadcasts only words >= 5 letters as totalBoardWords', async () => {
    // 'cat','dog','cog' are <5; 'goats','doges' are 5-letter
    mockFindAllWordsAsync.mockResolvedValue(['cat', 'dog', 'cog', 'goats', 'doges']);

    await emitTotalBoardWordsForTest(fakeIo, gameCode, GRID, 'en', 3);

    expect(mockBroadcastToRoom).toHaveBeenCalledWith(
      fakeIo,
      'room:TEST',
      'totalBoardWords',
      { count: 2 }
    );
  });

  it('updates game.totalBoardWords in state', async () => {
    mockFindAllWordsAsync.mockResolvedValue(['goats', 'doges', 'dog']);
    const mockGame = { totalBoardWords: 0 };
    mockGetGame.mockReturnValue(mockGame);

    await emitTotalBoardWordsForTest(fakeIo, gameCode, GRID, 'en', 3);

    expect(mockGame.totalBoardWords).toBe(2);
  });

  it('logs error and does not throw when pool rejects', async () => {
    mockFindAllWordsAsync.mockRejectedValue(new Error('pool error'));

    await expect(
      emitTotalBoardWordsForTest(fakeIo, gameCode, GRID, 'en', 3)
    ).resolves.not.toThrow();

    expect(mockLogger.error).toHaveBeenCalled();
  });
});
