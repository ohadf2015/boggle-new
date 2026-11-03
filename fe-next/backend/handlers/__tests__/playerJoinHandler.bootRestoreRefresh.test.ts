import { vi } from 'vitest';
import { Server, Socket } from 'socket.io';

const {
  mockGetGame, mockGetSocketIdByUsername, mockAddUserToGame, mockGetGameUsers,
  mockGetActiveRooms, mockRestoreGameFromRedis, mockShouldSendGameState,
  mockGetClassroomGame, mockGetClassroomMembershipLevel, mockSafeEmit, mockEmitError,
  mockRefreshRestored,
} = vi.hoisted(() => ({
  mockRefreshRestored: vi.fn(),
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
  refreshRestoredGameFromRedis: mockRefreshRestored,
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
import { addUserToGame } from '../../modules/gameStateManager';
import { handleReconnection } from '../playerReconnectHandler';

function captureJoinHandler() {
  const listeners: Record<string, (...args: unknown[]) => unknown> = {};
  const socket = {
    id: 'sock-new',
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    data: {},
    on: vi.fn((event: string, cb: (...args: unknown[]) => unknown) => { listeners[event] = cb; }),
  } as unknown as Socket;
  const io = { emit: vi.fn(), to: vi.fn().mockReturnThis() } as unknown as Server;
  registerPlayerJoinHandlers(io, socket);
  return { join: listeners['join'] };
}

const room = (users: Record<string, unknown>, overrides: Record<string, unknown> = {}) => ({
  gameCode: 'DDNS5S', roomName: 'Room', language: 'en', users, gameMode: 'classic',
  gameState: 'waiting', isRanked: false, ...overrides,
});

describe("base 'join' — first rejoin after a deploy reads the old instance's final state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockShouldSendGameState.mockReturnValue(false);
    mockGetClassroomGame.mockResolvedValue(null);
  });

  it('given a boot-restored room that missed a join, when that guest returns under a new name, then they get their old seat back', async () => {
    const stale = room({ 'Lazy Sloth': { socketId: null } }, { restoredFromRedis: true });
    const fresh = room(
      { 'Lazy Sloth': { socketId: null }, 'Secret Dragon': { socketId: null, guestTokenHash: 'sd-hash' } },
      { restoredFromRedis: true },
    );
    mockGetGame.mockReturnValue(stale);
    mockRefreshRestored.mockResolvedValue(fresh);

    const { join } = captureJoinHandler();
    await join({ gameCode: 'DDNS5S', username: 'Vivian', guestTokenHash: 'sd-hash' });

    expect(mockRefreshRestored).toHaveBeenCalledWith('DDNS5S');
    expect(addUserToGame).not.toHaveBeenCalled();
    expect(handleReconnection).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), fresh, 'DDNS5S', 'Secret Dragon', undefined, 'sd-hash',
    );
  });

  it('given a room created on this instance, when a player joins, then Redis is not re-read', async () => {
    mockGetGame.mockReturnValue(room({}));

    const { join } = captureJoinHandler();
    await join({ gameCode: 'DDNS5S', username: 'Ada' });

    expect(mockRefreshRestored).not.toHaveBeenCalled();
    expect(addUserToGame).toHaveBeenCalled();
  });
});
