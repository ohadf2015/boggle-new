/**
 * presenceHandler tests (Q-1)
 * Covers: presenceUpdate, presenceHeartbeat, ping/pong, connection health check
 */

jest.mock('../../utils/logger', () => {
  const l = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
  return { __esModule: true, default: l, ...l };
});

jest.mock('../../utils/rateLimiter', () => ({
  __esModule: true,
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

jest.mock('../../modules/gameStateManager', () => ({
  getGame: jest.fn(),
  getGameBySocketId: jest.fn(),
  getUsernameBySocketId: jest.fn(),
  updateUserPresence: jest.fn(),
  updateUserHeartbeat: jest.fn(),
  forEachGame: jest.fn(),
}));

jest.mock('../../utils/socketHelpers', () => ({
  volatileBroadcastToRoom: jest.fn(),
  getGameRoom: jest.fn((code: string) => `game:${code}`),
}));

jest.mock('./../../handlers/kickHandler', () => ({
  checkAutoKickInactive: jest.fn(),
}));

jest.mock('../../utils/socketValidation', () => ({
  validatePayload: jest.fn().mockReturnValue({ success: true, data: {} }),
  presenceUpdateSchema: {},
}));

import { registerPresenceHandlers } from '../presenceHandler';
import { getGame, getGameBySocketId, getUsernameBySocketId, updateUserPresence, updateUserHeartbeat } from '../../modules/gameStateManager';
import { volatileBroadcastToRoom } from '../../utils/socketHelpers';
import { checkRateLimit } from '../../utils/rateLimiter';
import { validatePayload } from '../../utils/socketValidation';

const mockGetGame = getGame as jest.MockedFunction<typeof getGame>;
const mockGetGameBySocketId = getGameBySocketId as jest.MockedFunction<typeof getGameBySocketId>;
const mockGetUsernameBySocketId = getUsernameBySocketId as jest.MockedFunction<typeof getUsernameBySocketId>;
const mockUpdateUserPresence = updateUserPresence as jest.MockedFunction<typeof updateUserPresence>;
const mockUpdateUserHeartbeat = updateUserHeartbeat as jest.MockedFunction<typeof updateUserHeartbeat>;
const mockVolatileBroadcast = volatileBroadcastToRoom as jest.MockedFunction<typeof volatileBroadcastToRoom>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockValidatePayload = validatePayload as jest.MockedFunction<typeof validatePayload>;

function createTestHarness() {
  const handlers = new Map<string, Function>();
  const socket: any = {
    id: 'socket-1',
    emit: jest.fn(),
    on: jest.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
  };
  const io: any = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
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
    jest.clearAllMocks();
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

  describe('latencyCheck', () => {
    it('should invoke callback for RTT measurement', () => {
      const { trigger } = createTestHarness();
      const callback = jest.fn();
      const handler = (trigger as any);

      // latencyCheck passes data + callback
      const handlers = new Map<string, Function>();
      const socket: any = {
        id: 'socket-1',
        emit: jest.fn(),
        on: jest.fn((event: string, h: Function) => { handlers.set(event, h); }),
      };
      registerPresenceHandlers({} as any, socket);
      const latencyHandler = handlers.get('latencyCheck')!;
      latencyHandler({ t: Date.now() }, callback);

      expect(callback).toHaveBeenCalled();
    });
  });
});
