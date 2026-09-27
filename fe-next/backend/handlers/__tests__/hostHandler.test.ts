import { vi, type Mock, type MockInstance } from 'vitest';
import { registerHostHandlers } from '../hostHandler';
import {
  getGame,
  getGameBySocketId,
  markHostActive,
  reactivateHost,
} from '../../modules/gameStateManager';

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));
vi.mock('../../modules/gameStateManager');

const mockGetGame = getGame as Mock;
const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockMarkHostActive = markHostActive as Mock;
const mockReactivateHost = reactivateHost as Mock;

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

function makeGame(overrides: Record<string, any> = {}): any {
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

function createMockIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  return { io: { to } as any, to, emit };
}

describe('hostHandler', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers hostKeepAlive, hostReactivate, and changeRoomLanguage handlers', () => {
    const { socket } = createMockSocket();
    registerHostHandlers(mockIo, socket);
    expect(socket.on).toHaveBeenCalledWith('hostKeepAlive', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('hostReactivate', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('changeRoomLanguage', expect.any(Function));
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

  // ─── changeRoomLanguage ───
  describe('changeRoomLanguage', () => {
    it('updates game.language and broadcasts roomLanguageChanged when host with valid language', () => {
      const { socket, handlers } = createMockSocket();
      const { io, to, emit } = createMockIo();
      registerHostHandlers(io, socket);

      const game = makeGame({ language: 'en' });
      mockGetGame.mockReturnValue(game);

      handlers['changeRoomLanguage']({ gameCode: 'GAME1', language: 'he' });

      expect(game.language).toBe('he');
      expect(to).toHaveBeenCalledWith('GAME1');
      expect(emit).toHaveBeenCalledWith('roomLanguageChanged', {
        language: 'he',
        changedBy: 'Host',
      });
    });

    it('rejects when game does not exist', () => {
      const { socket, handlers } = createMockSocket();
      const { io, emit } = createMockIo();
      registerHostHandlers(io, socket);

      mockGetGame.mockReturnValue(null);

      handlers['changeRoomLanguage']({ gameCode: 'GAME1', language: 'he' });

      expect(emit).not.toHaveBeenCalled();
    });

    it('rejects when sender is not host', () => {
      const { socket, handlers } = createMockSocket('socket-p1');
      const { io, emit } = createMockIo();
      registerHostHandlers(io, socket);

      const game = makeGame({ language: 'en' });
      mockGetGame.mockReturnValue(game);

      handlers['changeRoomLanguage']({ gameCode: 'GAME1', language: 'he' });

      expect(game.language).toBe('en');
      expect(emit).not.toHaveBeenCalled();
    });

    it('rejects unknown language values', () => {
      const { socket, handlers } = createMockSocket();
      const { io, emit } = createMockIo();
      registerHostHandlers(io, socket);

      const game = makeGame({ language: 'en' });
      mockGetGame.mockReturnValue(game);

      handlers['changeRoomLanguage']({ gameCode: 'GAME1', language: 'xx' });

      expect(game.language).toBe('en');
      expect(emit).not.toHaveBeenCalled();
    });

    it('rejects when payload missing gameCode or language', () => {
      const { socket, handlers } = createMockSocket();
      const { io, emit } = createMockIo();
      registerHostHandlers(io, socket);

      handlers['changeRoomLanguage']({});
      handlers['changeRoomLanguage']({ gameCode: 'GAME1' });
      handlers['changeRoomLanguage']({ language: 'he' });

      expect(emit).not.toHaveBeenCalled();
    });

    it('rejects when game is in-progress (no mid-game language change)', () => {
      const { socket, handlers } = createMockSocket();
      const { io, emit } = createMockIo();
      registerHostHandlers(io, socket);

      const game = makeGame({ language: 'en', gameState: 'in-progress' });
      mockGetGame.mockReturnValue(game);

      handlers['changeRoomLanguage']({ gameCode: 'GAME1', language: 'he' });

      expect(game.language).toBe('en');
      expect(emit).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });

    it('rejects when game is finished', () => {
      const { socket, handlers } = createMockSocket();
      const { io, emit } = createMockIo();
      registerHostHandlers(io, socket);

      const game = makeGame({ language: 'en', gameState: 'finished' });
      mockGetGame.mockReturnValue(game);

      handlers['changeRoomLanguage']({ gameCode: 'GAME1', language: 'he' });

      expect(game.language).toBe('en');
      expect(emit).not.toHaveBeenCalled();
      expect(socket.emit).not.toHaveBeenCalled();
    });
  });
});
