/**
 * Player Join Handler — per-socket classroom context.
 *
 * `startGame` is a ROOM broadcast (one payload for everyone), so a per-student
 * value cannot ride on it. `join` is the one path every player passes through —
 * first join, late join, AND reconnect (the client re-emits `join`; the lighter
 * `requestGameState` only works once a `join` rebuilt the socket map). Emitting
 * `classroomContext` from `join` therefore covers all three without an
 * asymmetric sibling path (see .claude/rules/60-recurring-pitfalls.md, class 3).
 *
 * Payload: { classroomLevel: 'support'|'core'|'challenge', classroomWordBank: string[] }
 * Only for classroom games; guests / non-members / lookup failures → 'core'.
 */
import { vi } from 'vitest';
import { Server, Socket } from 'socket.io';

const {
  mockGetGame, mockGetSocketIdByUsername, mockAddUserToGame, mockGetGameUsers,
  mockGetActiveRooms, mockRestoreGameFromRedis, mockShouldSendGameState,
  mockGetClassroomGame, mockGetClassroomMembershipLevel, mockSafeEmit,
} = vi.hoisted(() => ({
  mockGetGame: vi.fn(),
  mockGetSocketIdByUsername: vi.fn(),
  mockAddUserToGame: vi.fn(),
  mockGetGameUsers: vi.fn(),
  mockGetActiveRooms: vi.fn(),
  mockRestoreGameFromRedis: vi.fn(),
  mockShouldSendGameState: vi.fn(),
  mockGetClassroomGame: vi.fn(),
  mockGetClassroomMembershipLevel: vi.fn(),
  mockSafeEmit: vi.fn(),
}));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getAuthUserConnection: vi.fn(),
  getSocketIdByUsername: mockGetSocketIdByUsername,
  addUserToGame: mockAddUserToGame,
  updateUserSocketId: vi.fn(),
  removeUserFromGame: vi.fn(),
  getGameUsers: mockGetGameUsers,
  getActiveRooms: mockGetActiveRooms,
  isRoomEmpty: vi.fn(),
  restoreGameFromRedis: mockRestoreGameFromRedis,
  updateHostSocketId: vi.fn(),
  getLeaderboard: vi.fn().mockReturnValue([]),
  getTournamentIdFromGame: vi.fn(),
  getGameSpectators: vi.fn().mockReturnValue([]),
  addSpectatorToGame: vi.fn(),
  upgradeSpectatorToPlayer: vi.fn(),
  deleteGame: vi.fn(),
  transferHost: vi.fn(),
  getNextEligibleHost: vi.fn(),
  clearSocketMappingsForLeave: vi.fn(),
  isSpectator: vi.fn(),
}));
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  broadcastToRoomExceptSender: vi.fn(),
  broadcastActiveRooms: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  LOBBY_ROOM: 'lobby',
  safeEmit: mockSafeEmit,
  getSocketById: vi.fn(),
  disconnectSocket: vi.fn(),
  isSocketMigrating: vi.fn().mockReturnValue(false),
}));
vi.mock('../../utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errorHandler')>('../../utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});
vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
  getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1'),
  default: { checkRateLimit: vi.fn().mockReturnValue(true) },
}));
vi.mock('../../modules/blockListManager', () => ({ isBlocked: vi.fn().mockResolvedValue(null) }));
vi.mock('../../utils/timerManager', () => ({ default: { clearGameTimer: vi.fn() }, clearGameTimer: vi.fn() }));
vi.mock('../../utils/gameStartCoordinator', () => ({ default: { cancel: vi.fn() } }));
vi.mock('../../services/gameLifecycle/gameTimer.js', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));
vi.mock('../../services/gameLifecycle/gameTimer', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));
vi.mock('../../modules/botManager', () => ({ cleanupGameBots: vi.fn() }));
vi.mock('../../utils/gameUtils', () => ({ generateRandomAvatar: vi.fn().mockReturnValue({ color: 'blue', icon: 'cat' }) }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockImplementation((_schema, data) => ({ success: true, data })),
  joinGameSchema: {},
}));
vi.mock('../../utils/consts', () => ({ MAX_PLAYERS_PER_ROOM: 8 }));
vi.mock('../../utils/gameStateMachine', () => ({
  isInProgress: vi.fn().mockReturnValue(false),
  canJoinFreely: vi.fn().mockReturnValue(true),
  shouldSendGameState: mockShouldSendGameState,
}));
vi.mock('../../modules/notificationService', () => ({ notifyPlayerJoined: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../playerReconnectHandler', () => ({
  handleReconnection: vi.fn(),
  handleLateJoin: vi.fn(),
  handleTournamentJoin: vi.fn(),
  handleExistingAuthConnectionJoin: vi.fn().mockResolvedValue({ handled: false }),
}));
vi.mock('../playerDataInit', () => ({ ensurePlayerState: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../modules/classroomGameManager', () => ({ getClassroomGame: mockGetClassroomGame }));
vi.mock('../../modules/supabase/classroomMembership', () => ({
  getClassroomMembershipLevel: mockGetClassroomMembershipLevel,
}));

import { registerPlayerJoinHandlers } from '../playerJoinHandler';
import { handleReconnection } from '../playerReconnectHandler';

function captureJoinHandler(verifiedUserId?: string) {
  const listeners: Record<string, (...args: unknown[]) => unknown> = {};
  const socket = {
    id: 'sock-1',
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: verifiedUserId ? { verifiedUserId } : {},
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => { listeners[event] = cb; }),
  } as unknown as Socket;
  const io = { emit: vi.fn(), to: vi.fn().mockReturnThis() } as unknown as Server;
  registerPlayerJoinHandlers(io, socket);
  return { socket, io, join: listeners['join'] };
}

const lobbyGame = (overrides: Record<string, unknown> = {}) => ({
  gameCode: 'ABC123', roomName: 'Room', language: 'en', users: {}, gameMode: 'classic',
  gameState: 'waiting', isRanked: false, ...overrides,
});

const classroomGame = {
  gameCode: 'ABC123', classroomId: 'class-1', teacherId: 't1', teacherName: 'Ms K',
  lessonIds: ['l1'], vocabularyWords: ['river', 'planet', 'cat'], status: 'waiting', players: [],
};

const contextEmits = () => mockSafeEmit.mock.calls.filter((c) => c[1] === 'classroomContext');
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('PlayerJoinHandler — classroomContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockShouldSendGameState.mockReturnValue(false);
    mockGetClassroomMembershipLevel.mockResolvedValue('core');
  });

  it('sends the member level + lesson word bank to the joining socket of a classroom game', async () => {
    mockGetGame.mockReturnValue(lobbyGame());
    mockGetClassroomGame.mockResolvedValue(classroomGame);
    mockGetClassroomMembershipLevel.mockResolvedValue('support');

    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(mockGetClassroomMembershipLevel).toHaveBeenCalledWith('student-1', 'class-1');
    const emits = contextEmits();
    expect(emits).toHaveLength(1);
    expect(emits[0][0]).toBe(socket);
    expect(emits[0][2]).toEqual({ classroomLevel: 'support', classroomWordBank: ['river', 'planet', 'cat'] });
  });

  it("gives a guest (no verified user) 'core' without touching the membership table", async () => {
    mockGetGame.mockReturnValue(lobbyGame());
    mockGetClassroomGame.mockResolvedValue(classroomGame);

    const { join } = captureJoinHandler(undefined);
    await join({ gameCode: 'ABC123', username: 'Guest' });
    await flush();

    expect(mockGetClassroomMembershipLevel).not.toHaveBeenCalled();
    expect(contextEmits()[0][2]).toMatchObject({ classroomLevel: 'core' });
  });

  it('emits nothing for a non-classroom game', async () => {
    mockGetGame.mockReturnValue(lobbyGame());
    mockGetClassroomGame.mockResolvedValue(null);

    const { join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(contextEmits()).toHaveLength(0);
  });

  it('also emits on the RECONNECT branch — the same single call site', async () => {
    mockGetGame.mockReturnValue(lobbyGame({ users: { Ada: { socketId: 'old' } }, gameState: 'in-progress' }));
    mockGetSocketIdByUsername.mockReturnValue('old-sock');
    mockGetClassroomGame.mockResolvedValue(classroomGame);
    mockGetClassroomMembershipLevel.mockResolvedValue('challenge');

    const { join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(handleReconnection).toHaveBeenCalled();
    expect(contextEmits()[0][2]).toEqual({ classroomLevel: 'challenge', classroomWordBank: ['river', 'planet', 'cat'] });
  });

  it('never blocks or breaks the join when the classroom lookup throws', async () => {
    mockGetGame.mockReturnValue(lobbyGame());
    mockGetClassroomGame.mockRejectedValue(new Error('redis down'));

    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    const joined = (socket.emit as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === 'joined');
    expect(joined).toBeDefined();
    expect(contextEmits()).toHaveLength(0);
  });
});
