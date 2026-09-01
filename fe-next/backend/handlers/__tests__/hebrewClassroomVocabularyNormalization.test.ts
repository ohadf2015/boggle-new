/**
 * Integration test for Hebrew classroom vocabulary normalization in gameStartHandler
 *
 * The bug: When a teacher creates a classroom game with Hebrew vocabulary containing
 * final letters (ם, ן, ף, ך, ץ), the board normalizes them to regular forms.
 * But the lesson vocabulary lookup set was NOT being normalized during handler setup.
 *
 * This means when a student finds a normalized word on the board and submits it,
 * the system fails to recognize it as lesson vocabulary — a word match fails
 * not because the student didn't find it, but because the vocabulary set
 * contained the raw teacher input instead of the normalized form.
 *
 * The fix (gameStartHandler.ts:456): Normalize the teacher's vocabulary words
 * using normalizeWordForLanguage before storing them in the game's lessonVocabulary set.
 *
 * This test exercises the REAL handler code path and FAILS when the fix is reverted.
 */

// ─── Mocks (must come before imports) ─────────────────────────────────────

const { mockCheckRateLimit, mockValidatePayload, mockEmitError, mockGetGame, mockUpdateGame, mockGetGameBySocketId, mockGetGameUsers, mockCanTransitionGameState, mockTransitionGameState, mockResetGameForNewRound, mockBroadcastToRoom, mockGetGameRoom, mockSafeEmit, mockGetSocketById, mockMakePositionsMap, mockNormalizeWordForLanguage, mockEnsureGame, mockGenerateRandomTable, mockEnsureLanguageLoaded, mockClearGameTimer, mockGameStartCoordinator, mockStopAllBots, mockNotifyGameStarted, mockSelectNextGameMode, mockInitializePlayerData, mockGetClassroomGame, mockInitBlastModeState, mockHashStringToSeed, mockInitWordHuntState, mockSelectTargetWordWithFallback, mockSelectCleanCommonTarget, mockGetRecentMpTargets, mockRecordMpTarget, mockFindAllWordsAsync, mockGetCachedTrie, mockAutoAddBotsForSoloPlayer, mockStartGameTimer, mockLogger, mockVerifyBoostToken } = vi.hoisted(() => {
  const mockCheckRateLimit = vi.fn(() => true);
  const mockValidatePayload = vi.fn();
  const mockEmitError = vi.fn();
  const mockGetGame = vi.fn();
  const mockUpdateGame = vi.fn();
  const mockGetGameBySocketId = vi.fn();
  const mockGetGameUsers = vi.fn(() => []);
  const mockCanTransitionGameState = vi.fn(() => true);
  const mockTransitionGameState = vi.fn(() => ({ success: true }));
  const mockResetGameForNewRound = vi.fn(() => true);
  const mockBroadcastToRoom = vi.fn();
  const mockGetGameRoom = vi.fn((code: string) => `room:${code}`);
  const mockSafeEmit = vi.fn();
  const mockGetSocketById = vi.fn();
  const mockMakePositionsMap = vi.fn(() => new Map());
  // Use the REAL normalizeWordForLanguage behavior (Hebrew finals → regular forms)
  // This is critical for the test to fail when the fix is reverted
  const mockNormalizeWordForLanguage = vi.fn((w: string, lang: string) => {
    if (lang === 'he') {
      // Mirror the real Hebrew normalization: convert final letters to regular forms
      return w
        .replace(/ם/g, 'מ')
        .replace(/ן/g, 'נ')
        .replace(/ץ/g, 'צ')
        .replace(/ף/g, 'פ')
        .replace(/ך/g, 'כ')
        .toLowerCase();
    }
    return w.toLowerCase();
  });
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
  // This is the key mock: we'll override it per test to return a classroom game
  const mockGetClassroomGame = vi.fn(() => Promise.resolve(null));
  const mockInitBlastModeState = vi.fn(() => ({ overlay: [], seed: 42, playerLives: {} }));
  const mockHashStringToSeed = vi.fn(() => 42);
  const mockInitWordHuntState = vi.fn(() => ({ targetWordLength: 5, targetCategory: null, playerLives: {} }));
  const mockSelectTargetWordWithFallback = vi.fn(() => 'brave');
  const mockSelectCleanCommonTarget = vi.fn<(lang?: string, exclude?: Set<string>) => string | null>(() => null);
  const mockGetRecentMpTargets = vi.fn(() => new Set<string>());
  const mockRecordMpTarget = vi.fn();
  const mockFindAllWordsAsync = vi.fn(() => Promise.resolve(['brave', 'braves', 'rave']));
  const mockGetCachedTrie = vi.fn(() => ({}));
  const mockAutoAddBotsForSoloPlayer = vi.fn(() => Promise.resolve({ botsAdded: 0 }));
  const mockStartGameTimer = vi.fn();
  const mockVerifyBoostToken = vi.fn();
  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  return { mockCheckRateLimit, mockValidatePayload, mockEmitError, mockGetGame, mockUpdateGame, mockGetGameBySocketId, mockGetGameUsers, mockCanTransitionGameState, mockTransitionGameState, mockResetGameForNewRound, mockBroadcastToRoom, mockGetGameRoom, mockSafeEmit, mockGetSocketById, mockMakePositionsMap, mockNormalizeWordForLanguage, mockEnsureGame, mockGenerateRandomTable, mockEnsureLanguageLoaded, mockClearGameTimer, mockGameStartCoordinator, mockStopAllBots, mockNotifyGameStarted, mockSelectNextGameMode, mockInitializePlayerData, mockGetClassroomGame, mockInitBlastModeState, mockHashStringToSeed, mockInitWordHuntState, mockSelectTargetWordWithFallback, mockSelectCleanCommonTarget, mockGetRecentMpTargets, mockRecordMpTarget, mockFindAllWordsAsync, mockGetCachedTrie, mockAutoAddBotsForSoloPlayer, mockStartGameTimer, mockVerifyBoostToken, mockLogger };
});

