import { vi } from 'vitest';
import { Server, Socket } from 'socket.io';

const {
  mockGetGame, mockGetSocketIdByUsername, mockAddUserToGame, mockGetGameUsers,
  mockGetActiveRooms, mockRestoreGameFromRedis, mockShouldSendGameState, mockCheckSeat, mockIsInProgress,
} = vi.hoisted(() => ({
  mockIsInProgress: vi.fn(),
  mockCheckSeat: vi.fn(),
  mockGetGame: vi.fn(),
  mockGetSocketIdByUsername: vi.fn(),
  mockAddUserToGame: vi.fn(),
  mockGetGameUsers: vi.fn(),
  mockGetActiveRooms: vi.fn(),
  mockRestoreGameFromRedis: vi.fn(),
  mockShouldSendGameState: vi.fn(),
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
  safeEmit: vi.fn(),
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

vi.mock('../../modules/blockListManager', () => ({
  isBlocked: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../utils/timerManager', () => ({
  default: { clearGameTimer: vi.fn() }, clearGameTimer: vi.fn(),
}));

vi.mock('../../utils/gameStartCoordinator', () => ({ default: { cancel: vi.fn() } }));
vi.mock('../../services/gameLifecycle/gameTimer.js', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));
vi.mock('../../services/gameLifecycle/gameTimer', () => ({ startGameTimer: vi.fn(), resumeGameTimerIfMissing: vi.fn() }));

vi.mock('../../modules/botManager', () => ({ cleanupGameBots: vi.fn() }));

vi.mock('../../utils/gameUtils', () => ({
  generateRandomAvatar: vi.fn().mockReturnValue({ color: 'blue', icon: 'cat' }),
}));

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockImplementation((_schema, data) => ({ success: true, data })),
  joinGameSchema: {},
}));

vi.mock('../../utils/consts', () => ({ MAX_PLAYERS_PER_ROOM: 8 }));

vi.mock('../../utils/gameStateMachine', () => ({
  isInProgress: mockIsInProgress,
  canJoinFreely: vi.fn().mockReturnValue(true),
  shouldSendGameState: mockShouldSendGameState,
}));

vi.mock('../../modules/notificationService', () => ({
  notifyPlayerJoined: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../playerReconnectHandler', () => ({
  handleReconnection: vi.fn(),
  handleLateJoin: vi.fn(),
  handleTournamentJoin: vi.fn(),
  handleExistingAuthConnectionJoin: vi.fn().mockResolvedValue({ handled: false }),
}));

vi.mock('../classroomSeatGate', () => ({ checkClassroomSeat: mockCheckSeat }));
vi.mock('../playerDataInit', () => ({ ensurePlayerState: vi.fn().mockResolvedValue(undefined) }));

import { registerPlayerJoinHandlers } from '../playerJoinHandler';
import { handleReconnection, handleLateJoin } from '../playerReconnectHandler';

function captureJoinHandler() {
  const listeners: Record<string, (...args: unknown[]) => unknown> = {};
  const socket = {
    id: 'late-socket-1',
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: {},
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => { listeners[event] = cb; }),
  } as unknown as Socket;
  const io = { emit: vi.fn(), to: vi.fn().mockReturnThis() } as unknown as Server;
  registerPlayerJoinHandlers(io, socket);
  return { socket, io, join: listeners['join'] };
}

function roomGame(overrides: Record<string, unknown> = {}) {
  return {
    gameCode: 'ABC123',
    roomName: 'Room',
    language: 'en',
    users: {},
    gameMode: 'word-hunt',
    gameState: 'waiting',
    isRanked: false,
    ...overrides,
  };
}

import { emitError } from '../../utils/errorHandler';
import { lockSeatsOf } from '../../modules/classroomLobbyLock';
import { addSpectatorToGame } from '../../modules/gameStateManager';


const LOCKED = { game: { teacherId: 'teacher-1', settings: { lobbyLocked: true } }, refused: false };
const lockedError = () => (emitError as unknown as { mock: { calls: unknown[][] } }).mock.calls.find((c) => c[1] === 'ROOM_LOCKED');

