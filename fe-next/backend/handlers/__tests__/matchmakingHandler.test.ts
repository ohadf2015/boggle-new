import { vi, type Mock, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { registerMatchmakingHandlers } from '../matchmakingHandler';
import { MatchmakingQueue } from '../../services/matchmakingQueue';

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
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

vi.mock('../../config/rankedMatchmaking', async () => {
  const actual = await vi.importActual<typeof import('../../config/rankedMatchmaking')>(
    '../../config/rankedMatchmaking',
  );
  return {
    ...actual,
    isRankedMatchmakingEnabled: vi.fn(() => true),
  };
});

import { isRankedMatchmakingEnabled } from '../../config/rankedMatchmaking';

function createMockSocket(id = 'socket-1', verified = true) {
  const handlers: Record<string, Function> = {};
  const userId = `user-${id}`;
  return {
    id,
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }),
    emit: vi.fn(),
    _handlers: handlers,
    data: verified ? { verifiedUserId: userId } : {},
    handshake: { auth: { authUserId: userId } },
  };
}

function createMockIo(sockets: Map<string, ReturnType<typeof createMockSocket>>) {
  const mockSocket = { emit: vi.fn() };
  return {
    to: vi.fn(() => mockSocket),
    _mockSocket: mockSocket,
    sockets: { sockets },
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

describe('matchmakingHandler', () => {
  let queue: MatchmakingQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFrom.mockReset();
    mockEligible();
    (isRankedMatchmakingEnabled as unknown as Mock).mockReturnValue(true);
    queue = new MatchmakingQueue();
  });

  afterEach(() => {
    vi.useRealTimers();
    queue.destroy();
  });

  it('rejects join when RANKED_MATCHMAKING_ENABLED is off (client cannot bypass)', async () => {
    (isRankedMatchmakingEnabled as unknown as Mock).mockReturnValue(false);
    const socket = createMockSocket('socket-1');
    const io = createMockIo(new Map([[socket.id, socket]]));
    registerMatchmakingHandlers(io as any, socket as any, queue);
    await socket._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    expect(socket.emit).toHaveBeenCalledWith(
      'matchmakingError',
      expect.objectContaining({ error: 'DISABLED' }),
    );
    expect(queue.getQueueStats().playersInQueue).toBe(0);
  });

  it('rejects handshake-only auth (spoofable authUserId)', async () => {
    const socket = createMockSocket('socket-1', false);
    const io = createMockIo(new Map([[socket.id, socket]]));
    registerMatchmakingHandlers(io as any, socket as any, queue);
    await socket._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    expect(socket.emit).toHaveBeenCalledWith(
      'matchmakingError',
      expect.objectContaining({ error: 'UNAUTHORIZED' }),
    );
    expect(queue.getQueueStats().playersInQueue).toBe(0);
  });

  it('joinMatchmaking adds eligible verified player to queue', async () => {
    const socket = createMockSocket('socket-1');
    const io = createMockIo(new Map([[socket.id, socket]]));
    registerMatchmakingHandlers(io as any, socket as any, queue);
    await socket._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    expect(queue.getQueueStats().playersInQueue).toBe(1);
  });

  it('stamps host/joiner tickets on matchFound', async () => {
    const socket1 = createMockSocket('socket-1');
    const socket2 = createMockSocket('socket-2');
    const sockets = new Map([[socket1.id, socket1], [socket2.id, socket2]]);
    const io = createMockIo(sockets);
    registerMatchmakingHandlers(io as any, socket1 as any, queue);
    registerMatchmakingHandlers(io as any, socket2 as any, queue);

    await socket1._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    await socket2._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    await vi.advanceTimersByTimeAsync(2000);

    expect(socket1.data.rankedMatchTicket).toEqual(
      expect.objectContaining({ role: 'host', playerId: 'user-socket-1', opponentId: 'user-socket-2' }),
    );
    expect(socket2.data.rankedMatchTicket).toEqual(
      expect.objectContaining({ role: 'joiner', playerId: 'user-socket-2', opponentId: 'user-socket-1' }),
    );
    expect(socket1.data.rankedMatchTicket.roomId).toMatch(/^[A-Za-z0-9]{6,10}$/);
    expect(socket1.data.rankedMatchTicket.roomId).toBe(socket2.data.rankedMatchTicket.roomId);
  });

  it('leaveMatchmaking clears queue entry and ticket', async () => {
    const socket = createMockSocket('socket-1');
    const io = createMockIo(new Map([[socket.id, socket]]));
    registerMatchmakingHandlers(io as any, socket as any, queue);
    await socket._handlers['joinMatchmaking']({ gameMode: 'classic', language: 'en' });
    socket.data.rankedMatchTicket = { roomId: 'X', role: 'host', playerId: 'u', opponentId: 'o', expiresAt: Date.now() + 9999 };
    socket._handlers['leaveMatchmaking']();
    expect(queue.getQueueStats().playersInQueue).toBe(0);
    expect(socket.data.rankedMatchTicket).toBeNull();
  });
});
