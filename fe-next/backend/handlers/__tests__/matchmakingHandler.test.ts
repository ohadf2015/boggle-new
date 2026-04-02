import { registerMatchmakingHandlers } from '../matchmakingHandler';
import { MatchmakingQueue } from '../../services/matchmakingQueue';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

function createMockSocket(id = 'socket-1') {
  const handlers: Record<string, Function> = {};
  const userId = `user-${id}`;
  return {
    id,
    on: jest.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }),
    emit: jest.fn(),
    _handlers: handlers,
    data: { verifiedUserId: userId },
    handshake: { auth: { authUserId: userId } },
  };
}

function createMockIo() {
  const mockSocket = {
    emit: jest.fn(),
  };
  return {
    to: jest.fn(() => mockSocket),
    _mockSocket: mockSocket,
  };
}

describe('matchmakingHandler', () => {
  let io: ReturnType<typeof createMockIo>;
  let socket: ReturnType<typeof createMockSocket>;
  let queue: MatchmakingQueue;

  beforeEach(() => {
    jest.useFakeTimers();
    io = createMockIo();
    socket = createMockSocket('socket-1');
    queue = new MatchmakingQueue();
    registerMatchmakingHandlers(io as any, socket as any, queue);
  });

  afterEach(() => {
    jest.useRealTimers();
    queue.destroy();
  });

  it('joinMatchmaking adds player to queue', () => {
    socket._handlers['joinMatchmaking']({
      gameMode: 'classic',
      language: 'en',
      elo: 1200,
      playerId: 'player-1',
    });

    const stats = queue.getQueueStats();
    expect(stats.playersInQueue).toBe(1);
  });

  it('leaveMatchmaking removes player from queue', () => {
    socket._handlers['joinMatchmaking']({
      gameMode: 'classic',
      language: 'en',
      elo: 1200,
      playerId: 'player-1',
    });

    socket._handlers['leaveMatchmaking']();

    const stats = queue.getQueueStats();
    expect(stats.playersInQueue).toBe(0);
  });

  it('matched players receive matchFound event', () => {
    // Player 1 joins
    const socket1 = createMockSocket('socket-1');
    const socket2 = createMockSocket('socket-2');
    const sharedQueue = new MatchmakingQueue();

    registerMatchmakingHandlers(io as any, socket1 as any, sharedQueue);
    registerMatchmakingHandlers(io as any, socket2 as any, sharedQueue);

    socket1._handlers['joinMatchmaking']({
      gameMode: 'classic',
      language: 'en',
      elo: 1200,
      playerId: 'player-1',
    });

    socket2._handlers['joinMatchmaking']({
      gameMode: 'classic',
      language: 'en',
      elo: 1210,
      playerId: 'player-2',
    });

    // Advance past the matching interval (2s)
    jest.advanceTimersByTime(2000);

    // Both sockets should receive matchFound via io.to(socketId).emit
    const toCalls = io.to.mock.calls;
    const matchFoundCalls = toCalls.filter((_: any, i: number) => {
      const emitCall = io._mockSocket.emit.mock.calls[i];
      return emitCall && emitCall[0] === 'matchFound';
    });

    // At least one matchFound should have been emitted
    expect(io._mockSocket.emit).toHaveBeenCalledWith(
      'matchFound',
      expect.objectContaining({
        roomId: expect.any(String),
      })
    );

    sharedQueue.destroy();
  });

  it('timeout fires after 60s', () => {
    socket._handlers['joinMatchmaking']({
      gameMode: 'classic',
      language: 'en',
      elo: 1200,
      playerId: 'player-1',
    });

    // Advance 60 seconds
    jest.advanceTimersByTime(60000);

    expect(socket.emit).toHaveBeenCalledWith('matchmakingTimeout');
  });

  it('disconnect cleans up queue entry', () => {
    socket._handlers['joinMatchmaking']({
      gameMode: 'classic',
      language: 'en',
      elo: 1200,
      playerId: 'player-1',
    });

    socket._handlers['disconnect']();

    const stats = queue.getQueueStats();
    expect(stats.playersInQueue).toBe(0);
  });
});
