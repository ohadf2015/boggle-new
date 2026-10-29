/**
 * exp-mp-duo-bot-v1 at the startGame chokepoint: the host's `duoBot` request
 * reaches autoAddBotForDuo (which owns the classroom/ranked/private gate) on
 * every start path (lobby Start and the results "next round" both emit
 * startGame), and a seated bot is announced + gets player state.
 */
const {
  mockAutoAdd,
  mockDuo,
  mockInitPlayers,
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
  mockDuo: vi.fn(() => Promise.resolve({ botsAdded: 0 })),
  mockInitPlayers: vi.fn(),
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
vi.mock('../../../backend/utils/timerManager', () => ({ default: { clearGameTimer: vi.fn(), setTimeout: vi.fn(), clearTimer: vi.fn(), clearTimersWithPrefix: vi.fn() }, clearGameTimer: vi.fn() }));
vi.mock('../../../backend/utils/gameStartCoordinator', () => ({ __esModule: true, default: {
  cleanupSequence: vi.fn(), initializeSequence: vi.fn(() => 'msg-1'), scheduleRetries: vi.fn(),
  setAcknowledgmentTimeout: vi.fn(), setCountdownCompleteTimeout: vi.fn(), recordCountdownComplete: vi.fn(),
} }));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: vi.fn() }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyGameStarted: mockNotify }));
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: vi.fn() }));
vi.mock('../../../backend/modules/gameModeSelector', () => ({ selectNextGameMode: vi.fn(() => 'classic'), ALL_GAME_MODES: ['classic'] }));
vi.mock('../../../backend/handlers/playerDataInit', () => ({ initializePlayerData: mockInitPlayers, ensurePlayerState: vi.fn() }));
vi.mock('../../../backend/modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
  beginClassroomRound: mockBeginRound,
  setClassroomGamePlacedVocabulary: mockSetPlaced,
}));
vi.mock('../../../backend/modules/blastModeManager', () => ({ initBlastModeState: mockInitBlast, hashStringToSeed: vi.fn(() => 1) }));
vi.mock('../../../backend/modules/wordHuntManager', () => ({ initWordHuntState: vi.fn(), selectTargetWordWithFallback: vi.fn(() => null) }));
vi.mock('../../../backend/services/gameLifecycle/autoAddBots', () => ({ autoAddBotsForSoloPlayer: mockAutoAdd, autoAddBotForDuo: mockDuo }));
vi.mock('../../../backend/modules/wordValidatorPool', () => ({ findAllWordsAsync: vi.fn(() => Promise.resolve([])), isWordOnBoardAsync: vi.fn(), getWordPathAsync: vi.fn(), makePositionsMapAsync: vi.fn() }));
vi.mock('../../../backend/modules/boggleSolver', () => ({ findAllWords: vi.fn(() => []), getCachedTrie: vi.fn(() => ({})) }));
vi.mock('../../../backend/utils/logger', () => ({ __esModule: true, default: mockLogger }));

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

const START = {
  letterGrid: [['A', 'B'], ['C', 'D']], timerSeconds: 60, language: 'en',
  minWordLength: 3, difficulty: 'MEDIUM', boardTheme: null, gameMode: 'classic',
};

const game = () => ({
  gameCode: 'GAME1', hostSocketId: 'socket-host', hostUsername: 'Alice',
  users: { Alice: { socketId: 'socket-host', isHost: true }, Bob: { socketId: 's2' } },
  gameState: 'waiting', language: 'en', modeHistory: [], roomName: 'R',
  isRanked: false, isPrivate: false, isClassroom: false, gameSessionId: 's1',
});

const updateUsersBroadcasts = () => mockBroadcastToRoom.mock.calls.filter((c) => c[2] === 'updateUsers');

describe('startGame — duo bot request (exp-mp-duo-bot-v1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateRandomTable.mockReturnValue([['F', 'I'], ['R', 'S']]);
    mockGetGameUsers.mockReturnValue([{ username: 'Alice', isHost: true }, { username: 'Bob' }]);
    mockGetGame.mockReturnValue(game());
    mockBeginRound.mockResolvedValue(null as never);
    mockAutoAdd.mockResolvedValue({ botsAdded: 0 } as never);
    mockDuo.mockResolvedValue({ botsAdded: 0 } as never);
  });

  it('Given the host asks for a duo bot, When the game starts, Then the server gate runs for this room', async () => {
    await startHandlers()['startGame']({ ...START, duoBot: true });
    expect(mockDuo).toHaveBeenCalledTimes(1);
    expect(mockDuo).toHaveBeenCalledWith('GAME1', expect.objectContaining({ gameCode: 'GAME1' }));
  });

  it('announces the seated bot and builds its player state', async () => {
    mockDuo.mockResolvedValue({ botsAdded: 1 } as never);
    await startHandlers()['startGame']({ ...START, duoBot: true });
    expect(updateUsersBroadcasts()).toHaveLength(1);
    expect(mockInitPlayers.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('control arm (no duoBot on the payload) never adds one', async () => {
    await startHandlers()['startGame'](START);
    expect(mockDuo).not.toHaveBeenCalled();
  });

  it('skips human-only modes (bots have no move logic there)', async () => {
    await startHandlers()['startGame']({ ...START, gameMode: 'crossword', duoBot: true });
    expect(mockDuo).not.toHaveBeenCalled();
  });

  it('skips when the solo path already seated bots', async () => {
    mockAutoAdd.mockResolvedValue({ botsAdded: 2 } as never);
    await startHandlers()['startGame']({ ...START, duoBot: true });
    expect(mockDuo).not.toHaveBeenCalled();
  });
});
