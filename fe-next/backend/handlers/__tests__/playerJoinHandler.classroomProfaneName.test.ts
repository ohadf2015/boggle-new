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
import { clearClassroomLevelCache } from '../../modules/classroomLevelCache';

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


vi.mock('@/utils/onboardingNameSuggestions', () => ({ suggestPlayerName: (lang: string) => `Fun ${lang}` }));

const seatedAs = () => mockAddUserToGame.mock.calls[0]?.[1];

describe('PlayerJoinHandler — profane names in a classroom room', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearClassroomLevelCache();
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    mockGetSocketIdByUsername.mockReturnValue(undefined);
    mockShouldSendGameState.mockReturnValue(false);
    mockGetClassroomMembershipLevel.mockResolvedValue('core');
  });

  it('Given a student socket that sends a profane name straight to join, When seated in a classroom room, Then the projector gets a fun name instead', async () => {
    mockGetGame.mockReturnValue(lobbyGame({ language: 'sv' }));
    mockGetClassroomGame.mockResolvedValue(classroomGame);
    const { socket, join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'fitta' });
    expect(seatedAs()).toBe('Fun sv');
    expect(socket.emit).toHaveBeenCalledWith('joined', expect.objectContaining({ username: 'Fun sv' }));
  });

  it('Given an ordinary name, When seated in a classroom room, Then it is kept', async () => {
    mockGetGame.mockReturnValue(lobbyGame());
    mockGetClassroomGame.mockResolvedValue(classroomGame);
    const { join } = captureJoinHandler('student-1');
    await join({ gameCode: 'ABC123', username: 'Dickson' });
    expect(seatedAs()).toBe('Dickson');
  });

  it('Given an ordinary multiplayer room, When a player joins, Then the classroom name rule does not apply', async () => {
    mockGetGame.mockReturnValue(lobbyGame());
    mockGetClassroomGame.mockResolvedValue(null);
    const { join } = captureJoinHandler('player-1');
    await join({ gameCode: 'ABC123', username: 'Dickson' });
    expect(seatedAs()).toBe('Dickson');
  });
});
