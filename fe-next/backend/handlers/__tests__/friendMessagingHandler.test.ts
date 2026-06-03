/**
 * friendMessagingHandler tests (Q-1)
 * Covers: sendMessage, getMessages, markRead, typing, deleteMessage, getThreads, auth checks
 */

vi.mock('../../utils/logger', () => {
  const l = { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() };
  return { __esModule: true, default: l, ...l };
});

vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn().mockReturnValue(true), default: {
  __esModule: true,
  checkRateLimit: vi.fn().mockReturnValue(true),
} }));

vi.mock('../../utils/errorHandler', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errorHandler')>('../../utils/errorHandler');
  return { ...actual, emitError: vi.fn() };
});

vi.mock('../../modules/friendsManager');
vi.mock('../../modules/supabaseServer');
vi.mock('../../utils/socialHelpers');
vi.mock('../../utils/profanityFilter', () => ({
  __esModule: true,
  cleanProfanity: vi.fn((s: string) => s),
}));
vi.mock('../../utils/sanitize', () => ({
  __esModule: true,
  sanitizeHtml: vi.fn((s: string) => s),
}));
vi.mock('../../modules/pushNotificationTriggers', () => ({
  __esModule: true,
  notifyDirectMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../utils/socialPolicyServer', () => ({
  __esModule: true,
  ensureSocialCapability: vi.fn().mockResolvedValue(true),
  getSocialCapabilities: vi.fn().mockResolvedValue({
    publicRoomChat: true,
    friendMessaging: true,
    friendManagement: true,
    customDisplayName: true,
    emojiReactions: true,
  }),
  resolveSocketSocialContext: vi.fn().mockResolvedValue({
    tier: 'adult',
    caps: {
      publicRoomChat: true,
      friendMessaging: true,
      friendManagement: true,
      customDisplayName: true,
      emojiReactions: true,
    },
  }),
  clearSocketSocialContextCache: vi.fn(),
}));

import { vi, type Mock, type MockInstance } from 'vitest';
import { registerFriendMessagingHandlers } from '../friendMessagingHandler';
import * as friendsManager from '../../modules/friendsManager';
import { getAuthUserId, broadcastToUser, getUserProfile } from '../../utils/socialHelpers';
import { emitError } from '../../utils/errorHandler';
import { checkRateLimit } from '../../utils/rateLimiter';

const mockGetAuthUserId = getAuthUserId as MockedFunction<typeof getAuthUserId>;
const mockBroadcastToUser = broadcastToUser as MockedFunction<typeof broadcastToUser>;
const mockGetUserProfile = getUserProfile as MockedFunction<typeof getUserProfile>;
const mockCheckRateLimit = checkRateLimit as MockedFunction<typeof checkRateLimit>;
const mockEmitError = emitError as MockedFunction<typeof emitError>;

function createTestHarness() {
  const handlers = new Map<string, Function>();
  const socket: any = {
    id: 'socket-1',
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      handlers.set(event, handler);
    }),
    authUserId: 'user-a',
  };
  const fetchSocketsMock = vi.fn().mockResolvedValue([]);
  const io: any = {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
    in: vi.fn(() => ({ fetchSockets: fetchSocketsMock })),
    _fetchSocketsMock: fetchSocketsMock,
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
    vi.clearAllMocks();
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
      (friendsManager.sendMessage as Mock).mockResolvedValue({
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
      (friendsManager.sendMessage as Mock).mockResolvedValue({
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

  describe('friends:sendMessage presence gate (N-1)', () => {
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

    beforeEach(() => {
      (friendsManager.sendMessage as Mock).mockResolvedValue({
        success: true,
        message: mockMessage,
      });
    });

    it('should pass in_app_only when recipient socket online (no FCM)', async () => {
      const { notifyDirectMessage } = await import('../../modules/pushNotificationTriggers');
      const { io, trigger } = createTestHarness();
      (io._fetchSocketsMock as Mock).mockResolvedValue([{ id: 's-b' }]);

      await trigger('friends:sendMessage', { recipientUserId: 'user-b', message: 'hi' });

      expect(io.in).toHaveBeenCalledWith('user:user-b');
      expect(notifyDirectMessage).toHaveBeenCalledWith(
        'user-b', 'alice', 'hi', 'user-a', 'in_app_only',
      );
    });

    it('should pass both when recipient offline (FCM + in-app)', async () => {
      const { notifyDirectMessage } = await import('../../modules/pushNotificationTriggers');
      const { trigger } = createTestHarness();

      await trigger('friends:sendMessage', { recipientUserId: 'user-b', message: 'hi' });

      expect(notifyDirectMessage).toHaveBeenCalledWith(
        'user-b', 'alice', 'hi', 'user-a', 'both',
      );
    });
  });

  describe('friends:typing', () => {
    it('should broadcast typing indicator to recipient', async () => {
      (friendsManager.areFriends as Mock).mockResolvedValue(true);

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
      (friendsManager.areFriends as Mock).mockResolvedValue(false);

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
