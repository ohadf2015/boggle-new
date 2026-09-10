/**
 * Starting a round is what makes a classroom code joinable — say so in Redis.
 *
 * The projector code is refused once its game is marked `finished`
 * (`lib/education/classroomGameLookup.ts`, plus the SREM in
 * `getActiveClassroomGames`). That status is written at the end of every round,
 * so without a write-back the code dies after round one while the class plays
 * round two in the same room off the same QR poster.
 *
 * Game start is the one place every classroom round passes through, board mode
 * or not, first round or fifth. It must NOT be hung off the placed-vocabulary
 * write a few hundred lines below: that is guarded by `vocabToEmbed.length > 0`,
 * so a classroom game with no lesson words attached would never reopen — the
 * silent hole (pitfall class 4) inside a fix for a dead end.
 *
 * It rides on the classroom read start already does (`beginClassroomRound`)
 * rather than a second call: one Redis read, and the reopen is awaited, so it
 * cannot land after — and clobber — the placed-vocabulary write below. What the
 * reopen itself writes is `classroomGameManager.reopen.test.ts`.
 */
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

import { vi } from 'vitest';
import { registerStartGameHandler } from '../gameStartHandler';

const CLIENT_GRID = [['A', 'B'], ['C', 'D']];
const GRID = [['F', 'I'], ['R', 'S']];

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
  letterGrid: CLIENT_GRID, timerSeconds: 60, language: 'en',
  minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'classic',
};

describe('game start reopens the classroom code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateRandomTable.mockReturnValue(GRID);
    mockIsWordOnBoard.mockReturnValue(true);
    mockAutoAdd.mockResolvedValue({ botsAdded: 0 } as never);
    mockGetGame.mockReturnValue({
      gameCode: 'GAME1', hostSocketId: 'socket-host', hostUsername: 'Host',
      users: { Host: { socketId: 'socket-host', isHost: true } },
      gameState: 'waiting', language: 'en', modeHistory: [], roomName: 'R',
      isRanked: false, gameSessionId: 's1',
    });
    mockGetClassroomGame.mockResolvedValue({
      gameCode: 'GAME1', classroomId: 'c1', vocabularyWords: ['stomata'],
    } as never);
    mockBeginRound.mockResolvedValue({
      gameCode: 'GAME1', classroomId: 'c1', vocabularyWords: ['stomata'],
    } as never);
  });

  it('marks the code live again when a second round starts', async () => {
    // GIVEN a classroom room whose first round already finished
    // WHEN the teacher starts another round in it
    await startHandlers()['startGame'](START_PAYLOAD);

    // THEN the projector code resolves again for a student re-scanning the QR
    expect(mockBeginRound).toHaveBeenCalledWith('GAME1');
  });

  it('reopens a classroom game that carries no lesson words', async () => {
    // The placed-vocabulary write is guarded by `vocabToEmbed.length > 0`.
    // Hanging the reopen off that guard would leave this game's code dead.
    mockBeginRound.mockResolvedValue({
      gameCode: 'GAME1', classroomId: 'c1', vocabularyWords: [],
    } as never);

    await startHandlers()['startGame'](START_PAYLOAD);

    expect(mockSetPlaced).not.toHaveBeenCalled();
    expect(mockBeginRound).toHaveBeenCalledWith('GAME1');
  });

  it('starts an ordinary multiplayer room normally when there is no record', async () => {
    // The common case — the same call runs on every game start in the app, and
    // a null answer must neither reopen anything nor break the round.
    mockBeginRound.mockResolvedValue(null as never);

    await startHandlers()['startGame'](START_PAYLOAD);

    expect(mockSetPlaced).not.toHaveBeenCalled();
    expect(mockBroadcastToRoom).toHaveBeenCalled();
  });
});
