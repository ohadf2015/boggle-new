import { registerReactionHandlers } from '../reactionHandler';
import { getGameBySocketId, getUsernameBySocketId } from '../../modules/gameStateManager';
import { getGameRoom } from '../../utils/socketHelpers';
import { checkRateLimit } from '../../utils/rateLimiter';
import { isSocketMigrating } from '../shared';

jest.mock('../../modules/gameStateManager');
jest.mock('../../utils/socketHelpers');
jest.mock('../../utils/rateLimiter');
jest.mock('../../utils/metrics', () => ({ inc: jest.fn() }));
jest.mock('../shared');
jest.mock('../../middleware/rateLimiterRedis', () => ({
  checkSocketRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

const mockGetGameBySocketId = getGameBySocketId as jest.Mock;
const mockGetUsernameBySocketId = getUsernameBySocketId as jest.Mock;
const mockGetGameRoom = getGameRoom as jest.Mock;
const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockIsSocketMigrating = isSocketMigrating as jest.Mock;

function createMockSocket() {
  const handlers: Record<string, Function> = {};
  const toEmit = jest.fn();
  return {
    socket: {
      id: 'socket-123',
      on: jest.fn((event: string, handler: Function) => { handlers[event] = handler; }),
      to: jest.fn(() => ({ emit: toEmit })),
      emit: jest.fn(),
    },
    handlers,
    toEmit,
  };
}

describe('reactionHandler', () => {
  const mockIo = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
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
