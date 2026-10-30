const { mockSelectMode, mockAutoAdd, mockGenerateRandomTable, mockIsWordOnBoard, mockSetPlaced, mockGetClassroomGame, mockGetGame, mockUpdateGame, mockGetGameBySocketId, mockBroadcastToRoom, mockLogger } = vi.hoisted(() => ({
  mockAutoAdd: vi.fn(() => Promise.resolve({ botsAdded: 0 })),
  mockGenerateRandomTable: vi.fn(),
  mockIsWordOnBoard: vi.fn(() => true),
  mockSetPlaced: vi.fn(() => Promise.resolve(undefined)),
  mockGetClassroomGame: vi.fn(() => Promise.resolve(null)),
  mockGetGame: vi.fn(),
  mockUpdateGame: vi.fn(),
  mockGetGameBySocketId: vi.fn(() => 'GAME1'),
  mockBroadcastToRoom: vi.fn(),
  mockLogger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  mockSelectMode: vi.fn(() => 'classic'),
}));

vi.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true), default: { checkRateLimit: vi.fn(() => true) } }));
vi.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: vi.fn((_s: unknown, d: unknown) => ({ success: true, data: d })),
  startGameSchema: {},
}));
vi.mock('../../../backend/utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../../backend/utils/errorHandler')>('../../../backend/utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});
vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: mockGetGame,
  updateGame: mockUpdateGame,
  getGameBySocketId: mockGetGameBySocketId,
  getGameUsers: vi.fn(() => [{ username: 'Host' }]),
  getSocketIdByUsername: vi.fn(),
  canTransitionGameState: vi.fn(() => true),
  transitionGameState: vi.fn(() => ({ success: true })),
  resetGameForNewRound: vi.fn(() => true),
}));
vi.mock('../../../backend/utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getGameRoom: vi.fn((c: string) => `room:${c}`),
  safeEmit: vi.fn(),
  getSocketById: vi.fn(() => null),
}));
vi.mock('../../../backend/modules/wordValidator', () => ({
  makePositionsMap: vi.fn(() => new Map()),
  normalizeWordForLanguage: vi.fn((w: string) => w.toLowerCase()),
  isWordOnBoard: mockIsWordOnBoard,
}));
vi.mock('../../../backend/utils/metrics', () => ({ ensureGame: vi.fn() }));
vi.mock('../../../backend/utils/gameUtils', () => ({ generateRandomTable: mockGenerateRandomTable }));
vi.mock('../../../backend/dictionary', () => ({ ensureLanguageLoaded: vi.fn() }));
vi.mock('../../../backend/utils/timerManager', () => ({ default: { clearGameTimer: vi.fn(), setTimeout: vi.fn(), clearTimer: vi.fn() }, clearGameTimer: vi.fn() }));
vi.mock('../../../backend/utils/gameStartCoordinator', () => ({ __esModule: true, default: {
  cleanupSequence: vi.fn(), initializeSequence: vi.fn(() => 'msg-1'), scheduleRetries: vi.fn(),
  setAcknowledgmentTimeout: vi.fn(), setCountdownCompleteTimeout: vi.fn(), recordCountdownComplete: vi.fn(),
} }));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: vi.fn() }));
// Must return a promise: the handler chains `.catch()` onto it.
vi.mock('../../../backend/modules/notificationService', () => ({ notifyGameStarted: vi.fn(() => Promise.resolve()) }));
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: vi.fn() }));
vi.mock('../../../backend/modules/gameModeSelector', () => ({ selectNextGameMode: mockSelectMode, ALL_GAME_MODES: ['classic'] }));
vi.mock('../../../backend/handlers/playerDataInit', () => ({ initializePlayerData: vi.fn(), ensurePlayerState: vi.fn() }));
vi.mock('../../../backend/modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
  beginClassroomRound: mockGetClassroomGame,
  setClassroomGamePlacedVocabulary: mockSetPlaced,
  reopenClassroomGameForRound: vi.fn(async () => undefined),
}));
vi.mock('../../../backend/modules/blastModeManager', () => ({ initBlastModeState: vi.fn(() => ({ overlay: [], seed: 1, playerLives: {} })), hashStringToSeed: vi.fn(() => 1) }));
vi.mock('../../../backend/modules/wordHuntManager', () => ({ initWordHuntState: vi.fn(), selectTargetWordWithFallback: vi.fn(() => null) }));
vi.mock('../../../backend/services/gameLifecycle/autoAddBots', () => ({ autoAddBotsForSoloPlayer: mockAutoAdd }));
vi.mock('../../../backend/modules/wordValidatorPool', () => ({ findAllWordsAsync: vi.fn(() => Promise.resolve([])), isWordOnBoardAsync: vi.fn(), getWordPathAsync: vi.fn(), makePositionsMapAsync: vi.fn() }));
vi.mock('../../../backend/modules/boggleSolver', () => ({ findAllWords: vi.fn(() => []), getCachedTrie: vi.fn(() => ({})) }));
vi.mock('../../../backend/utils/logger', () => ({ __esModule: true, default: mockLogger }));

