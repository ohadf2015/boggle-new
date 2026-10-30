import { describe, it, expect, beforeEach, vi } from 'vitest';

const {
  mockCreateGame,
  mockGameExists,
  mockGetClassroomGame,
  mockEmitError,
  mockReclaim,
  mockValidatePayload,
  mockEndGame,
  mockGetGame,
  mockGetGameBySocketId,
} = vi.hoisted(() => ({
  mockEndGame: vi.fn(),
  mockGetGame: vi.fn(),
  mockGetGameBySocketId: vi.fn(),
  mockCreateGame: vi.fn().mockReturnValue({}),
  mockGameExists: vi.fn().mockReturnValue(false),
  mockGetClassroomGame: vi.fn(),
  mockEmitError: vi.fn(),
  mockReclaim: vi.fn().mockReturnValue(false),
  mockValidatePayload: vi.fn((_schema: unknown, data: unknown) => ({ success: true, data })),
}));

vi.mock('../../../backend/utils/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  default: { checkRateLimit: vi.fn().mockReturnValue(true) },
}));
vi.mock('../../../backend/middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));
vi.mock('../../../backend/modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getGameBySocketId: mockGetGameBySocketId,
  createGame: mockCreateGame,
  updateGame: vi.fn(),
  deleteGame: vi.fn(),
  gameExists: mockGameExists,
  addUserToGame: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  getSocketIdByUsername: vi.fn(),
  getGameUsers: vi.fn().mockReturnValue([]),
  getActiveRooms: vi.fn().mockReturnValue([]),
  resetGameForNewRound: vi.fn(),
  getAuthUserConnection: vi.fn(),
  isRoomEmpty: vi.fn(),
  markPlayerReadyForNextGame: vi.fn(),
  getPlayersReadyCount: vi.fn(),
  removeUserFromGame: vi.fn(),
  updateUsernameMapping: vi.fn(),
  unmarkPlayerReady: vi.fn(),
  getLeaderboard: vi.fn().mockReturnValue([]),
}));
vi.mock('../../../backend/modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
}));
vi.mock('../../../backend/modules/classroomRoomLanguage', () => ({
  classroomRoomLanguage: vi.fn().mockResolvedValue('en'),
}));
vi.mock('../../../backend/handlers/classroomMissingRoom', () => ({ announceClassroomRoomOpened: vi.fn() }));
vi.mock('../../../backend/handlers/classroomGameHostReclaim', () => ({ tryReclaimClassroomHostSeat: mockReclaim }));
vi.mock('../../../backend/utils/socketHelpers', () => ({
  safeEmit: vi.fn(),
  getGameRoom: vi.fn().mockReturnValue('room:TEST'),
  broadcastToRoom: vi.fn(),
  broadcastActiveRooms: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  LOBBY_ROOM: 'lobby',
}));
vi.mock('../../../backend/handlers/shared', () => ({ startGameTimer: vi.fn(), endGame: mockEndGame }));
vi.mock('../../../backend/handlers/vocabQuizHandler', () => ({
  handleQuizRequestResults: vi.fn(),
  registerVocabQuizHandlers: vi.fn(),
  startVocabQuizForClassroom: vi.fn(),
}));
vi.mock('../../../backend/redisClient', () => ({ saveGameState: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../backend/utils/metrics', () => ({ inc: vi.fn(), incPerGame: vi.fn(), ensureGame: vi.fn() }));
vi.mock('../../../backend/utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), log: vi.fn() },
}));
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock('../../../backend/handlers/gameStartHandler', () => ({ registerStartGameHandler: vi.fn() }));
vi.mock('../../../backend/modules/botManager', () => ({ stopAllBots: vi.fn() }));
vi.mock('../../../backend/modules/notificationService', () => ({ notifyRoomCreated: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../backend/utils/gameUtils', () => ({ generateRandomAvatar: vi.fn() }));
vi.mock('../../../backend/dictionary', () => ({
  getRandomLongWordsWithTheme: vi.fn(), ensureLanguageLoaded: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../backend/utils/socketValidation', () => ({
  validatePayload: mockValidatePayload, createGameSchema: {}, getWordsForBoardSchema: {},
}));
vi.mock('../../../backend/utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../../backend/utils/errorHandler')>(
    '../../../backend/utils/errorHandler'
  );
  return { ...actual, emitError: mockEmitError };
});

import { registerGameLifecycleHandlers } from '../gameLifecycleHandler';
import { ErrorCodes } from '../../utils/errorHandler';

function createSocket(verifiedUserId?: string) {
  const handlers: Record<string, (...args: unknown[]) => unknown> = {};
  return {
    id: 'sock-1',
    handlers,
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => { handlers[event] = cb; }),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn().mockReturnThis(),
    data: verifiedUserId ? { verifiedUserId } : {},
  };
}

const fakeIo = { to: vi.fn().mockReturnThis(), emit: vi.fn(), in: vi.fn().mockReturnThis() } as never;

async function create(socket: ReturnType<typeof createSocket>, payload: Record<string, unknown>) {
  registerGameLifecycleHandlers(fakeIo, socket as never);
  await socket.handlers['createGame']({ gameCode: 'CLS123', hostUsername: 'Host', ...payload });
}

const createdOptions = () => mockCreateGame.mock.calls[0]?.[1];

beforeEach(() => {
  vi.clearAllMocks();
  mockGameExists.mockReturnValue(false);
  mockReclaim.mockReturnValue(false);
  mockCreateGame.mockReturnValue({});
});

describe('createGame on a classroom code', () => {
  it('refuses a student who holds the code but is not the classroom teacher', async () => {
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'CLS123', teacherId: 'teacher-1' });
    const socket = createSocket('student-9');

    await create(socket, { isClassroom: true, isPrivate: true, authUserId: 'student-9' });

    expect(mockCreateGame).not.toHaveBeenCalled();
    expect(mockEmitError).toHaveBeenCalledWith(socket, ErrorCodes.AUTH_FORBIDDEN, expect.anything());
  });

  it('refuses an unauthenticated socket even when it claims the teacher id', async () => {
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'CLS123', teacherId: 'teacher-1' });
    const socket = createSocket();

    await create(socket, { isClassroom: true, authUserId: 'teacher-1' });

    expect(mockCreateGame).not.toHaveBeenCalled();
  });

  it('refuses a classroom code even when the client omits isClassroom', async () => {
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'CLS123', teacherId: 'teacher-1' });
    const socket = createSocket('student-9');

    await create(socket, { isClassroom: false, isPrivate: false, authUserId: 'student-9' });

    expect(mockCreateGame).not.toHaveBeenCalled();
  });

  it('lets the verified teacher create the room, forced classroom + private', async () => {
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'CLS123', teacherId: 'teacher-1' });
    const socket = createSocket('teacher-1');

    await create(socket, { isClassroom: false, isPrivate: false, authUserId: 'teacher-1' });

    expect(mockCreateGame).toHaveBeenCalledTimes(1);
    expect(createdOptions()).toMatchObject({ isClassroom: true, isPrivate: true });
  });
});

