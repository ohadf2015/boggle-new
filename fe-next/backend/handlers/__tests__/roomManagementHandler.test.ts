import { vi, type Mock } from 'vitest';
import { registerRoomManagementHandlers } from '../roomManagementHandler';
import {
  getGame,
  deleteGame,
  getGameBySocketId,
  getActiveRooms,
} from '../../modules/gameStateManager';
import { checkRateLimit } from '../../utils/rateLimiter';
import { clearGameTimer } from '../../utils/timerManager';
import { cleanupGameBots } from '../../modules/botManager';

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));
vi.mock('../../utils/timerManager', () => ({ clearGameTimer: vi.fn() }));
vi.mock('../../modules/botManager', () => ({ cleanupGameBots: vi.fn() }));

const mockGetGame = getGame as Mock;
const mockDeleteGame = deleteGame as Mock;
const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockGetActiveRooms = getActiveRooms as Mock;
const mockCheckRateLimit = checkRateLimit as Mock;
const mockClearGameTimer = clearGameTimer as Mock;
const mockCleanupGameBots = cleanupGameBots as Mock;

function createMockSocket(id = 'socket-host') {
  const handlers: Record<string, Function> = {};
  return {
    socket: {
      id,
      on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
      emit: vi.fn(),
    } as any,
    handlers,
  };
}

function createMockIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to, emit: vi.fn() } as any, to, emit };
}

function makeGame(overrides: Record<string, any> = {}): any {
  return {
    gameCode: 'GAME1',
    hostSocketId: 'socket-host',
    gameState: 'waiting',
    ...overrides,
  };
}

describe('roomManagementHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetActiveRooms.mockReturnValue([]);
  });

  it('registers closeRoom, getActiveRooms, and broadcastShufflingGrid handlers', () => {
    const { socket } = createMockSocket();
    const { io } = createMockIo();
    registerRoomManagementHandlers(io, socket);
    expect(socket.on).toHaveBeenCalledWith('closeRoom', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('getActiveRooms', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('broadcastShufflingGrid', expect.any(Function));
  });

  describe('closeRoom', () => {
    it('cleans up game state and broadcasts when sender is host', () => {
      const { socket, handlers } = createMockSocket();
      const { io, to, emit } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame());

      handlers['closeRoom']();

      expect(mockClearGameTimer).toHaveBeenCalledWith('GAME1');
      expect(mockCleanupGameBots).toHaveBeenCalledWith('GAME1');
      expect(to).toHaveBeenCalledWith('game:GAME1');
      expect(emit).toHaveBeenCalledWith('roomClosed', {});
      expect(mockDeleteGame).toHaveBeenCalledWith('GAME1');
    });

    it('rejects when rate-limited', () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      mockCheckRateLimit.mockReturnValue(false);
      handlers['closeRoom']();

      expect(socket.emit).toHaveBeenCalledWith('rateLimited');
      expect(mockDeleteGame).not.toHaveBeenCalled();
    });

    it('rejects when sender is not host', () => {
      const { socket, handlers } = createMockSocket('socket-p1');
      const { io } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame()); // hostSocketId is 'socket-host'

      handlers['closeRoom']();

      expect(mockDeleteGame).not.toHaveBeenCalled();
    });

    it('does nothing when socket has no game', () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      mockGetGameBySocketId.mockReturnValue(null);
      handlers['closeRoom']();

      expect(mockDeleteGame).not.toHaveBeenCalled();
    });
  });

  describe('broadcastShufflingGrid', () => {
    it('broadcasts grid state to room when sender is host', () => {
      const { socket, handlers } = createMockSocket();
      const { io, to, emit } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame());

      const grid = [['A', 'B'], ['C', 'D']];
      handlers['broadcastShufflingGrid']({ gridState: grid });

      expect(to).toHaveBeenCalledWith('game:GAME1');
      expect(emit).toHaveBeenCalledWith('gridShuffling', { gridState: grid });
    });

    it('rejects when sender is not host (prevents grid spoofing)', () => {
      const { socket, handlers } = createMockSocket('socket-p1');
      const { io, emit } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame());

      handlers['broadcastShufflingGrid']({ gridState: [['X']] });

      expect(emit).not.toHaveBeenCalled();
    });

    it('does nothing when socket has no game', () => {
      const { socket, handlers } = createMockSocket();
      const { io, emit } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      mockGetGameBySocketId.mockReturnValue(null);
      handlers['broadcastShufflingGrid']({ gridState: [['A']] });

      expect(emit).not.toHaveBeenCalled();
    });
  });

  describe('getActiveRooms', () => {
    it('emits active rooms list', () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      const rooms = [{ gameCode: 'GAME1', hostUsername: 'Host' }];
      mockGetActiveRooms.mockReturnValue(rooms);

      handlers['getActiveRooms']();

      expect(socket.emit).toHaveBeenCalledWith('activeRooms', { rooms });
    });

    it('does nothing when rate-limited', () => {
      const { socket, handlers } = createMockSocket();
      const { io } = createMockIo();
      registerRoomManagementHandlers(io, socket);

      mockCheckRateLimit.mockReturnValue(false);
      handlers['getActiveRooms']();

      expect(socket.emit).not.toHaveBeenCalled();
    });
  });
});
