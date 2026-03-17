import { registerHostHandlers } from '../hostHandler';
import {
  getGame,
  getGameBySocketId,
  markHostActive,
  reactivateHost,
} from '../../modules/gameStateManager';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../modules/gameStateManager');

const mockGetGame = getGame as jest.Mock;
const mockGetGameBySocketId = getGameBySocketId as jest.Mock;
const mockMarkHostActive = markHostActive as jest.Mock;
const mockReactivateHost = reactivateHost as jest.Mock;

function createMockSocket(id = 'socket-host') {
  const handlers: Record<string, Function> = {};
  return {
    socket: {
      id,
      on: jest.fn((event: string, handler: Function) => { handlers[event] = handler; }),
      emit: jest.fn(),
    } as any,
    handlers,
  };
}

function makeGame(overrides: Record<string, any> = {}) {
  return {
    gameCode: 'GAME1',
    hostSocketId: 'socket-host',
    hostUsername: 'Host',
    users: {
      Host: { socketId: 'socket-host', isHost: true, disconnected: false, isBot: false },
      Player1: { socketId: 'socket-p1', isHost: false, disconnected: false, isBot: false },
    },
    gameState: 'waiting',
    ...overrides,
  };
}

describe('hostHandler', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers hostKeepAlive and hostReactivate handlers', () => {
    const { socket } = createMockSocket();
    registerHostHandlers(mockIo, socket);
    expect(socket.on).toHaveBeenCalledWith('hostKeepAlive', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('hostReactivate', expect.any(Function));
  });

  // ─── hostKeepAlive ───
  describe('hostKeepAlive', () => {
    it('marks host active when sender is host', () => {
      const { socket, handlers } = createMockSocket();
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame());

      handlers['hostKeepAlive']();

      expect(mockMarkHostActive).toHaveBeenCalledWith('GAME1');
    });

    it('does nothing when socket has no game', () => {
      const { socket, handlers } = createMockSocket();
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue(null);

      handlers['hostKeepAlive']();

      expect(mockGetGame).not.toHaveBeenCalled();
      expect(mockMarkHostActive).not.toHaveBeenCalled();
    });

    it('does nothing when game does not exist', () => {
      const { socket, handlers } = createMockSocket();
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(null);

      handlers['hostKeepAlive']();

      expect(mockMarkHostActive).not.toHaveBeenCalled();
    });

    it('does nothing when sender is not host', () => {
      const { socket, handlers } = createMockSocket('socket-p1');
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame());

      handlers['hostKeepAlive']();

      expect(mockMarkHostActive).not.toHaveBeenCalled();
    });
  });

  // ─── hostReactivate ───
  describe('hostReactivate', () => {
    it('reactivates host and emits success when sender is host', () => {
      const { socket, handlers } = createMockSocket();
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame());
      mockReactivateHost.mockReturnValue(true);

      handlers['hostReactivate']();

      expect(mockReactivateHost).toHaveBeenCalledWith('GAME1');
      expect(socket.emit).toHaveBeenCalledWith('hostReactivated', { success: true });
    });

    it('does nothing when socket has no game', () => {
      const { socket, handlers } = createMockSocket();
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue(null);

      handlers['hostReactivate']();

      expect(mockGetGame).not.toHaveBeenCalled();
      expect(mockReactivateHost).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('does nothing when game does not exist', () => {
      const { socket, handlers } = createMockSocket();
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(null);

      handlers['hostReactivate']();

      expect(mockReactivateHost).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('does nothing when sender is not host', () => {
      const { socket, handlers } = createMockSocket('socket-p1');
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame());

      handlers['hostReactivate']();

      expect(mockReactivateHost).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('emits success even when reactivateHost returns false', () => {
      const { socket, handlers } = createMockSocket();
      registerHostHandlers(mockIo, socket);

      mockGetGameBySocketId.mockReturnValue('GAME1');
      mockGetGame.mockReturnValue(makeGame());
      mockReactivateHost.mockReturnValue(false);

      handlers['hostReactivate']();

      expect(mockReactivateHost).toHaveBeenCalledWith('GAME1');
      // The handler always emits success:true regardless of reactivateHost return
      expect(socket.emit).toHaveBeenCalledWith('hostReactivated', { success: true });
    });
  });
});
