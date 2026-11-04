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
  mockStage,
} = vi.hoisted(() => ({
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
  mockStage: vi.fn(),
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
  getGameUsers: vi.fn(() => [{ username: 'Host', isHost: true }, { username: 'ana' }]),
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

vi.mock('../../../backend/modules/crosswordClassroomStart', () => ({ stageClassroomCrossword: mockStage }));

import { vi } from 'vitest';
import { registerStartGameHandler } from '../gameStartHandler';

const GRID = [['F', 'I'], ['R', 'S']];
const LESSON_PUZZLE = { id: 'lesson-GAME1', locale: 'en', size: 3, rtl: false, cells: [], slots: [{ id: 'A1', answer: 'cat' }] };

function startHandlers() {
  const handlers: Record<string, (d: unknown) => Promise<void>> = {};
  const socket = {
    id: 'socket-host',
    on: vi.fn((e: string, fn: (d: unknown) => Promise<void>) => { handlers[e] = fn; }),
    emit: vi.fn(),
    data: {},
    handshake: { auth: {} },
  };
  registerStartGameHandler({ to: vi.fn(() => ({ emit: vi.fn() })) } as never, socket as never);
  return handlers;
}

const START_PAYLOAD = {
  letterGrid: [['A', 'B'], ['C', 'D']], timerSeconds: 60, language: 'en',
  minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'crossword',
};

describe('starting a crossword round in a classroom room', () => {
  let game: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStartQuiz.mockResolvedValue(false);
    mockTransition.mockImplementation(() => {
      game.gameState = 'countdown';
      return { success: true };
    });
    mockGenerateRandomTable.mockReturnValue(GRID);
    game = {
      gameCode: 'GAME1', hostSocketId: 'socket-host', hostUsername: 'Host',
      users: { Host: { socketId: 'socket-host', isHost: true }, ana: { socketId: 's-ana' } },
      gameState: 'waiting', language: 'en', modeHistory: [], roomName: 'R',
      isRanked: false, gameSessionId: 's1', isClassroom: true,
    };
    mockGetGame.mockReturnValue(game);
    const record = { gameCode: 'GAME1', classroomId: 'c1', teacherId: 't1', lessonIds: ['l1'], vocabularyWords: ['cat', 'dog', 'emu'], settings: { gameMode: 'crossword' } };
    mockGetClassroomGame.mockResolvedValue(record as never);
    mockBeginRound.mockResolvedValue(record as never);
  });

  it('a lesson too small for a grid leaves the room in the lobby and never announces a round', async () => {
    mockStage.mockResolvedValue('refused');
    const handlers = startHandlers();

    await handlers['startGame'](START_PAYLOAD);

    expect(game.gameState).toBe('waiting');
    expect(mockBroadcastToRoom.mock.calls.some((c) => c[2] === 'gameStarting')).toBe(false);
    expect(mockBeginRound).not.toHaveBeenCalled();
  });

  it('a grid staged by a start that failed never leaks into the next board round', async () => {
    game.lessonCrossword = { puzzle: LESSON_PUZZLE, lessonWordBySlot: { A1: 'cat' } };
    mockStage.mockResolvedValue(false);

    await startHandlers()['startGame']({ ...START_PAYLOAD, gameMode: 'classic' });

    expect(mockStage).not.toHaveBeenCalled();
    expect(game.lessonCrossword).toBeNull();
    expect(mockGenerateRandomTable).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'en', expect.arrayContaining(['CAT']));
  });

  it('plays the staged lesson grid and does not embed lesson words into a placeholder board', async () => {
    mockStage.mockImplementation(async (_io: unknown, _code: string, g: Record<string, unknown>) => {
      g.lessonCrossword = { puzzle: LESSON_PUZZLE, lessonWordBySlot: { A1: 'cat' } };
      return 'staged';
    });

    await startHandlers()['startGame'](START_PAYLOAD);

    const init = mockBroadcastToRoom.mock.calls.find((c) => c[2] === 'crosswordMpInit');
    expect(init?.[3]).toEqual(expect.objectContaining({ puzzle: LESSON_PUZZLE, players: ['ana'] }));
    expect((game.crosswordMpState as { lessonWordBySlot: unknown }).lessonWordBySlot).toEqual({ A1: 'cat' });
    expect(game.lessonCrossword).toBeNull();
    expect(mockSetPlaced).not.toHaveBeenCalled();
  });
});
