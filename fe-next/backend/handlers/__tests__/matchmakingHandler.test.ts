import { vi, type Mock } from 'vitest';
import { registerMatchmakingHandlers } from '../matchmakingHandler';
import { MatchmakingQueue } from '../../services/matchmakingQueue';

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

vi.mock('../../utils/rateLimiter', () => ({
  checkRateLimit: () => true,
}));

vi.mock('../../utils/socketValidation', () => ({
  validatePayload: (_schema: unknown, raw: unknown) => ({ success: true, data: raw }),
}));

const mockFrom = vi.fn();
vi.mock('../../modules/supabase/client', () => ({
  getSupabase: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/ranked/tiers', () => ({
  getTierFromElo: () => ({ id: 'silver', name: 'Silver' }),
}));

function createMockSocket(id = 'socket-1') {
  const handlers: Record<string, Function> = {};
  const userId = `user-${id}`;
  return {
    id,
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }),
    emit: vi.fn(),
    _handlers: handlers,
    data: { verifiedUserId: userId },
    handshake: { auth: { authUserId: userId } },
  };
}

function createMockIo() {
  const mockSocket = { emit: vi.fn() };
  return {
    to: vi.fn(() => mockSocket),
    _mockSocket: mockSocket,
  };
}

function mockEligible() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'ranked_progress') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { casual_games_played: 12, unlocked_at: null } }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { ranked_mmr: 1200 } }),
        }),
      }),
    };
  });
}

function mockIneligible() {
  mockFrom.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: { casual_games_played: 2, unlocked_at: null } }),
        single: async () => ({ data: { ranked_mmr: 1000 } }),
      }),
    }),
  }));
}

describe('matchmakingHandler', () => {
  let io: ReturnType<typeof createMockIo>;
  let socket: ReturnType<typeof createMockSocket>;
  let queue: MatchmakingQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFrom.mockReset();
    mockEligible();
    io = createMockIo();
    socket = createMockSocket('socket-1');
    queue = new MatchmakingQueue();
    registerMatchmakingHandlers(io as any, socket as any, queue);
  });

  afterEach(() => {
    vi.useRealTimers();
    queue.destroy();
  });

  it('joinMatchmaking adds eligible player to queue', async () => {
    await socket._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    expect(queue.getQueueStats().playersInQueue).toBe(1);
    expect(socket.emit).toHaveBeenCalledWith(
      'matchmakingUpdate',
      expect.objectContaining({ queueSize: 1, eloRange: expect.any(Number) }),
    );
  });

  it('rejects unauthenticated join', async () => {
    socket.data = {};
    socket.handshake = { auth: {} };
    registerMatchmakingHandlers(io as any, socket as any, queue);
    await socket._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    expect(socket.emit).toHaveBeenCalledWith(
      'matchmakingError',
      expect.objectContaining({ error: 'UNAUTHORIZED' }),
    );
    expect(queue.getQueueStats().playersInQueue).toBe(0);
  });

  it('rejects players who have not unlocked ranked', async () => {
    mockIneligible();
    await socket._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    expect(socket.emit).toHaveBeenCalledWith(
      'matchmakingError',
      expect.objectContaining({ error: 'NOT_ELIGIBLE' }),
    );
    expect(queue.getQueueStats().playersInQueue).toBe(0);
  });

  it('leaveMatchmaking removes player from queue', async () => {
    await socket._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    socket._handlers['leaveMatchmaking']();
    expect(queue.getQueueStats().playersInQueue).toBe(0);
  });

  it('matched players receive matchFound with host/joiner roles', async () => {
    const socket1 = createMockSocket('socket-1');
    const socket2 = createMockSocket('socket-2');
    const sharedQueue = new MatchmakingQueue();
    registerMatchmakingHandlers(io as any, socket1 as any, sharedQueue);
    registerMatchmakingHandlers(io as any, socket2 as any, sharedQueue);

    await socket1._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    await socket2._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });

    await vi.advanceTimersByTimeAsync(2000);

    expect(io.to).toHaveBeenCalled();
    const emits = (io._mockSocket.emit as Mock).mock.calls.filter((c) => c[0] === 'matchFound');
    expect(emits.length).toBeGreaterThanOrEqual(1);
    const payload = emits[0][1] as { role: string; opponent: { username: string; elo: number } };
    expect(['host', 'joiner']).toContain(payload.role);
    expect(payload.opponent).toEqual(
      expect.objectContaining({ username: expect.any(String), elo: expect.any(Number) }),
    );
  });
});
