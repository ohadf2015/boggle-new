/**
 * presenceHandler tests (Q-1)
 * Covers: presenceUpdate, presenceHeartbeat, ping/pong, connection health check
 */

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  __esModule: true,
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
  updateUserPresence: vi.fn(),
  updateUserHeartbeat: vi.fn(),
  forEachGame: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  volatileBroadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((code: string) => `game:${code}`),
}));

vi.mock('./../../handlers/kickHandler', () => ({
  checkAutoKickInactive: vi.fn(),
  checkAfkWarnings: vi.fn(),
}));

vi.mock('../../utils/socketValidation', () => ({
  validatePayload: vi.fn().mockReturnValue({ success: true, data: {} }),
  presenceUpdateSchema: {},
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { registerPresenceHandlers, startConnectionHealthCheck, stopConnectionHealthCheck } from '../presenceHandler';
import { getGame, getGameBySocketId, getUsernameBySocketId, updateUserPresence, updateUserHeartbeat, forEachGame } from '../../modules/gameStateManager';
import logger from '../../utils/logger';
import { volatileBroadcastToRoom } from '../../utils/socketHelpers';
import { checkRateLimit } from '../../utils/rateLimiter';
import { validatePayload } from '../../utils/socketValidation';

const mockGetGame = getGame as MockedFunction<typeof getGame>;
const mockGetGameBySocketId = getGameBySocketId as MockedFunction<typeof getGameBySocketId>;
const mockGetUsernameBySocketId = getUsernameBySocketId as MockedFunction<typeof getUsernameBySocketId>;
const mockUpdateUserPresence = updateUserPresence as MockedFunction<typeof updateUserPresence>;
const mockUpdateUserHeartbeat = updateUserHeartbeat as MockedFunction<typeof updateUserHeartbeat>;
const mockVolatileBroadcast = volatileBroadcastToRoom as MockedFunction<typeof volatileBroadcastToRoom>;
const mockCheckRateLimit = checkRateLimit as MockedFunction<typeof checkRateLimit>;
const mockValidatePayload = validatePayload as MockedFunction<typeof validatePayload>;

function createTestHarness() {
  const handlers = new Map<string, Function>();
  const socket: any = {
    id: 'socket-1',
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
  };
  const io: any = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  };

  registerPresenceHandlers(io, socket);

  const trigger = (event: string, data?: any) => {
    const handler = handlers.get(event);
    if (!handler) throw new Error(`No handler for ${event}`);
    return handler(data);
  };

  return { socket, io, trigger, handlers };
}

describe('presenceHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockGetGameBySocketId.mockReturnValue('GAME01');
    mockGetUsernameBySocketId.mockReturnValue('TestUser');
    mockGetGame.mockReturnValue({ users: {} } as any);
  });

  it('should register all presence event handlers', () => {
    const { handlers } = createTestHarness();
    expect(handlers.has('ping')).toBe(true);
    expect(handlers.has('presenceUpdate')).toBe(true);
    expect(handlers.has('presenceHeartbeat')).toBe(true);
    expect(handlers.has('latencyCheck')).toBe(true);
  });

  describe('ping', () => {
    it('should respond with pong', () => {
      const { socket, trigger } = createTestHarness();
      trigger('ping');
      expect(socket.emit).toHaveBeenCalledWith('pong');
    });
  });

  describe('presenceUpdate', () => {
    it('should update presence and broadcast to room', () => {
      mockValidatePayload.mockReturnValue({
        success: true,
        data: { isActive: true, isWindowFocused: true },
      } as any);

      const { trigger } = createTestHarness();
      trigger('presenceUpdate', { isActive: true, isWindowFocused: true });

      expect(mockUpdateUserPresence).toHaveBeenCalledWith(
        'GAME01',
        'TestUser',
        expect.objectContaining({ isWindowFocused: true }),
      );

      expect(mockVolatileBroadcast).toHaveBeenCalledWith(
        expect.anything(),
        'game:GAME01',
        'userPresenceChanged',
        expect.objectContaining({
          username: 'TestUser',
          status: 'active',
        }),
      );
    });

    it('should derive idle status when isIdle is true (R-10 fix)', () => {
      mockValidatePayload.mockReturnValue({
        success: true,
        data: { isIdle: true, isWindowFocused: false },
      } as any);

      const { trigger } = createTestHarness();
      trigger('presenceUpdate', { isIdle: true, isWindowFocused: false });

      expect(mockVolatileBroadcast).toHaveBeenCalledWith(
        expect.anything(),
        'game:GAME01',
        'userPresenceChanged',
        expect.objectContaining({ status: 'idle' }),
      );
    });

    it('should reject when rate limited', () => {
      mockCheckRateLimit.mockReturnValue(false);
      const { trigger } = createTestHarness();
      trigger('presenceUpdate', { isActive: true });
      expect(mockUpdateUserPresence).not.toHaveBeenCalled();
    });

    it('should skip when not in a game', () => {
      mockGetGameBySocketId.mockReturnValue(null as any);
      mockValidatePayload.mockReturnValue({ success: true, data: {} } as any);

      const { trigger } = createTestHarness();
      trigger('presenceUpdate', { isActive: true });
      expect(mockUpdateUserPresence).not.toHaveBeenCalled();
    });
  });

  describe('presenceHeartbeat', () => {
    it('should record heartbeat for user in game', () => {
      const { trigger } = createTestHarness();
      trigger('presenceHeartbeat');

      expect(mockUpdateUserHeartbeat).toHaveBeenCalledWith('GAME01', 'TestUser');
    });

    it('should skip when not in a game', () => {
      mockGetGameBySocketId.mockReturnValue(null as any);
      const { trigger } = createTestHarness();
      trigger('presenceHeartbeat');
      expect(mockUpdateUserHeartbeat).not.toHaveBeenCalled();
    });
  });

  describe('startConnectionHealthCheck stale dedup', () => {
    afterEach(() => {
      stopConnectionHealthCheck();
      vi.useRealTimers();
    });

    it('logs stale user once per stale span, not every tick', () => {
      vi.useFakeTimers();
      const now = Date.now();
      const staleHeartbeat = now - 120_000; // 2 min ago (past 60s threshold)
      const gameUsers: Record<string, any> = {
        Alice: { disconnected: false, isBot: false, lastHeartbeat: staleHeartbeat },
      };
      (forEachGame as any).mockImplementation((cb: any) => {
        cb('GAME01', { users: gameUsers });
      });

      const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
      const infoSpy = (logger as any).info as Mock;
      infoSpy.mockClear();

      startConnectionHealthCheck(io);

      // Advance 3 ticks (90s) — should only log once for same stale span
      vi.advanceTimersByTime(30_000);
      vi.advanceTimersByTime(30_000);
      vi.advanceTimersByTime(30_000);

      const staleLogs = infoSpy.mock.calls.filter((c: any[]) =>
        String(c[1] || '').startsWith('Stale user Alice'),
      );
      expect(staleLogs.length).toBe(1);
    });

    it('re-logs after heartbeat recovers and goes stale again', () => {
      vi.useFakeTimers();
      const gameUsers: Record<string, any> = {
        Alice: { disconnected: false, isBot: false, lastHeartbeat: Date.now() - 120_000 },
      };
      (forEachGame as any).mockImplementation((cb: any) => {
        cb('GAME01', { users: gameUsers });
      });

      const io: any = { to: vi.fn().mockReturnThis(), emit: vi.fn() };
      const infoSpy = (logger as any).info as Mock;
      infoSpy.mockClear();

      startConnectionHealthCheck(io);

      vi.advanceTimersByTime(30_000); // log #1
      // Recover
      gameUsers.Alice.lastHeartbeat = Date.now();
      vi.advanceTimersByTime(30_000); // no log, flag resets
      // Go stale again
      gameUsers.Alice.lastHeartbeat = Date.now() - 120_000;
      vi.advanceTimersByTime(30_000); // log #2

      const staleLogs = infoSpy.mock.calls.filter((c: any[]) =>
        String(c[1] || '').startsWith('Stale user Alice'),
      );
      expect(staleLogs.length).toBe(2);
    });
  });

  describe('latencyCheck', () => {
    it('should invoke callback for RTT measurement', () => {
      const { trigger } = createTestHarness();
      const callback = vi.fn();
      const handler = (trigger as any);

      // latencyCheck passes data + callback
      const handlers = new Map<string, Function>();
      const socket: any = {
        id: 'socket-1',
        emit: vi.fn(),
        on: vi.fn((event: string, h: Function) => { handlers.set(event, h); }),
      };
      registerPresenceHandlers({} as any, socket);
      const latencyHandler = handlers.get('latencyCheck')!;
      latencyHandler({ t: Date.now() }, callback);

      expect(callback).toHaveBeenCalled();
    });
  });
});
