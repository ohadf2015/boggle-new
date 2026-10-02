import { vi, type Mock, type MockInstance } from 'vitest';
import type { Server } from 'socket.io';

const { mockGetGame, mockGetSocketIdByUsername, mockGetGameUsers, mockGetActiveRooms, mockRemoveUserFromGame, mockClearSocketMappingsForLeave } = vi.hoisted(() => {
  const mockGetGame = vi.fn();
  const mockGetSocketIdByUsername = vi.fn();
  const mockGetGameUsers = vi.fn();
  const mockGetActiveRooms = vi.fn();
  const mockRemoveUserFromGame = vi.fn();
  const mockClearSocketMappingsForLeave = vi.fn();
  return { mockGetGame, mockGetSocketIdByUsername, mockGetGameUsers, mockGetActiveRooms, mockRemoveUserFromGame, mockClearSocketMappingsForLeave };
});

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: (...args: unknown[]) => mockGetGame(...args),
  getGameBySocketId: vi.fn(),
  getSocketIdByUsername: (...args: unknown[]) => mockGetSocketIdByUsername(...args),
  removeUserFromGame: (...args: unknown[]) => mockRemoveUserFromGame(...args),
  getGameUsers: (...args: unknown[]) => mockGetGameUsers(...args),
  getActiveRooms: (...args: unknown[]) => mockGetActiveRooms(...args),
  clearSocketMappingsForLeave: (...args: unknown[]) => mockClearSocketMappingsForLeave(...args),
}));

const mockSafeEmit = vi.fn();
const mockGetSocketById = vi.fn();
const mockBroadcastToRoom = vi.fn();
const mockBroadcastActiveRooms = vi.fn();
const mockGetGameRoom = vi.fn().mockReturnValue('game:TEST123');
const mockLeaveRoom = vi.fn();

vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: (...args: unknown[]) => mockBroadcastToRoom(...args),
  broadcastActiveRooms: (...args: unknown[]) => mockBroadcastActiveRooms(...args),
  getGameRoom: (...args: unknown[]) => mockGetGameRoom(...args),
  safeEmit: (...args: unknown[]) => mockSafeEmit(...args),
  getSocketById: (...args: unknown[]) => mockGetSocketById(...args),
  leaveRoom: (...args: unknown[]) => mockLeaveRoom(...args),
}));

vi.mock('../../utils/rateLimiter.js', () => ({
  checkRateLimit: vi.fn().mockReturnValue(true),
}));

vi.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/gameStartCoordinator.js', () => ({
  default: { handlePlayerDisconnect: vi.fn() },
  __esModule: true,
}));

vi.mock('../../utils/playerCleanup.js', () => ({
  cleanupPlayerData: vi.fn(),
}));

import { checkAfkWarnings, checkAutoKickInactive } from '../kickHandler';

function createMockIO(): Server {
  return { sockets: { sockets: new Map() }, to: vi.fn().mockReturnThis(), emit: vi.fn() } as unknown as Server;
}

function classroomLobby(idleMs: number) {
  const now = Date.now();
  return {
    gameState: 'waiting',
    isClassroom: true,
    hostUsername: 'Ms K',
    users: {
      'Ms K': { username: 'Ms K', isHost: true, lastActivity: now },
      Noa: { username: 'Noa', isHost: false, isBot: false, disconnected: false, lastActivity: now - idleMs },
    },
  };
}

describe('classroom lobby: students wait for the teacher, they are not AFK', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetGameRoom.mockReturnValue('game:TEST123');
    mockGetSocketIdByUsername.mockReturnValue('noa-socket');
    mockGetSocketById.mockReturnValue({ id: 'noa-socket', connected: true });
  });

  it('given a student has waited 3+ minutes for the teacher to start, then she is not kicked', () => {
    const game = classroomLobby(190_000);
    mockGetGame.mockReturnValue(game);

    checkAutoKickInactive(createMockIO(), (cb) => cb('MSQ6M6', game));

    expect(mockRemoveUserFromGame).not.toHaveBeenCalled();
    expect(game.users.Noa).toBeDefined();
  });

  it('given a student has waited 2.5 minutes, then she gets no AFK warning', () => {
    const game = classroomLobby(155_000);

    checkAfkWarnings(createMockIO(), (cb) => cb('MSQ6M6', game));

    expect(mockSafeEmit).not.toHaveBeenCalled();
  });

  it('given an ordinary multiplayer lobby, then an idle player is still kicked', () => {
    const game = { ...classroomLobby(190_000), isClassroom: false };
    mockGetGame.mockReturnValue(game);

    checkAutoKickInactive(createMockIO(), (cb) => cb('ARCADE', game));

    expect(mockRemoveUserFromGame).toHaveBeenCalled();
  });
});
