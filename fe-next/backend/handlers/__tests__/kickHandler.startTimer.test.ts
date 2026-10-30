
import { vi, type Mock, type MockInstance } from 'vitest';
import type { Server, Socket } from 'socket.io';

// Mock dependencies
const { mockGetGame, mockGetGameBySocketId, mockGetSocketIdByUsername, mockRemoveUserFromGame, mockGetGameUsers, mockGetActiveRooms, mockIsRoomEmpty, mockClearSocketMappingsForLeave, mockGetNextEligibleHost, mockTransferHost } = vi.hoisted(() => {
  const mockGetGame = vi.fn();
  const mockGetGameBySocketId = vi.fn();
  const mockGetSocketIdByUsername = vi.fn();
  const mockRemoveUserFromGame = vi.fn();
  const mockGetGameUsers = vi.fn();
  const mockGetActiveRooms = vi.fn();
  const mockIsRoomEmpty = vi.fn();
  const mockClearSocketMappingsForLeave = vi.fn();
  const mockGetNextEligibleHost = vi.fn();
  const mockTransferHost = vi.fn();
  return { mockGetGame, mockGetGameBySocketId, mockGetSocketIdByUsername, mockRemoveUserFromGame, mockGetGameUsers, mockGetActiveRooms, mockIsRoomEmpty, mockClearSocketMappingsForLeave, mockGetNextEligibleHost, mockTransferHost };
});

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: (...args: unknown[]) => mockGetGame(...args),
  getGameBySocketId: (...args: unknown[]) => mockGetGameBySocketId(...args),
  getSocketIdByUsername: (...args: unknown[]) => mockGetSocketIdByUsername(...args),
  removeUserFromGame: (...args: unknown[]) => mockRemoveUserFromGame(...args),
  getGameUsers: (...args: unknown[]) => mockGetGameUsers(...args),
  getActiveRooms: (...args: unknown[]) => mockGetActiveRooms(...args),
  isRoomEmpty: (...args: unknown[]) => mockIsRoomEmpty(...args),
  clearSocketMappingsForLeave: (...args: unknown[]) => mockClearSocketMappingsForLeave(...args),
  getNextEligibleHost: (...args: unknown[]) => mockGetNextEligibleHost(...args),
  transferHost: (...args: unknown[]) => mockTransferHost(...args),
}));

const mockBroadcastToRoom = vi.fn();
const mockBroadcastActiveRooms = vi.fn();
const mockGetGameRoom = vi.fn().mockReturnValue('game:TEST123');
const mockSafeEmit = vi.fn();
const mockGetSocketById = vi.fn();
const mockLeaveRoom = vi.fn();

vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: (...args: unknown[]) => mockBroadcastToRoom(...args),
  broadcastActiveRooms: (...args: unknown[]) => mockBroadcastActiveRooms(...args),
  getGameRoom: (...args: unknown[]) => mockGetGameRoom(...args),
  safeEmit: (...args: unknown[]) => mockSafeEmit(...args),
  getSocketById: (...args: unknown[]) => mockGetSocketById(...args),
  leaveRoom: (...args: unknown[]) => mockLeaveRoom(...args),
}));

const mockCheckRateLimit = vi.fn().mockReturnValue(true);
vi.mock('../../utils/rateLimiter.js', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

vi.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/gameStartCoordinator.js', () => {
  const coordinator = { handlePlayerDisconnect: vi.fn(), cleanupSequence: vi.fn() };
  return { default: coordinator, __esModule: true };
});

vi.mock('../../utils/playerCleanup.js', () => ({
  cleanupPlayerData: vi.fn(),
}));

const { mockStartGameTimer } = vi.hoisted(() => ({ mockStartGameTimer: vi.fn() }));
vi.mock('../../services/gameLifecycle/gameTimer.js', () => ({
  startGameTimer: (...args: unknown[]) => mockStartGameTimer(...args),
}));

import { registerKickHandler } from '../kickHandler';
import gameStartCoordinator from '../../utils/gameStartCoordinator.js';

// Helper to create mock socket
function createMockSocket(id = 'host-socket-1'): Socket {
  const handlers: Record<string, Function> = {};
  return {
    id,
    on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
    emit: vi.fn(),
    data: {},
    _handlers: handlers,
  } as unknown as Socket & { _handlers: Record<string, Function> };
}

function createMockIO(): Server {
  return {
    sockets: { sockets: new Map() },
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  } as unknown as Server;
}

function createGame(overrides = {}) {
  return {
    hostSocketId: 'host-socket-1',
    hostUsername: 'HostPlayer',
    gameState: 'waiting',
    users: {
      HostPlayer: { username: 'HostPlayer', isHost: true, disconnected: false },
      Player2: { username: 'Player2', isHost: false, disconnected: false },
      Player3: { username: 'Player3', isHost: false, disconnected: false },
    },
    kickedPlayers: new Set<string>(),
    ...overrides,
  };
}

describe('kickHandler: kicking the last unready player during the start countdown', () => {
  let io: Server;
  let socket: Socket & { _handlers: Record<string, Function> };

  beforeEach(() => {
    vi.resetAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetGameRoom.mockReturnValue('game:TEST123');
    mockGetGameBySocketId.mockReturnValue('TEST123');
    mockGetSocketIdByUsername.mockReturnValue(null);
    mockGetGameUsers.mockReturnValue([]);
    mockGetActiveRooms.mockReturnValue([]);
    io = createMockIO();
    socket = createMockSocket() as Socket & { _handlers: Record<string, Function> };
    registerKickHandler(io, socket);
  });

  it('starts the round clock when the kick leaves every remaining player ready', () => {
    mockGetGame.mockReturnValue(createGame({ gameState: 'in-progress', gameDuration: 90 }));
    (gameStartCoordinator.handlePlayerDisconnect as Mock).mockReturnValue({ startTimer: true });

    socket._handlers['kickPlayer']({ targetUsername: 'Player2' });

    expect(mockStartGameTimer).toHaveBeenCalledWith(io, 'TEST123', 90);
  });

  it('leaves the clock alone when others are still counting down', () => {
    mockGetGame.mockReturnValue(createGame({ gameState: 'in-progress', gameDuration: 90 }));
    (gameStartCoordinator.handlePlayerDisconnect as Mock).mockReturnValue(undefined);

    socket._handlers['kickPlayer']({ targetUsername: 'Player2' });

    expect(mockStartGameTimer).not.toHaveBeenCalled();
  });
});
