/** A quiz round must clear the last boss, exactly like every board round start does. */
const {
  mockAutoAdd,
  mockGenerateRandomTable,
  mockIsWordOnBoard,
  mockSetPlaced,
  mockBeginRound,
  mockGetClassroomGame,
  mockGetGame,
  mockUpdateGame,
  mockGetGameBySocketId,
  mockBroadcastToRoom,
  mockLogger,
  mockStartQuiz,
  mockTransition,
  mockArmBoss,
} = vi.hoisted(() => ({
  mockArmBoss: vi.fn(),
  mockAutoAdd: vi.fn(() => Promise.resolve({ botsAdded: 0 })),
  mockGenerateRandomTable: vi.fn(),
  mockIsWordOnBoard: vi.fn(() => true),
  mockSetPlaced: vi.fn(() => Promise.resolve(undefined)),
  mockBeginRound: vi.fn(() => Promise.resolve(null)),
  mockGetClassroomGame: vi.fn(() => Promise.resolve(null)),
  mockGetGame: vi.fn(),
  mockUpdateGame: vi.fn(),
  mockGetGameBySocketId: vi.fn(() => 'GAME1'),
  mockBroadcastToRoom: vi.fn(),
  mockLogger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  mockStartQuiz: vi.fn(),
  mockTransition: vi.fn(() => ({ success: true })),
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
  transitionGameState: mockTransition,
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
vi.mock('../../../backend/handlers/vocabQuizHandler', () => ({ startVocabQuizForClassroom: mockStartQuiz }));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: vi.fn() }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyGameStarted: vi.fn(() => Promise.resolve()) }));
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: vi.fn() }));
vi.mock('../../../backend/modules/gameModeSelector', () => ({ selectNextGameMode: vi.fn(() => 'classic'), ALL_GAME_MODES: ['classic'] }));
vi.mock('../../../backend/handlers/playerDataInit', () => ({ initializePlayerData: vi.fn(), ensurePlayerState: vi.fn() }));
vi.mock('../../../backend/modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
  beginClassroomRound: mockBeginRound,
  setClassroomGamePlacedVocabulary: mockSetPlaced,
}));
vi.mock('../../../backend/modules/blastModeManager', () => ({ initBlastModeState: vi.fn(() => ({ overlay: [], seed: 1, playerLives: {} })), hashStringToSeed: vi.fn(() => 1) }));
vi.mock('../../../backend/modules/wordHuntManager', () => ({ initWordHuntState: vi.fn(), selectTargetWordWithFallback: vi.fn(() => null) }));
vi.mock('../../../backend/services/gameLifecycle/autoAddBots', () => ({ autoAddBotsForSoloPlayer: mockAutoAdd }));
vi.mock('../../../backend/modules/wordValidatorPool', () => ({ findAllWordsAsync: vi.fn(() => Promise.resolve([])), isWordOnBoardAsync: vi.fn(), getWordPathAsync: vi.fn(), makePositionsMapAsync: vi.fn() }));
vi.mock('../../../backend/modules/boggleSolver', () => ({ findAllWords: vi.fn(() => []), getCachedTrie: vi.fn(() => ({})) }));
vi.mock('../../../backend/utils/logger', () => ({ __esModule: true, default: mockLogger }));

vi.mock('../../../backend/services/classroomBoss/roomBoss', () => ({ armRoomBoss: mockArmBoss, hasRoomBoss: vi.fn(() => false) }));

import { vi } from 'vitest';
import { registerStartGameHandler } from '../gameStartHandler';

function startHandlers() {
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

const START_PAYLOAD = {
  letterGrid: [['A', 'B'], ['C', 'D']], timerSeconds: 60, language: 'en',
  minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'classic',
};

describe('a quiz round after a boss round', () => {
  let game: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTransition.mockImplementation(() => {
      game.gameState = 'countdown';
      return { success: true };
    });
    game = {
      gameCode: 'GAME1', hostSocketId: 'socket-host', hostUsername: 'Host', isClassroom: true,
      users: { Host: { socketId: 'socket-host', isHost: true } },
      gameState: 'waiting', language: 'en', modeHistory: [], roomName: 'R',
      isRanked: false, gameSessionId: 's1',
    };
    mockGetGame.mockReturnValue(game);
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'GAME1', classroomId: 'c1', vocabularyWords: [] } as never);
  });

  it('given the quiz starts, when the round opens, then the previous boss is cleared for every screen', async () => {
    mockStartQuiz.mockResolvedValue(true);
    await startHandlers()['startGame'](START_PAYLOAD);
    expect(mockArmBoss).toHaveBeenCalledTimes(1);
    expect(mockArmBoss.mock.calls[0][3]).toMatchObject({ bossId: undefined });
  });

  it('given the quiz is refused, when the room stays in the lobby, then the boss is left alone', async () => {
    mockStartQuiz.mockResolvedValue('refused');
    await startHandlers()['startGame'](START_PAYLOAD);
    expect(mockArmBoss).not.toHaveBeenCalled();
  });
});
