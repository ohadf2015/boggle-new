/**
 * The base multiplayer door, `socket.on('join')`, and an ended classroom code.
 *
 * This is the gap a blind critic found live with socket.io-client in round 3:
 * every OTHER door refused an ended classroom session — the three HTTP doors
 * via `lib/education/classroomGameLookup`, the enrolment socket door via
 * `classroomGameJoinGate` — while the door the multiplayer page itself uses
 * asked only `getGame(code)` and seated the player. A student whose tab still
 * held the code (or anyone with the projector PIN) emitted the ordinary `join`
 * and got `{ success: true }` into a session the teacher had ended.
 *
 * The teardown added alongside this closes the common case by deleting the
 * room, which makes the existing GAME_NOT_FOUND branch answer. This gate exists
 * for the case teardown cannot cover: `deleteGame` early-returns when the room
 * is not in THIS instance's memory (`gameStateManager.ts:214`), so on another
 * instance — or after a restart rehydrates from Redis — the room comes back and
 * the code is a door again. Silent no-op, pitfall class 4.
 *
 * The reconnect branch is covered here too: the client re-emits `join` to
 * rebuild the socket map, so one gate above the branch guards both routes.
 */
import { vi } from 'vitest';
import { Server, Socket } from 'socket.io';

const {
  mockGetGame, mockGetSocketIdByUsername, mockAddUserToGame, mockGetGameUsers,
  mockGetActiveRooms, mockRestoreGameFromRedis, mockShouldSendGameState,
  mockGetClassroomGame, mockGetClassroomMembershipLevel, mockSafeEmit, mockEmitError,
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
  mockEmitError: vi.fn(),
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
vi.mock('../../utils/errorHandler', () => ({
  emitError: mockEmitError,
  ErrorCodes: {
    GAME_NOT_FOUND: 'GAME_NOT_FOUND',
    VALIDATION_INVALID_PAYLOAD: 'VALIDATION_INVALID_PAYLOAD',
    PLAYER_KICKED: 'PLAYER_KICKED',
    PLAYER_BLOCKED: 'PLAYER_BLOCKED',
    GAME_CLOSED: 'GAME_CLOSED',
  },
}));
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
import { addUserToGame } from '../../modules/gameStateManager';

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

const liveRoom = (overrides: Record<string, unknown> = {}) => ({
  gameCode: 'ABC123', roomName: 'Room', language: 'en', users: {}, gameMode: 'classic',
  gameState: 'waiting', isRanked: false, ...overrides,
});

const endedClassroom = {
  gameCode: 'ABC123', classroomId: 'class-1', teacherId: 't1', teacherName: 'Ms K',
  lessonIds: ['l1'], vocabularyWords: ['river'], players: [],
  status: 'ended', endedAt: '2026-09-11T10:00:00.000Z',
};
const liveClassroom = { ...endedClassroom, status: 'playing', endedAt: undefined };

const joinedEmits = (socket: Socket) =>
  (socket.emit as ReturnType<typeof vi.fn>).mock.calls.filter((c) => c[0] === 'joined');
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("base 'join' — an ended classroom session is not a door", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockShouldSendGameState.mockReturnValue(false);
    mockGetClassroomMembershipLevel.mockResolvedValue('core');
  });

  it('refuses a fresh join into an ended session, with the same error an unknown code gets', async () => {
    mockGetGame.mockReturnValue(liveRoom());
    mockGetClassroomGame.mockResolvedValue(endedClassroom);

    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(mockEmitError).toHaveBeenCalledWith(socket, 'GAME_NOT_FOUND');
    expect(joinedEmits(socket)).toHaveLength(0);
    expect(addUserToGame).not.toHaveBeenCalled();
  });

  it('refuses the RECONNECT branch too — one gate above the branch, not a copy in each', async () => {
    mockGetGame.mockReturnValue(liveRoom({ users: { Ada: { socketId: 'old' } }, gameState: 'in-progress' }));
    mockGetSocketIdByUsername.mockReturnValue('old-sock');
    mockGetClassroomGame.mockResolvedValue(endedClassroom);

    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(handleReconnection).not.toHaveBeenCalled();
    expect(mockEmitError).toHaveBeenCalledWith(socket, 'GAME_NOT_FOUND');
  });

  it('leaves an ORDINARY multiplayer room completely untouched', async () => {
    mockGetGame.mockReturnValue(liveRoom());
    mockGetClassroomGame.mockResolvedValue(null);

    const { socket, join } = captureJoinHandler('player-1');
    await join({ gameCode: 'ZZZ999', username: 'Ada' });
    await flush();

    expect(mockEmitError).not.toHaveBeenCalled();
    expect(joinedEmits(socket)).toHaveLength(1);
    expect(addUserToGame).toHaveBeenCalled();
  });

  it('seats a latecomer into a LIVE classroom game between rounds', async () => {
    mockGetGame.mockReturnValue(liveRoom());
    mockGetClassroomGame.mockResolvedValue({ ...liveClassroom, status: 'finished' });

    const { socket, join } = captureJoinHandler('student-2');
    await join({ gameCode: 'ABC123', username: 'Bo' });
    await flush();

    expect(mockEmitError).not.toHaveBeenCalled();
    expect(joinedEmits(socket)).toHaveLength(1);
  });

  it('reads the classroom record ONCE — the gate hands it to the context emitter', async () => {
    mockGetGame.mockReturnValue(liveRoom());
    mockGetClassroomGame.mockResolvedValue(liveClassroom);
    mockGetClassroomMembershipLevel.mockResolvedValue('support');

    const { join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(mockGetClassroomGame).toHaveBeenCalledTimes(1);
    const ctx = mockSafeEmit.mock.calls.filter((c) => c[1] === 'classroomContext');
    expect(ctx).toHaveLength(1);
    expect(ctx[0][2]).toEqual({ classroomLevel: 'support', classroomWordBank: ['river'] });
  });
});
