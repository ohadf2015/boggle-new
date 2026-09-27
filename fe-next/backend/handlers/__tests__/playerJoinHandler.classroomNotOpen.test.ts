/**
 * The early joiner: a student types the projector code while the teacher is
 * still on the "Join the game" screen.
 *
 * The code is minted and written to Redis (`createClassroomGame`) the moment
 * that screen appears, but the socket ROOM only exists once the teacher taps
 * START GAME and the multiplayer host page emits `createGame`. In between, the
 * base `join` door found no room and answered GAME_NOT_FOUND — which the
 * classroom client reads as "your class game ended" and bounces the child to
 * /student. Kids join the instant the code appears, so this was the first
 * thing a class hit.
 *
 * The server stays the source of truth: when the code IS a live classroom
 * session that simply has not opened its room yet, it says so with its own
 * code (CLASSROOM_NOT_OPEN) and the client waits instead of leaving. Every
 * other missing-room case keeps answering GAME_NOT_FOUND exactly as before.
 */
import { vi } from 'vitest';
import { Server, Socket } from 'socket.io';

const {
  mockGetGame, mockGetSocketIdByUsername, mockAddUserToGame, mockGetGameUsers,
  mockGetActiveRooms, mockRestoreGameFromRedis, mockShouldSendGameState,
  mockGetClassroomGame, mockGetClassroomMembershipLevel, mockSafeEmit, mockEmitError, mockCapture,
} = vi.hoisted(() => ({
  mockCapture: vi.fn(),
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
    CLASSROOM_NOT_OPEN: 'CLASSROOM_NOT_OPEN',
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
vi.mock('../../utils/educationTelemetry', () => ({
  buildClassroomJoinRefusedEvent: vi.fn((e: unknown) => e),
  captureEduServerEvents: mockCapture,
}));
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

const waitingClassroom = {
  gameCode: 'ABC123', classroomId: 'class-1', teacherId: 't1', teacherName: 'Ms K',
  lessonIds: ['l1'], vocabularyWords: ['river'], players: [], status: 'waiting',
};
const flush = () => new Promise((r) => setTimeout(r, 0));
const errorCodes = () => mockEmitError.mock.calls.map((c) => c[1]);

describe("base 'join' — a classroom code whose room is not open yet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGame.mockReturnValue(undefined);
    mockRestoreGameFromRedis.mockResolvedValue(null);
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
  });

  it('tells an early joiner to wait (CLASSROOM_NOT_OPEN), never GAME_NOT_FOUND', async () => {
    mockGetClassroomGame.mockResolvedValue(waitingClassroom);

    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(mockEmitError).toHaveBeenCalledWith(socket, 'CLASSROOM_NOT_OPEN');
    expect(errorCodes()).not.toContain('GAME_NOT_FOUND');
    expect(addUserToGame).not.toHaveBeenCalled();
    // Not a refusal: nothing is recorded as a turned-away child.
    expect(mockCapture).not.toHaveBeenCalled();
    // Parked where the room-open announcement will reach it.
    expect(socket.join).toHaveBeenCalledWith('classroomRoomWait:ABC123');
  });

  it('still answers GAME_NOT_FOUND for an ENDED session (no new oracle, no endless wait)', async () => {
    mockGetClassroomGame.mockResolvedValue({ ...waitingClassroom, status: 'ended', endedAt: '2026-09-19T10:00:00Z' });

    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(mockEmitError).toHaveBeenCalledWith(socket, 'GAME_NOT_FOUND');
    expect(errorCodes()).not.toContain('CLASSROOM_NOT_OPEN');
  });

  it('still answers GAME_NOT_FOUND (and records ROOM_GONE) when a PLAYING session lost its room', async () => {
    mockGetClassroomGame.mockResolvedValue({ ...waitingClassroom, status: 'playing' });

    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(mockEmitError).toHaveBeenCalledWith(socket, 'GAME_NOT_FOUND');
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture.mock.calls[0][0][0]).toMatchObject({ reason: 'ROOM_GONE', door: 'join' });
  });

  it('leaves an unknown / ordinary multiplayer code on GAME_NOT_FOUND', async () => {
    mockGetClassroomGame.mockResolvedValue(null);

    const { socket, join } = captureJoinHandler();
    await join({ gameCode: 'ZZZ999', username: 'Ada' });
    await flush();

    expect(mockEmitError).toHaveBeenCalledWith(socket, 'GAME_NOT_FOUND');
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('fails to GAME_NOT_FOUND when the classroom read throws — never a wait that cannot end', async () => {
    mockGetClassroomGame.mockRejectedValue(new Error('redis down'));

    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Ada' });
    await flush();

    expect(mockEmitError).toHaveBeenCalledWith(socket, 'GAME_NOT_FOUND');
    expect(errorCodes()).not.toContain('CLASSROOM_NOT_OPEN');
  });
});
