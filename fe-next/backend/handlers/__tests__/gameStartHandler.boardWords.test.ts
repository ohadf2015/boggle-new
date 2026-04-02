/**
 * gameStartHandler - emitTotalBoardWords async offloading tests (PERF-012)
 *
 * Verifies that total board word counting is delegated to
 * wordValidatorPool.findAllWordsAsync, keeping the event loop free.
 */

const mockFindAllWordsAsync = jest.fn();
const mockGetCachedTrie = jest.fn();
const mockGetGame = jest.fn();
const mockBroadcastToRoom = jest.fn();
const mockGetGameRoom = jest.fn(() => 'room:TEST');
const mockLogger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() };

jest.mock('../../../backend/modules/wordValidatorPool', () => ({
  findAllWordsAsync: mockFindAllWordsAsync,
  isWordOnBoardAsync: jest.fn(),
  getWordPathAsync: jest.fn(),
  makePositionsMapAsync: jest.fn(),
}));

jest.mock('../../../backend/modules/boggleSolver', () => ({
  // findAllWords should NOT be called directly — only via the pool
  findAllWords: jest.fn(() => { throw new Error('findAllWords called directly — must use pool'); }),
  getCachedTrie: mockGetCachedTrie,
}));

jest.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: mockGetGame,
  updateGame: jest.fn(),
  getGameBySocketId: jest.fn(),
  getGameUsers: jest.fn(() => []),
  getSocketIdByUsername: jest.fn(),
  canTransitionGameState: jest.fn(() => true),
  transitionGameState: jest.fn(),
  resetGameForNewRound: jest.fn(),
}));

jest.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getGameRoom: mockGetGameRoom,
  safeEmit: jest.fn(),
  getSocketById: jest.fn(),
}));

jest.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: mockLogger,
}));
jest.mock('../../../backend/modules/wordValidator', () => ({ makePositionsMap: jest.fn(() => new Map()) }));
jest.mock('../../../backend/utils/errorHandler', () => ({ emitError: jest.fn(), ErrorMessages: {} }));
jest.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: jest.fn(() => true) }));
jest.mock('../../../backend/utils/gameStartCoordinator', () => ({ default: { prepareGame: jest.fn() } }));
jest.mock('../../../backend/utils/timerManager', () => ({ clearGameTimer: jest.fn() }));
jest.mock('../../../backend/utils/metrics', () => ({ ensureGame: jest.fn() }));
jest.mock('../../../backend/utils/gameUtils', () => ({ generateRandomTable: jest.fn(() => [['A']]) }));
jest.mock('../../../backend/dictionary', () => ({ ensureLanguageLoaded: jest.fn() }));
jest.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: jest.fn(() => ({ success: true, data: {} })),
  startGameSchema: {},
}));
jest.mock('../../../backend/handlers/shared', () => ({ startGameTimer: jest.fn() }));
jest.mock('../../../backend/modules/botManager', () => ({ stopAllBots: jest.fn() }));
jest.mock('../../../backend/modules/notificationService', () => ({ notifyGameStarted: jest.fn() }));
jest.mock('../../../backend/modules/gameModeSelector', () => ({
  selectNextGameMode: jest.fn(() => 'classic'),
  ALL_GAME_MODES: [],
}));
jest.mock('../../../backend/handlers/gameLifecycleHandler', () => ({ initializePlayerData: jest.fn() }));
jest.mock('../../../backend/modules/classroomGameManager', () => ({ getClassroomGame: jest.fn(() => null) }));
jest.mock('../../../backend/modules/blastModeManager', () => ({
  initBlastModeState: jest.fn(),
  hashStringToSeed: jest.fn(() => 0),
}));
jest.mock('../../../backend/modules/wordHuntManager', () => ({
  initWordHuntState: jest.fn(),
  selectTargetWordWithFallback: jest.fn(),
}));
jest.mock('../../../backend/services/gameLifecycle/autoAddBots', () => ({ autoAddBotsForSoloPlayer: jest.fn() }));
jest.mock('@/shared/constants/wordHuntMultiplayerConstants', () => ({
  HUNT_TARGET_MIN_LENGTH: 4,
  HUNT_TARGET_MAX_LENGTH: 8,
}));
jest.mock('@/shared/constants/gameConstants', () => ({ BLAST_MP_DEFAULT_TIMER: 90 }));

// Import the internal function under test via the module's exports.
// We test the observable side-effect: broadcastToRoom called with totalBoardWords.
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
    jest.clearAllMocks();
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
