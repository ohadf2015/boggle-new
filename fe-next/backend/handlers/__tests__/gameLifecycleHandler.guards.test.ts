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
  mockAddUserToGame,
  mockRefreshDeadEnd,
} = vi.hoisted(() => ({
  mockRefreshDeadEnd: vi.fn().mockReturnValue('solo'),
  mockAddUserToGame: vi.fn(),
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
  addUserToGame: mockAddUserToGame,
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
vi.mock('../../../backend/modules/blastBoardRegen', () => ({ refreshBlastBoardOnDeadEnd: mockRefreshDeadEnd }));
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
import { getAuthUserConnection, deleteGame, removeUserFromGame, getUsernameBySocketId } from '../../modules/gameStateManager';
import { safeEmit, broadcastToRoom, getSocketById } from '../../utils/socketHelpers';
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

  it('seats the host under the verified id when the payload has none, so a reload can reclaim the room', async () => {
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'CLS123', teacherId: 'teacher-1' });
    const socket = createSocket('teacher-1');

    await create(socket, { authUserId: null });

    expect(mockAddUserToGame).toHaveBeenCalledWith('CLS123', 'Host', 'sock-1', expect.objectContaining({ isHost: true, authUserId: 'teacher-1' }));
  });

  it('never seats the classroom host under a payload id that differs from the verified one', async () => {
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'CLS123', teacherId: 'teacher-1' });
    const socket = createSocket('teacher-1');

    await create(socket, { authUserId: 'someone-else' });

    expect(mockAddUserToGame).toHaveBeenCalledWith('CLS123', 'Host', 'sock-1', expect.objectContaining({ authUserId: 'teacher-1' }));
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

  it('keeps seating a public host under the payload id, as before', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    const socket = createSocket('user-1');

    await create(socket, { authUserId: 'user-1' });

    expect(mockAddUserToGame).toHaveBeenCalledWith('CLS123', 'Host', 'sock-1', expect.objectContaining({ authUserId: 'user-1' }));
  });
});