describe('createGame on a non-classroom code', () => {
  it('cannot claim classroom status without a classroom record', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    const socket = createSocket('user-1');

    await create(socket, { isClassroom: true, isPrivate: true, authUserId: 'user-1' });

    expect(mockCreateGame).toHaveBeenCalledTimes(1);
    expect(createdOptions()).toMatchObject({ isClassroom: false, isPrivate: true });
  });

  it('creates an ordinary public room unchanged', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    const socket = createSocket();

    await create(socket, { isPrivate: false });

    expect(createdOptions()).toMatchObject({ isClassroom: false, isPrivate: false });
    expect(mockEmitError).not.toHaveBeenCalled();
  });
});

describe('host reclaim on an existing classroom room', () => {
  it('still hands the seat back before any classroom record lookup', async () => {
    mockGameExists.mockReturnValue(true);
    mockReclaim.mockReturnValue(true);
    const socket = createSocket('teacher-1');

    await create(socket, { isClassroom: true, authUserId: 'teacher-1' });

    expect(mockReclaim).toHaveBeenCalled();
    expect(mockCreateGame).not.toHaveBeenCalled();
    expect(mockEmitError).not.toHaveBeenCalled();
  });
});

describe('blastDeadEnd', () => {
  function fire(gameState: string) {
    mockGetGameBySocketId.mockReturnValue('BLAST1');
    mockGetGame.mockReturnValue({ gameMode: 'blast', gameState });
    const socket = createSocket();
    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['blastDeadEnd']();
  }

  it('ends a blast round that is in progress', () => {
    fire('in-progress');
    expect(mockEndGame).toHaveBeenCalledWith(fakeIo, 'BLAST1');
  });

  it.each(['finished', 'waiting'])('ignores a late dead-end report once the room is %s', (state) => {
    fire(state);
    expect(mockEndGame).not.toHaveBeenCalled();
  });
});
