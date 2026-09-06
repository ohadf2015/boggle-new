/**
 * The recorded word bank must describe the board the class actually gets.
 *
 * A regression I introduced and then found while checking a neighbouring
 * builder's claim about this same function. Game start records which lesson
 * words the generated grid carries, and a support student's word bank reads that
 * record. I recorded it immediately after the FIRST grid generation — but the
 * grid is regenerated later on two paths:
 *
 *   - auto-adding bots to a solo game drops the client grid for a fresh 6x6
 *     (the SRV-CRIT-4 anti-cheat regen), and
 *   - Word Hunt rebuilds the board to embed the pinned target.
 *
 * Both run AFTER the point I was recording at, so the stored list described a
 * board that had already been thrown away — a support student hunting for words
 * that are not there, which is the exact bug the record was added to fix.
 *
 * The bot path is directly reachable from my own solo-classroom change: a
 * teacher trying her lesson alone is precisely who gets bots added.
 *
 * The record now happens once, against the grid that goes into the `startGame`
 * payload — the only grid the class ever sees.
 */
const { mockAutoAdd, mockGenerateRandomTable, mockIsWordOnBoard, mockSetPlaced, mockGetClassroomGame, mockGetGame, mockUpdateGame, mockGetGameBySocketId, mockBroadcastToRoom, mockLogger } = vi.hoisted(() => ({
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
vi.mock('../../../backend/modules/gameModeSelector', () => ({ selectNextGameMode: vi.fn(() => 'classic'), ALL_GAME_MODES: ['classic'] }));
vi.mock('../../../backend/handlers/playerDataInit', () => ({ initializePlayerData: vi.fn(), ensurePlayerState: vi.fn() }));
vi.mock('../../../backend/modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
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
const FIRST_GRID = [['F', 'I'], ['R', 'S']];
const REGEN_GRID = [['R', 'E'], ['G', 'N']];

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

describe('game start records the word bank against the FINAL board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsWordOnBoard.mockReturnValue(true);
    mockSetPlaced.mockResolvedValue(undefined);
    mockGetGame.mockReturnValue({
      gameCode: 'GAME1', hostSocketId: 'socket-host', hostUsername: 'Host',
      users: { Host: { socketId: 'socket-host', isHost: true } },
      gameState: 'waiting', language: 'en', modeHistory: [], roomName: 'R',
      isRanked: false, gameSessionId: 's1',
    });
    mockGetClassroomGame.mockResolvedValue({
      gameCode: 'GAME1', classroomId: 'c1', vocabularyWords: ['stomata', 'xylem'],
    } as never);
  });

  it('checks the regenerated grid, not the one that was thrown away', async () => {
    // GIVEN a solo classroom game that gets bots added, which drops the first
    // board for a fresh one (the anti-cheat regen)
    mockGenerateRandomTable
      .mockReturnValueOnce(FIRST_GRID)
      .mockReturnValue(REGEN_GRID);
    mockAutoAdd.mockResolvedValue({ botsAdded: 1 } as never);

    // WHEN the game starts
    const handlers = makeSocket();
    await handlers['startGame']({
      letterGrid: CLIENT_GRID, timerSeconds: 60, language: 'en',
      minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'classic',
    });

    // THEN the placement check ran against the board the class actually gets
    expect(mockIsWordOnBoard).toHaveBeenCalled();
    const boardsChecked = mockIsWordOnBoard.mock.calls.map((c) => c[1]);
    for (const board of boardsChecked) {
      expect(board).not.toEqual(FIRST_GRID);
    }
    expect(mockSetPlaced).toHaveBeenCalledWith('GAME1', ['STOMATA', 'XYLEM']);
  });

  it('still records once for an ordinary classroom game with no regeneration', async () => {
    // GIVEN a classroom game where the first board is the final board
    mockGenerateRandomTable.mockReturnValue(FIRST_GRID);
    mockAutoAdd.mockResolvedValue({ botsAdded: 0 } as never);

    // WHEN the game starts
    const handlers = makeSocket();
    await handlers['startGame']({
      letterGrid: CLIENT_GRID, timerSeconds: 60, language: 'en',
      minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'classic',
    });

    // THEN exactly one record is written, for that board
    expect(mockSetPlaced).toHaveBeenCalledTimes(1);
    expect(mockSetPlaced).toHaveBeenCalledWith('GAME1', ['STOMATA', 'XYLEM']);
  });

  it('writes nothing for a room that is not a classroom game', async () => {
    // GIVEN an ordinary multiplayer room
    mockGetClassroomGame.mockResolvedValue(null as never);
    mockGenerateRandomTable.mockReturnValue(FIRST_GRID);

    // WHEN it starts
    const handlers = makeSocket();
    await handlers['startGame']({
      letterGrid: CLIENT_GRID, timerSeconds: 60, language: 'en',
      minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'classic',
    });

    // THEN no word bank is recorded at all
    expect(mockSetPlaced).not.toHaveBeenCalled();
  });
});
