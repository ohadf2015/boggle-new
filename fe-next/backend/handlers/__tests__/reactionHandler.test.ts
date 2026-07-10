import { vi, type Mock, type MockInstance } from 'vitest';
import { registerReactionHandlers } from '../reactionHandler';
import { getGameBySocketId, getUsernameBySocketId } from '../../modules/gameStateManager';
import { getGameRoom } from '../../utils/socketHelpers';
import { checkRateLimit } from '../../utils/rateLimiter';
import { isSocketMigrating } from '../shared';

vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/socketHelpers');
vi.mock('../../utils/rateLimiter', () => ({ default: { checkRateLimit: vi.fn().mockReturnValue(true), checkRateLimitDetailed: vi.fn().mockReturnValue({ allowed: true }), initRateLimit: vi.fn(), getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1') }, checkRateLimit: vi.fn().mockReturnValue(true), checkRateLimitDetailed: vi.fn().mockReturnValue({ allowed: true }), initRateLimit: vi.fn(), getIpFromSocket: vi.fn().mockReturnValue('127.0.0.1') }));
vi.mock('../../utils/metrics', () => ({ inc: vi.fn() }));
vi.mock('../shared');
vi.mock('../../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

const mockGetGameBySocketId = getGameBySocketId as Mock;
const mockGetUsernameBySocketId = getUsernameBySocketId as Mock;
const mockGetGameRoom = getGameRoom as Mock;
const mockCheckRateLimit = checkRateLimit as Mock;
const mockIsSocketMigrating = isSocketMigrating as Mock;

function createMockSocket() {
  const handlers: Record<string, Function> = {};
  const toEmit = vi.fn();
  return {
    socket: {
      id: 'socket-123',
      on: vi.fn((event: string, handler: Function) => { handlers[event] = handler; }),
      to: vi.fn(() => ({ emit: toEmit })),
      emit: vi.fn(),
    },
    handlers,
    toEmit,
  };
}

describe('reactionHandler', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue(true);
    mockIsSocketMigrating.mockReturnValue(false);
    mockGetGameBySocketId.mockReturnValue('GAME1');
    mockGetUsernameBySocketId.mockReturnValue('Alice');
    mockGetGameRoom.mockReturnValue('game:GAME1');
  });

  it('should register quickReaction handler', () => {
    const { socket } = createMockSocket();
    registerReactionHandlers(mockIo, socket as any);
    expect(socket.on).toHaveBeenCalledWith('quickReaction', expect.any(Function));
  });

  it('should broadcast valid reaction to room', async () => {
    const { socket, handlers, toEmit } = createMockSocket();
    registerReactionHandlers(mockIo, socket as any);

    await handlers['quickReaction']({ reactionId: 'fire', username: 'Alice' });

    expect(socket.to).toHaveBeenCalledWith('game:GAME1');
    expect(toEmit).toHaveBeenCalledWith('quickReaction', { reactionId: 'fire', username: 'Alice' });
  });

  it('should use server-side username not client-sent', async () => {
    const { socket, handlers, toEmit } = createMockSocket();
    registerReactionHandlers(mockIo, socket as any);

    // Client sends spoofed username
    await handlers['quickReaction']({ reactionId: 'clap', username: 'FakeUser' });

    expect(toEmit).toHaveBeenCalledWith('quickReaction', { reactionId: 'clap', username: 'Alice' });
  });

  it('should broadcast the love reaction (heart)', async () => {
    const { socket, handlers, toEmit } = createMockSocket();
    registerReactionHandlers(mockIo, socket as any);

    await handlers['quickReaction']({ reactionId: 'love', username: 'Alice' });

    expect(toEmit).toHaveBeenCalledWith('quickReaction', { reactionId: 'love', username: 'Alice' });
  });

  it('should reject invalid reactionId', () => {
    const { socket, handlers, toEmit } = createMockSocket();
    registerReactionHandlers(mockIo, socket as any);

    handlers['quickReaction']({ reactionId: 'invalid', username: 'Alice' });

    expect(toEmit).not.toHaveBeenCalled();
  });

  it('should skip when rate limited', () => {
    mockCheckRateLimit.mockReturnValue(false);
    const { socket, handlers, toEmit } = createMockSocket();
    registerReactionHandlers(mockIo, socket as any);

    handlers['quickReaction']({ reactionId: 'fire', username: 'Alice' });

    expect(toEmit).not.toHaveBeenCalled();
  });

  it('should skip when socket is migrating', () => {
    mockIsSocketMigrating.mockReturnValue(true);
    const { socket, handlers, toEmit } = createMockSocket();
    registerReactionHandlers(mockIo, socket as any);

    handlers['quickReaction']({ reactionId: 'fire', username: 'Alice' });

    expect(toEmit).not.toHaveBeenCalled();
  });

  it('should skip when player not in a game', () => {
    mockGetGameBySocketId.mockReturnValue(null);
    const { socket, handlers, toEmit } = createMockSocket();
    registerReactionHandlers(mockIo, socket as any);

    handlers['quickReaction']({ reactionId: 'fire', username: 'Alice' });

    expect(toEmit).not.toHaveBeenCalled();
  });
});
