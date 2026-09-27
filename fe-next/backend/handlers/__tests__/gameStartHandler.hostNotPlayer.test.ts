/**
 * "2 students" became "3 players / 3 Alive" in a classroom game: the round was
 * seeded from every user in the room, and a classroom teacher (a non-playing
 * projector host) is a user in the room. The quiz path already skips the host
 * (`startVocabQuizForClassroom`: "the teacher hosts, they do not compete"); the
 * board path did not. Normal multiplayer, where the host plays, must keep them.
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
  mockGetGameUsers,
  mockInitBlast,
  mockNotify,
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
  mockGetGameUsers: vi.fn(),
  mockInitBlast: vi.fn(() => ({ overlay: [], seed: 1, playerLives: {} })),
  mockNotify: vi.fn(() => Promise.resolve()),
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
  getGameUsers: mockGetGameUsers,
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
vi.mock('../../../backend/modules/notificationService', () => ({ notifyGameStarted: mockNotify }));
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: vi.fn() }));
vi.mock('../../../backend/modules/gameModeSelector', () => ({ selectNextGameMode: vi.fn(() => 'classic'), ALL_GAME_MODES: ['classic'] }));
vi.mock('../../../backend/handlers/playerDataInit', () => ({ initializePlayerData: vi.fn(), ensurePlayerState: vi.fn() }));
vi.mock('../../../backend/modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
  beginClassroomRound: mockBeginRound,
  setClassroomGamePlacedVocabulary: mockSetPlaced,
}));
vi.mock('../../../backend/modules/blastModeManager', () => ({ initBlastModeState: mockInitBlast, hashStringToSeed: vi.fn(() => 1) }));
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

const BLAST_START = {
  letterGrid: CLIENT_GRID, timerSeconds: 60, language: 'en',
  minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'blast',
};

const ROOM_USERS = [
  { username: 'Teacher', isHost: true },
  { username: 'Maya', isHost: false },
  { username: 'Noa', isHost: false },
];

/** Who the round was set up for — the mode state is seeded per player. */
const seededPlayers = () => mockInitBlast.mock.calls[0]?.[1] as string[] | undefined;

describe('game start — a projector/classroom host is not a player', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateRandomTable.mockReturnValue(GRID);
    mockIsWordOnBoard.mockReturnValue(true);
    mockAutoAdd.mockResolvedValue({ botsAdded: 0 } as never);
    mockGetGameUsers.mockReturnValue(ROOM_USERS);
    mockGetGame.mockReturnValue({
      gameCode: 'GAME1', hostSocketId: 'socket-host', hostUsername: 'Teacher',
      users: { Teacher: { socketId: 'socket-host', isHost: true }, Maya: {}, Noa: {} },
      gameState: 'waiting', language: 'en', modeHistory: [], roomName: 'R',
      isRanked: false, gameSessionId: 's1',
    });
    mockBeginRound.mockResolvedValue(null as never);
  });

  it('seeds a classroom round with the students only — 2 students, not 3 players', async () => {
    // GIVEN a classroom room: a teacher hosting on the projector and two students
    mockBeginRound.mockResolvedValue({ gameCode: 'GAME1', classroomId: 'c1', vocabularyWords: [] } as never);

    // WHEN the teacher starts the round
    await startHandlers()['startGame'](BLAST_START);

    // THEN the round's players (lives, "N Alive", player count) exclude the teacher
    expect(seededPlayers()).toEqual(['Maya', 'Noa']);
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ playerCount: 2 }));
  });

  it('excludes a non-playing TV-mode host in a public room too', async () => {
    await startHandlers()['startGame']({ ...BLAST_START, tvMode: true });

    expect(seededPlayers()).toEqual(['Maya', 'Noa']);
  });

  it('keeps the host as a player in normal multiplayer, where the host plays', async () => {
    // GIVEN an ordinary room (no classroom record, host playing)
    await startHandlers()['startGame']({ ...BLAST_START, tvMode: false });

    expect(seededPlayers()).toEqual(['Teacher', 'Maya', 'Noa']);
    expect(mockNotify).toHaveBeenCalledWith(expect.objectContaining({ playerCount: 3 }));
  });
});