import { vi } from 'vitest';
import { registerStartGameHandler } from '../gameStartHandler';
import { emitError } from '../../../backend/utils/errorHandler';
import { transitionGameState, resetGameForNewRound } from '../../../backend/modules/gameStateManager';


const START = {
  letterGrid: [['A', 'B'], ['C', 'D']], timerSeconds: 60, language: 'en',
  minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'classic',
};

function makeSocket() {
  const handlers: Record<string, (d: unknown) => Promise<void>> = {};
  const socket = {
    id: 'socket-host',
    on: vi.fn((e: string, fn: (d: unknown) => Promise<void>) => { handlers[e] = fn; }),
    emit: vi.fn(),
    data: {},
    handshake: { auth: {} },
  };
  registerStartGameHandler({ to: vi.fn() } as never, socket as never);
  return handlers;
}

describe('startGame failure recovery and final-board setup', () => {
  let game: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectMode.mockReturnValue('classic');
    mockGetClassroomGame.mockResolvedValue(null as never);
    mockAutoAdd.mockResolvedValue({ botsAdded: 0 } as never);
    mockGenerateRandomTable.mockReturnValue([['A', 'B'], ['C', 'D']]);
    game = {
      gameCode: 'GAME1', hostSocketId: 'socket-host', hostUsername: 'Host',
      users: { Host: { socketId: 'socket-host', isHost: true } },
      gameState: 'waiting', language: 'en', modeHistory: [], roomName: 'R',
      isRanked: false, gameSessionId: 's1',
    };
    mockGetGame.mockReturnValue(game);
  });

  it('puts the room back in the lobby and tells everyone when setup throws mid-start', async () => {
    mockAutoAdd.mockRejectedValueOnce(new Error('bot service down') as never);
    const handlers = makeSocket();

    await handlers['startGame'](START);

    expect(resetGameForNewRound).toHaveBeenCalledWith('GAME1');
    expect(mockBroadcastToRoom).toHaveBeenCalledWith(expect.anything(), 'room:GAME1', 'resetGame', expect.anything());
    expect(emitError).toHaveBeenCalled();
  });

  it('releases the start lock after a failure so the host can try again', async () => {
    mockAutoAdd.mockRejectedValueOnce(new Error('bot service down') as never);
    const handlers = makeSocket();
    await handlers['startGame'](START);
    (transitionGameState as any).mockClear();

    await handlers['startGame'](START);

    expect(transitionGameState).toHaveBeenCalledTimes(1);
  });

  it('releases the start lock when the failure happens before the state transition', async () => {
    mockSelectMode.mockImplementationOnce(() => { throw new Error('bad pool'); });
    const handlers = makeSocket();

    await handlers['startGame']({ ...START, gameMode: 'random' });
    expect(emitError).toHaveBeenCalled();
    expect(resetGameForNewRound).not.toHaveBeenCalled();

    await handlers['startGame'](START);
    expect(transitionGameState).toHaveBeenCalledTimes(1);
  });

  it('places golden letters on the board the players actually get', async () => {
    const FIRST = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['I', 'J', 'K', 'L'], ['M', 'N', 'O', 'P']];
    const FINAL = [['Q', 'R']];
    game.users = { Host: { socketId: 'socket-host', isHost: true }, P2: { socketId: 's2' } };
    mockGenerateRandomTable.mockReturnValueOnce(FIRST).mockReturnValue(FINAL);
    mockAutoAdd.mockResolvedValue({ botsAdded: 1 } as never);
    const handlers = makeSocket();

    await handlers['startGame'](START);

    expect(game.goldenLetters.length).toBeGreaterThan(0);
    for (const { row, col } of game.goldenLetters) {
      expect(FINAL[row]?.[col]).toBeDefined();
    }
  });
});
