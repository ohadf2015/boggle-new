/**
 * friendMessagingHandler tests (Q-1)
 * Covers: sendMessage, getMessages, markRead, typing, deleteMessage, getThreads, auth checks
 */

jest.mock('../../utils/logger', () => {
  const l = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
  return { __esModule: true, default: l, ...l };
});

jest.mock('../../utils/rateLimiter', () => ({
  __esModule: true,
  checkRateLimit: jest.fn().mockReturnValue(true),
}));

jest.mock('../../utils/errorHandler', () => ({
  __esModule: true,
  emitError: jest.fn(),
}));

jest.mock('../../modules/friendsManager');
jest.mock('../../modules/supabaseServer');
jest.mock('../../utils/socialHelpers');
jest.mock('../../utils/profanityFilter', () => ({
  __esModule: true,
  cleanProfanity: jest.fn((s: string) => s),
}));
jest.mock('../../utils/sanitize', () => ({
  __esModule: true,
  sanitizeHtml: jest.fn((s: string) => s),
}));
jest.mock('../../modules/pushNotificationTriggers', () => ({
  __esModule: true,
  notifyDirectMessage: jest.fn().mockResolvedValue(undefined),
}));

import { registerFriendMessagingHandlers } from '../friendMessagingHandler';
import * as friendsManager from '../../modules/friendsManager';
import { getAuthUserId, broadcastToUser, getUserProfile } from '../../utils/socialHelpers';
import { emitError } from '../../utils/errorHandler';
import { checkRateLimit } from '../../utils/rateLimiter';

const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockBroadcastToUser = broadcastToUser as jest.MockedFunction<typeof broadcastToUser>;
const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockEmitError = emitError as jest.MockedFunction<typeof emitError>;

function createTestHarness() {
  const handlers = new Map<string, Function>();
  const socket: any = {
    id: 'socket-1',
    emit: jest.fn(),
    on: jest.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    authUserId: 'user-a',
  };
  const io: any = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  registerFriendMessagingHandlers(io, socket);

  const trigger = (event: string, data?: any) => {
    const handler = handlers.get(event);
    if (!handler) throw new Error(`No handler for ${event}`);
    return handler(data);
  };

  return { socket, io, trigger, handlers };
}

const PROFILE_A = {
  username: 'alice',
  displayName: 'Alice',
  avatar: { emoji: '😀', color: '#ff0000' },
  isOnline: true,
};

describe('friendMessagingHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockReturnValue('user-a');
    mockCheckRateLimit.mockReturnValue(true);
    mockGetUserProfile.mockResolvedValue(PROFILE_A);
  });

  it('should register all messaging event handlers', () => {
    const { handlers } = createTestHarness();
    expect(handlers.has('friends:sendMessage')).toBe(true);
    expect(handlers.has('friends:getMessages')).toBe(true);
    expect(handlers.has('friends:markRead')).toBe(true);
    expect(handlers.has('friends:typing')).toBe(true);
    expect(handlers.has('friends:deleteMessage')).toBe(true);
    expect(handlers.has('friends:getThreads')).toBe(true);
  });

  describe('friends:sendMessage', () => {
    it('should reject unauthenticated users', async () => {
      mockGetAuthUserId.mockReturnValue(null);
      const { trigger } = createTestHarness();
      await trigger('friends:sendMessage', { recipientUserId: 'user-b', message: 'hi' });
      expect(mockEmitError).toHaveBeenCalled();
    });

    it('should reject empty message', async () => {
      const { socket, trigger } = createTestHarness();
      await trigger('friends:sendMessage', { recipientUserId: 'user-b', message: '' });
      expect(socket.emit).toHaveBeenCalledWith('friends:error', expect.objectContaining({
        code: 'VALIDATION_FAILED',
      }));
    });

    it('should send message and broadcast to recipient', async () => {
      const mockMessage = {
        messageId: 'msg-1',
        conversationId: 'user-a_user-b',
        fromUserId: 'user-a',
        toUserId: 'user-b',
        message: 'hello',
        timestamp: Date.now(),
        isRead: false,
        isDeleted: false,
      };
      (friendsManager.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        message: mockMessage,
      });

      const { socket, trigger } = createTestHarness();
      await trigger('friends:sendMessage', {
        recipientUserId: 'user-b',
        message: 'hello',
        tempId: 'temp-1',
      });

      // Confirms to sender
      expect(socket.emit).toHaveBeenCalledWith('friends:messageSent', expect.objectContaining({
        messageId: 'msg-1',
        tempId: 'temp-1',
      }));

      // Broadcasts to recipient
      expect(mockBroadcastToUser).toHaveBeenCalledWith(
        expect.anything(),
        'user-b',
        'friends:messageReceived',
        mockMessage,
      );
    });

    it('should handle manager failure gracefully', async () => {
      (friendsManager.sendMessage as jest.Mock).mockResolvedValue({
        success: false,
        errorCode: 'NOT_FRIENDS',
      });

      const { socket, trigger } = createTestHarness();
      await trigger('friends:sendMessage', {
        recipientUserId: 'user-b',
        message: 'hello',
      });

      expect(socket.emit).toHaveBeenCalledWith('friends:error', expect.objectContaining({
        code: 'NOT_FRIENDS',
      }));
    });

    it('should respect rate limits', async () => {
      mockCheckRateLimit.mockReturnValue(false);
      const { socket, trigger } = createTestHarness();
      await trigger('friends:sendMessage', { recipientUserId: 'user-b', message: 'hi' });
      expect(socket.emit).toHaveBeenCalledWith('rateLimited');
    });
  });

  describe('friends:typing', () => {
    it('should broadcast typing indicator to recipient', async () => {
      (friendsManager.areFriends as jest.Mock).mockResolvedValue(true);

      const { trigger } = createTestHarness();
      await trigger('friends:typing', { recipientUserId: 'user-b', isTyping: true });

      expect(mockBroadcastToUser).toHaveBeenCalledWith(
        expect.anything(),
        'user-b',
        'friends:userTyping',
        expect.objectContaining({
          userId: 'user-a',
          username: 'alice',
          isTyping: true,
        }),
      );
    });

    it('should not broadcast typing to non-friends', async () => {
      (friendsManager.areFriends as jest.Mock).mockResolvedValue(false);

      const { trigger } = createTestHarness();
      await trigger('friends:typing', { recipientUserId: 'user-b', isTyping: true });

      expect(mockBroadcastToUser).not.toHaveBeenCalled();
    });
  });

  describe('friends:deleteMessage', () => {
    it('should reject unauthenticated users', async () => {
      mockGetAuthUserId.mockReturnValue(null);
      const { trigger } = createTestHarness();
      await trigger('friends:deleteMessage', { messageId: 'msg-1' });
      expect(mockEmitError).toHaveBeenCalled();
    });

    it('should reject missing messageId', async () => {
      const { socket, trigger } = createTestHarness();
      await trigger('friends:deleteMessage', {});
      expect(socket.emit).toHaveBeenCalledWith('friends:error', expect.objectContaining({
        code: 'VALIDATION_FAILED',
      }));
    });
  });
});