describe('createGame room visibility', () => {
  beforeEach(() => mockGetClassroomGame.mockResolvedValue(null));
  const joinedPayload = (socket: ReturnType<typeof createSocket>) =>
    socket.emit.mock.calls.find(([event]) => event === 'joined')?.[1];

  it('Given an older client with no visibility, When the room is created, Then it is public', async () => {
    const socket = createSocket();
    await create(socket, {});
    expect(createdOptions()).toMatchObject({ visibility: 'public' });
    expect(joinedPayload(socket)).toMatchObject({ visibility: 'public' });
  });

  it('Given a signed-in host asking for friends only, When created, Then the room is friends only', async () => {
    const socket = createSocket('user-1');
    await create(socket, { visibility: 'friends', authUserId: 'user-1' });
    expect(createdOptions()).toMatchObject({ visibility: 'friends' });
    expect(joinedPayload(socket)).toMatchObject({ visibility: 'friends' });
  });

  it('Given a guest asking for friends only, When created, Then it falls back to link only, never public', async () => {
    const socket = createSocket();
    await create(socket, { visibility: 'friends', authUserId: 'forged-id' });
    expect(createdOptions()).toMatchObject({ visibility: 'private' });
  });

  it('Given a private room, When created, Then the host is told it is private', async () => {
    const socket = createSocket();
    await create(socket, { visibility: 'private' });
    expect(joinedPayload(socket)).toMatchObject({ visibility: 'private' });
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
  function fire(gameState: string, username: string | null = 'Ada') {
    mockGetGameBySocketId.mockReturnValue('BLAST1');
    vi.mocked(getUsernameBySocketId).mockReturnValue(username as never);
    mockGetGame.mockReturnValue({ gameMode: 'blast', gameState });
    const socket = createSocket();
    registerGameLifecycleHandlers(fakeIo, socket as never);
    socket.handlers['blastDeadEnd']();
  }

  it('ends a blast round that is in progress', () => {
    fire('in-progress');
    expect(mockEndGame).toHaveBeenCalledWith(fakeIo, 'BLAST1');
  });

  it('in a room with other players, refreshes only the reporter\'s board and keeps the round going', () => {
    mockRefreshDeadEnd.mockReturnValueOnce('regenerated');
    fire('in-progress');
    expect(mockRefreshDeadEnd).toHaveBeenCalledWith(expect.objectContaining({ gameCode: 'BLAST1' }));
    expect(mockEndGame).not.toHaveBeenCalled();
  });

  it('ignores a report from a socket with no seat (never builds a board for a blank name)', () => {
    fire('in-progress', null);
    expect(mockRefreshDeadEnd).not.toHaveBeenCalled();
    expect(mockEndGame).not.toHaveBeenCalled();
  });

  it.each(['finished', 'waiting'])('ignores a late dead-end report once the room is %s', (state) => {
    fire(state);
    expect(mockEndGame).not.toHaveBeenCalled();
  });
});

describe('createGame while the same account hosts a live classroom game in another tab', () => {
  beforeEach(() => {
    mockGetClassroomGame.mockResolvedValue(null);
    vi.mocked(getAuthUserConnection).mockReturnValue({ gameCode: 'CLASS1', socketId: 'board-sock', username: 'Ms T', isHost: true, connectedAt: 0 });
    mockGetGame.mockImplementation((code: string) => (code === 'CLASS1' ? { isClassroom: true, users: {} } : undefined));
  });

  it('leaves the classroom board running and seats the new room without the account', async () => {
    await create(createSocket('teacher-1'), { gameCode: 'QP1', authUserId: 'teacher-1' });

    expect(deleteGame).not.toHaveBeenCalledWith('CLASS1');
    expect(broadcastToRoom).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'hostLeftRoomClosing', expect.anything());
    expect(safeEmit).not.toHaveBeenCalledWith(expect.anything(), 'sessionMigrated', expect.anything());
    expect(mockAddUserToGame).toHaveBeenCalledWith('QP1', 'Host', 'sock-1', expect.objectContaining({ authUserId: null }));
  });

  it('still closes an ordinary arcade room the host walks away from', async () => {
    mockGetGame.mockImplementation((code: string) => (code === 'CLASS1' ? { isClassroom: false, users: {} } : undefined));

    await create(createSocket('teacher-1'), { gameCode: 'QP1', authUserId: 'teacher-1' });

    expect(deleteGame).toHaveBeenCalledWith('CLASS1');
  });
});

describe('createGame while the same account sits in a live classroom game in another tab', () => {
  beforeEach(() => {
    mockGetClassroomGame.mockResolvedValue(null);
    vi.mocked(getAuthUserConnection).mockReturnValue({ gameCode: 'CLASS1', socketId: 'class-tab', username: 'Maya', isHost: false, connectedAt: 0 });
    vi.mocked(getSocketById).mockReturnValue({ id: 'class-tab', connected: true, data: {} } as never);
    mockGetGame.mockImplementation((code: string) => (code === 'CLASS1' ? { isClassroom: true, users: { Maya: {} } } : undefined));
  });

  it('keeps the student in the class and opens the new room without the account', async () => {
    await create(createSocket('student-1'), { gameCode: 'QP1', authUserId: 'student-1' });

    expect(removeUserFromGame).not.toHaveBeenCalledWith('CLASS1', 'Maya');
    expect(mockAddUserToGame).toHaveBeenCalledWith('QP1', 'Host', 'sock-1', expect.objectContaining({ authUserId: null }));
  });

  it('moves the account as before once the class tab is closed', async () => {
    vi.mocked(getSocketById).mockReturnValue({ id: 'class-tab', connected: false, data: {} } as never);

    await create(createSocket('student-1'), { gameCode: 'QP1', authUserId: 'student-1' });

    expect(removeUserFromGame).toHaveBeenCalledWith('CLASS1', 'Maya');
  });
});