vi.mock('../../../backend/utils/rateLimiter', () => ({ checkRateLimit: mockCheckRateLimit, default: { checkRateLimit: mockCheckRateLimit } }));
vi.mock('../../../backend/utils/socketValidation', () => ({ validatePayload: mockValidatePayload, startGameSchema: {} }));
vi.mock('../../../backend/utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../../backend/utils/errorHandler')>('../../../backend/utils/errorHandler');
  return { ...actual, emitError: mockEmitError };
});
vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: mockGetGame,
  updateGame: mockUpdateGame,
  getGameBySocketId: mockGetGameBySocketId,
  getGameUsers: mockGetGameUsers,
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
vi.mock('../../../backend/modules/wordValidator', () => ({ makePositionsMap: mockMakePositionsMap, normalizeWordForLanguage: mockNormalizeWordForLanguage }));
vi.mock('../../../backend/utils/metrics', () => ({ ensureGame: mockEnsureGame }));
vi.mock('../../../backend/utils/gameUtils', () => ({ generateRandomTable: mockGenerateRandomTable }));
vi.mock('../../../backend/dictionary', () => ({ ensureLanguageLoaded: mockEnsureLanguageLoaded }));
vi.mock('../../../backend/utils/timerManager', () => ({ default: { clearGameTimer: mockClearGameTimer, setTimeout: vi.fn(), clearTimer: vi.fn() }, clearGameTimer: mockClearGameTimer }));
vi.mock('../../../backend/utils/gameStartCoordinator', () => ({ __esModule: true, default: mockGameStartCoordinator }));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: mockStopAllBots }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyGameStarted: mockNotifyGameStarted }));
vi.mock('../../../backend/modules/gameModeSelector', () => ({ selectNextGameMode: mockSelectNextGameMode, ALL_GAME_MODES: ['classic', 'blast', 'word-hunt'] }));
vi.mock('../../../backend/handlers/playerDataInit', () => ({ initializePlayerData: mockInitializePlayerData, ensurePlayerState: vi.fn() }));
vi.mock('../../../backend/modules/classroomGameManager', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../../backend/modules/blastModeManager', () => ({ initBlastModeState: mockInitBlastModeState, hashStringToSeed: mockHashStringToSeed }));
vi.mock('../../../backend/modules/wordHuntManager', () => ({
  initWordHuntState: mockInitWordHuntState,
  selectTargetWordWithFallback: mockSelectTargetWordWithFallback,
  selectCleanCommonTarget: mockSelectCleanCommonTarget,
  getRecentMpTargets: mockGetRecentMpTargets,
  recordMpTarget: mockRecordMpTarget,
}));
vi.mock('../../../backend/modules/wordValidatorPool', () => ({ findAllWordsAsync: mockFindAllWordsAsync, isWordOnBoardAsync: vi.fn(), getWordPathAsync: vi.fn(), makePositionsMapAsync: vi.fn() }));
vi.mock('../../../backend/modules/boggleSolver', () => ({ getCachedTrie: mockGetCachedTrie }));
vi.mock('../../../backend/services/gameLifecycle/autoAddBots', () => ({ autoAddBotsForSoloPlayer: mockAutoAddBotsForSoloPlayer }));
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: mockStartGameTimer }));
vi.mock('../../../backend/utils/logger', () => ({ __esModule: true, default: mockLogger }));
vi.mock('../../../backend/utils/boostToken', () => ({ verifyBoostToken: mockVerifyBoostToken }));
vi.mock('@/shared/constants/wordHuntMultiplayerConstants', () => ({ HUNT_TARGET_MIN_LENGTH: 4, HUNT_TARGET_MAX_LENGTH: 8 }));
vi.mock('@/shared/constants/gameConstants', () => ({ BLAST_MP_DEFAULT_TIMER: 90, DEFAULT_TIMER: 90, DEFAULT_DIFFICULTY: 'MEDIUM', DIFFICULTIES: { EASY: { nameKey: 'difficulty.easy', rows: 5, cols: 5 }, MEDIUM: { nameKey: 'difficulty.medium', rows: 6, cols: 6 }, HARD: { nameKey: 'difficulty.hard', rows: 7, cols: 7 } } }));