describe('PlayerJoinHandler — classroom room lock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockShouldSendGameState.mockReturnValue(false);
    mockIsInProgress.mockReturnValue(false);
  });

  it('GIVEN a locked lobby WHEN a new student joins THEN they are refused with ROOM_LOCKED and not seated', async () => {
    mockGetGame.mockReturnValue(roomGame());
    mockCheckSeat.mockResolvedValue(LOCKED);
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Stranger' });
    expect(lockedError()).toBeTruthy();
    expect(mockAddUserToGame).not.toHaveBeenCalled();
    expect(addSpectatorToGame).not.toHaveBeenCalled();
  });

  it('GIVEN a locked lobby that is full WHEN a stranger joins THEN they are not seated as a spectator either', async () => {
    const users = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`P${i}`, { socketId: `s${i}` }]));
    mockGetGame.mockReturnValue(roomGame({ users }));
    mockCheckSeat.mockResolvedValue(LOCKED);
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Stranger' });
    expect(lockedError()).toBeTruthy();
    expect(addSpectatorToGame).not.toHaveBeenCalled();
  });

  it('GIVEN a locked lobby WHEN a seated student reconnects by name THEN they get back in', async () => {
    mockGetGame.mockReturnValue(roomGame({ users: { Sam: { socketId: 'old' } } }));
    mockCheckSeat.mockResolvedValue(LOCKED);
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Sam' });
    expect(lockedError()).toBeUndefined();
    expect(handleReconnection).toHaveBeenCalled();
  });

  it('GIVEN a locked lobby WHEN a student whose socket is still mapped rejoins THEN they get back in', async () => {
    mockGetGame.mockReturnValue(roomGame());
    mockGetSocketIdByUsername.mockReturnValue('still-mapped');
    mockCheckSeat.mockResolvedValue(LOCKED);
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Sam' });
    expect(lockedError()).toBeUndefined();
    expect(handleReconnection).toHaveBeenCalled();
  });

  it('GIVEN a locked lobby WHEN the teacher joins THEN they get in', async () => {
    mockGetGame.mockReturnValue(roomGame());
    mockCheckSeat.mockResolvedValue(LOCKED);
    const { socket, join } = captureJoinHandler();
    (socket as unknown as { data: Record<string, unknown> }).data.verifiedUserId = 'teacher-1';
    await join({ gameCode: 'ABC123', username: 'Ms T' });
    expect(lockedError()).toBeUndefined();
    expect(mockAddUserToGame).toHaveBeenCalled();
  });

  it('GIVEN a locked room whose round is running WHEN a stranger joins THEN the lock stays out of it (late join decides)', async () => {
    mockIsInProgress.mockReturnValue(true);
    mockShouldSendGameState.mockReturnValue(true);
    mockGetGame.mockReturnValue(roomGame({ gameState: 'in-progress' }));
    mockCheckSeat.mockResolvedValue(LOCKED);
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Stranger' });
    expect(lockedError()).toBeUndefined();
    expect(mockAddUserToGame).toHaveBeenCalled();
  });

  it('GIVEN a guest seated at lock time was dropped after the grace WHEN they rejoin with the same token THEN they get in', async () => {
    mockGetGame.mockReturnValue(roomGame());
    mockCheckSeat.mockResolvedValue({ game: { teacherId: 'teacher-1', settings: { lobbyLocked: true, lobbyLockedSeats: lockSeatsOf([{ guestTokenHash: 'hash-1' }]) } }, refused: false });
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Sam', guestTokenHash: 'hash-1' });
    expect(lockedError()).toBeUndefined();
    expect(mockAddUserToGame).toHaveBeenCalled();
  });

  it('GIVEN the teacher unlocked WHEN a new student joins THEN they get in', async () => {
    mockGetGame.mockReturnValue(roomGame());
    mockCheckSeat.mockResolvedValue({ game: { teacherId: 'teacher-1', settings: { lobbyLocked: false } }, refused: false });
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Newbie' });
    expect(lockedError()).toBeUndefined();
    expect(mockAddUserToGame).toHaveBeenCalled();
  });

  it('GIVEN an ordinary multiplayer room WHEN anyone joins THEN the lock never applies', async () => {
    mockGetGame.mockReturnValue(roomGame());
    mockCheckSeat.mockResolvedValue({ game: null, refused: false });
    const { join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Friend' });
    expect(lockedError()).toBeUndefined();
    expect(mockAddUserToGame).toHaveBeenCalled();
  });
});

describe('PlayerJoinHandler — classroom seat cap', () => {
  const fullRoom = (extra: Record<string, unknown> = {}) =>
    roomGame({ users: Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`P${i}`, { socketId: `s${i}` }])), ...extra });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockShouldSendGameState.mockReturnValue(false);
    mockIsInProgress.mockReturnValue(false);
  });

  it('GIVEN a full classroom WHEN one more student arrives THEN the teacher is told who is watching instead of playing', async () => {
    mockGetGame.mockReturnValue(fullRoom({ isClassroom: true, hostSocketId: 'teacher-sock' }));
    mockCheckSeat.mockResolvedValue({ game: { teacherId: 'teacher-1', settings: {} }, refused: false });
    const { io, join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Late' });

    expect(addSpectatorToGame).toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith('teacher-sock');
    expect(io.emit).toHaveBeenCalledWith('classroomSeatCapReached', { gameCode: 'ABC123', username: 'Late', cap: 8 });
  });

  it('GIVEN a full ordinary room WHEN one more player arrives THEN no classroom notice is sent', async () => {
    mockGetGame.mockReturnValue(fullRoom({ hostSocketId: 'host-sock' }));
    mockCheckSeat.mockResolvedValue({ game: null, refused: false });
    const { io, join } = captureJoinHandler();
    await join({ gameCode: 'ABC123', username: 'Late' });

    expect(addSpectatorToGame).toHaveBeenCalled();
    expect(io.emit).not.toHaveBeenCalledWith('classroomSeatCapReached', expect.anything());
  });
});