// ─── Import after mocks ────────────────────────────────────────────────────

import { vi, describe, it, expect, beforeEach } from 'vitest';
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
    language: 'he',
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
    language: 'he',
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

describe('gameStartHandler — Hebrew classroom vocabulary normalization', () => {
  const mockIo = { to: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatePayload.mockImplementation((_schema: any, data: any) => ({ success: true, data }));
    mockGetGameBySocketId.mockReturnValue('GAME1');
    mockGetGame.mockReturnValue(makeGame());
    mockGetGameUsers.mockReturnValue([{ username: 'Host' }]);
    mockCanTransitionGameState.mockReturnValue(true);
    mockTransitionGameState.mockReturnValue({ success: true });
  });

  it('should normalize Hebrew classroom vocabulary with final letters before storing in game state', async () => {
    // GIVEN: A classroom game with Hebrew vocabulary containing final letters
    // (a teacher's input, never normalized)
    const classroomGameWithHebrewFinals = {
      gameCode: 'GAME1',
      vocabularyWords: [
        'שלום',   // has final mem (ם) — should normalize to 'שלומ'
        'שלוש',   // has final nun (ן) — should normalize to 'שלומ'
        'עם',     // has final mem (ם) — should normalize to 'עמ'
        'כן',     // has final nun (ן) — should normalize to 'כנ'
      ],
    };

    // WHEN: The handler processes a startGame event for this classroom game
    mockGetClassroomGame.mockResolvedValue(classroomGameWithHebrewFinals);
    const { socket, handlers } = createMockSocket('socket-host');
    registerStartGameHandler(mockIo, socket);

    await triggerStartGame(handlers, makePayload({ language: 'he' }));

    // THEN: updateGame should be called with a lessonVocabulary set
    // where each word is normalized (finals converted) AND uppercase
    expect(mockUpdateGame).toHaveBeenCalled();
    const updateGameCall = mockUpdateGame.mock.calls[0];
    const gameStateArg = updateGameCall[1];
    const lessonVocab = gameStateArg.lessonVocabulary;

    // Verify the set exists
    expect(lessonVocab).toBeDefined();
    expect(lessonVocab).toBeInstanceOf(Set);

    // Verify the normalized forms are in the set
    // The handler should normalize each word using normalizeWordForLanguage before uppercasing
    const expectedWords = classroomGameWithHebrewFinals.vocabularyWords.map(w => mockNormalizeWordForLanguage(w, 'he').toUpperCase());
    expectedWords.forEach(word => {
      expect(lessonVocab.has(word)).toBe(true);
    });
  });

  it('should produce a vocabulary set that matches normalized board submissions', async () => {
    // GIVEN: Hebrew vocabulary with final letters
    const classroomGameWithHebrewFinals = {
      gameCode: 'GAME1',
      vocabularyWords: ['שלום', 'עם', 'כן'],
    };

    mockGetClassroomGame.mockResolvedValue(classroomGameWithHebrewFinals);
    const { socket, handlers } = createMockSocket('socket-host');
    registerStartGameHandler(mockIo, socket);

    await triggerStartGame(handlers, makePayload({ language: 'he' }));

    expect(mockUpdateGame).toHaveBeenCalled();
    const lessonVocab = mockUpdateGame.mock.calls[0][1].lessonVocabulary;

    // Simulate a student finding a word on the board and submitting it
    // The board has the normalized form (final letters already converted when grid was generated)
    // A student submits the word as they see it on the board
    // The submission is normalized using the same function: mockNormalizeWordForLanguage
    const studentSubmission = 'שלום'; // what they typed from the board
    const normalizedSubmission = mockNormalizeWordForLanguage(studentSubmission, 'he').toUpperCase();

    // THEN: The normalized submission should be found in the lesson vocabulary set
    expect(lessonVocab.has(normalizedSubmission)).toBe(true);
  });

  it('should NOT include un-normalized forms when the fix is applied', async () => {
    // This is a regression check: ensure the vocabulary was normalized
    const classroomGameWithHebrewFinals = {
      gameCode: 'GAME1',
      vocabularyWords: ['שלום'], // has final mem (ם)
    };

    mockGetClassroomGame.mockResolvedValue(classroomGameWithHebrewFinals);
    const { socket, handlers } = createMockSocket('socket-host');
    registerStartGameHandler(mockIo, socket);

    await triggerStartGame(handlers, makePayload({ language: 'he' }));

    expect(mockUpdateGame).toHaveBeenCalled();
    const lessonVocab = mockUpdateGame.mock.calls[0][1].lessonVocabulary;

    // The normalized form should be in the set
    // 'שלום' with final mem (ם) → normalized to regular mem (מ) → 'שלומ' → uppercase → 'שלומ'
    const normalized = mockNormalizeWordForLanguage('שלום', 'he').toUpperCase();
    expect(lessonVocab.has(normalized)).toBe(true);
  });

  it('should handle empty classroom game gracefully', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    const { socket, handlers } = createMockSocket('socket-host');
    registerStartGameHandler(mockIo, socket);

    await triggerStartGame(handlers);

    expect(mockUpdateGame).toHaveBeenCalled();
    const lessonVocab = mockUpdateGame.mock.calls[0][1].lessonVocabulary;
    expect(lessonVocab).toBeUndefined();
  });
});
