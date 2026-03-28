/**
 * friendsHandler tests
 * Covers: sendRequest, acceptRequest, declineRequest, unfriend, searchUsers, getPendingRequests, auth checks
 */

// Mock dependencies before imports
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
jest.mock('../../modules/pushNotificationTriggers', () => ({
  __esModule: true,
  notifyFriendRequest: jest.fn().mockResolvedValue(undefined),
  notifyFriendAccepted: jest.fn().mockResolvedValue(undefined),
}));

import { registerFriendsHandlers } from '../friendsHandler';
import * as friendsManager from '../../modules/friendsManager';
import { getSupabase } from '../../modules/supabaseServer';
import { getAuthUserId, broadcastToUser, getUserProfile } from '../../utils/socialHelpers';
import { emitError } from '../../utils/errorHandler';
import { checkRateLimit } from '../../utils/rateLimiter';

// Typed mocks
const mockGetAuthUserId = getAuthUserId as jest.MockedFunction<typeof getAuthUserId>;
const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockBroadcastToUser = broadcastToUser as jest.MockedFunction<typeof broadcastToUser>;
const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockEmitError = emitError as jest.MockedFunction<typeof emitError>;

// Helper to create mock socket with event handlers
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

  registerFriendsHandlers(io, socket);

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

const PROFILE_B = {
  username: 'bob',
  displayName: 'Bob',
  avatar: { emoji: '⚙️', color: '#0000ff' },
  isOnline: false,
};

describe('friendsHandler', () => {
  let harness: ReturnType<typeof createTestHarness>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthUserId.mockReturnValue('user-a');
    mockCheckRateLimit.mockReturnValue(true);
    harness = createTestHarness();
  });

  // ==================== Auth ====================

  describe('auth checks', () => {
    const events = [
      ['friends:sendRequest', { targetUserId: 'user-b' }],
      ['friends:acceptRequest', { requestId: 'req-1' }],
      ['friends:declineRequest', { requestId: 'req-1' }],
      ['friends:unfriend', { friendUserId: 'user-b' }],
      ['friends:searchUsers', { query: 'bob' }],
      ['friends:getPendingRequests', undefined],
    ] as const;

    it.each(events)('%s rejects unauthenticated socket', async (event, data) => {
      mockGetAuthUserId.mockReturnValue(null);
      await harness.trigger(event, data);
      // sendRequest uses emitError for unauth
      if (event === 'friends:sendRequest') {
        expect(mockEmitError).toHaveBeenCalled();
      } else {
        expect(mockEmitError).toHaveBeenCalled();
      }
    });
  });

  // ==================== sendRequest ====================

  describe('friends:sendRequest', () => {
    it('sends request successfully', async () => {
      (friendsManager.sendFriendRequest as jest.Mock).mockResolvedValue({
        success: true,
        request: { requestId: 'req-1' },
      });
      mockGetUserProfile.mockResolvedValueOnce(PROFILE_A).mockResolvedValueOnce(PROFILE_B);

      await harness.trigger('friends:sendRequest', { targetUserId: 'user-b' });

      expect(friendsManager.sendFriendRequest).toHaveBeenCalledWith('user-a', 'user-b');
      expect(harness.socket.emit).toHaveBeenCalledWith(
        'friends:requestSent',
        expect.objectContaining({
          requestId: 'req-1',
          fromUserId: 'user-a',
          toUserId: 'user-b',
          fromUsername: 'alice',
          toUsername: 'bob',
          status: 'pending',
        })
      );
      expect(mockBroadcastToUser).toHaveBeenCalledWith(
        harness.io,
        'user-b',
        'friends:requestReceived',
        expect.objectContaining({ requestId: 'req-1' })
      );
    });

    it('rejects self-request', async () => {
      await harness.trigger('friends:sendRequest', { targetUserId: 'user-a' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'CANNOT_ADD_SELF',
        message: 'Cannot send friend request to yourself',
      });
    });

    it('rejects when missing targetUserId', async () => {
      await harness.trigger('friends:sendRequest', {});

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Target user ID is required',
      });
    });

    it('returns error when already friends', async () => {
      (friendsManager.sendFriendRequest as jest.Mock).mockResolvedValue({
        success: false,
        errorCode: 'ALREADY_FRIENDS',
        message: 'Already friends with this user',
      });

      await harness.trigger('friends:sendRequest', { targetUserId: 'user-b' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'ALREADY_FRIENDS',
        message: 'Already friends with this user',
      });
    });

    it('returns error when request already pending', async () => {
      (friendsManager.sendFriendRequest as jest.Mock).mockResolvedValue({
        success: false,
        errorCode: 'REQUEST_ALREADY_EXISTS',
        message: 'Friend request already sent',
      });

      await harness.trigger('friends:sendRequest', { targetUserId: 'user-b' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'REQUEST_ALREADY_EXISTS',
        message: 'Friend request already sent',
      });
    });

    it('returns error when profile not found', async () => {
      (friendsManager.sendFriendRequest as jest.Mock).mockResolvedValue({
        success: true,
        request: { requestId: 'req-1' },
      });
      mockGetUserProfile.mockResolvedValueOnce(PROFILE_A).mockResolvedValueOnce(null);

      await harness.trigger('friends:sendRequest', { targetUserId: 'user-b' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'USER_NOT_FOUND',
        message: 'User profile not found',
      });
    });

    it('handles exception gracefully', async () => {
      (friendsManager.sendFriendRequest as jest.Mock).mockRejectedValue(new Error('DB down'));

      await harness.trigger('friends:sendRequest', { targetUserId: 'user-b' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to send friend request',
      });
    });
  });

  // ==================== acceptRequest ====================

  describe('friends:acceptRequest', () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    beforeEach(() => {
      mockGetSupabase.mockReturnValue(mockSupabase as any);
    });

    it('accepts request and notifies both users', async () => {
      (friendsManager.acceptFriendRequest as jest.Mock).mockResolvedValue({ success: true });
      mockSupabase.single.mockResolvedValue({
        data: { user_id: 'user-b', friend_id: 'user-a' },
      });
      mockGetUserProfile.mockResolvedValueOnce(PROFILE_B).mockResolvedValueOnce(PROFILE_A);

      await harness.trigger('friends:acceptRequest', { requestId: 'req-1' });

      expect(friendsManager.acceptFriendRequest).toHaveBeenCalledWith('req-1', 'user-a');
      expect(harness.socket.emit).toHaveBeenCalledWith(
        'friends:requestAccepted',
        expect.objectContaining({
          requestId: 'req-1',
          fromUserId: 'user-b',
          toUserId: 'user-a',
          status: 'accepted',
        })
      );
      expect(mockBroadcastToUser).toHaveBeenCalledWith(
        harness.io,
        'user-b',
        'friends:requestAccepted',
        expect.any(Object)
      );
    });

    it('rejects missing requestId', async () => {
      await harness.trigger('friends:acceptRequest', {});

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Request ID is required',
      });
    });

    it('returns error when request not found in manager', async () => {
      (friendsManager.acceptFriendRequest as jest.Mock).mockResolvedValue({
        success: false,
        errorCode: 'REQUEST_NOT_FOUND',
      });

      await harness.trigger('friends:acceptRequest', { requestId: 'req-999' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'REQUEST_NOT_FOUND',
        message: 'Failed to accept friend request',
      });
    });

    it('handles supabase unavailable', async () => {
      (friendsManager.acceptFriendRequest as jest.Mock).mockResolvedValue({ success: true });
      mockGetSupabase.mockReturnValue(null as any);

      await harness.trigger('friends:acceptRequest', { requestId: 'req-1' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Database unavailable',
      });
    });

    it('handles request row not found in DB after accept', async () => {
      (friendsManager.acceptFriendRequest as jest.Mock).mockResolvedValue({ success: true });
      mockSupabase.single.mockResolvedValue({ data: null });

      await harness.trigger('friends:acceptRequest', { requestId: 'req-1' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'REQUEST_NOT_FOUND',
        message: 'Friend request not found',
      });
    });

    it('notifies online status when sender is online', async () => {
      (friendsManager.acceptFriendRequest as jest.Mock).mockResolvedValue({ success: true });
      mockSupabase.single.mockResolvedValue({
        data: { user_id: 'user-b', friend_id: 'user-a' },
      });
      const onlineSender = { ...PROFILE_B, isOnline: true };
      mockGetUserProfile.mockResolvedValueOnce(onlineSender).mockResolvedValueOnce(PROFILE_A);

      await harness.trigger('friends:acceptRequest', { requestId: 'req-1' });

      expect(harness.socket.emit).toHaveBeenCalledWith(
        'friends:friendOnline',
        expect.objectContaining({ userId: 'user-b', username: 'bob' })
      );
    });
  });

  // ==================== declineRequest ====================

  describe('friends:declineRequest', () => {
    it('declines request successfully', async () => {
      (friendsManager.declineFriendRequest as jest.Mock).mockResolvedValue({ success: true });

      await harness.trigger('friends:declineRequest', { requestId: 'req-1' });

      expect(friendsManager.declineFriendRequest).toHaveBeenCalledWith('req-1', 'user-a');
      expect(harness.socket.emit).toHaveBeenCalledWith(
        'friends:requestDeclined',
        expect.objectContaining({ requestId: 'req-1' })
      );
    });

    it('rejects missing requestId', async () => {
      await harness.trigger('friends:declineRequest', {});

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Request ID is required',
      });
    });

    it('returns error on failure', async () => {
      (friendsManager.declineFriendRequest as jest.Mock).mockResolvedValue({ success: false });

      await harness.trigger('friends:declineRequest', { requestId: 'req-1' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to decline friend request',
      });
    });

    it('handles exception gracefully', async () => {
      (friendsManager.declineFriendRequest as jest.Mock).mockRejectedValue(new Error('fail'));

      await harness.trigger('friends:declineRequest', { requestId: 'req-1' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to decline friend request',
      });
    });
  });

  // ==================== unfriend ====================

  describe('friends:unfriend', () => {
    it('unfriends successfully and notifies both', async () => {
      (friendsManager.unfriend as jest.Mock).mockResolvedValue({ success: true });

      await harness.trigger('friends:unfriend', { friendUserId: 'user-b' });

      expect(friendsManager.unfriend).toHaveBeenCalledWith('user-a', 'user-b');
      expect(harness.socket.emit).toHaveBeenCalledWith(
        'friends:friendRemoved',
        expect.objectContaining({ friendUserId: 'user-b' })
      );
      expect(mockBroadcastToUser).toHaveBeenCalledWith(
        harness.io,
        'user-b',
        'friends:friendRemoved',
        expect.objectContaining({ friendUserId: 'user-a' })
      );
    });

    it('rejects missing friendUserId', async () => {
      await harness.trigger('friends:unfriend', {});

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Friend user ID is required',
      });
    });

    it('returns error on failure', async () => {
      (friendsManager.unfriend as jest.Mock).mockResolvedValue({ success: false });

      await harness.trigger('friends:unfriend', { friendUserId: 'user-b' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Failed to unfriend user',
      });
    });
  });

  // ==================== searchUsers ====================

  describe('friends:searchUsers', () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn(),
    };

    beforeEach(() => {
      mockGetSupabase.mockReturnValue(mockSupabase as any);
    });

    it('rejects query shorter than 2 chars', async () => {
      await harness.trigger('friends:searchUsers', { query: 'a' });

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'VALIDATION_FAILED',
        message: 'Search query must be at least 2 characters',
      });
    });

    it('returns empty results when no profiles match', async () => {
      // limit() is the terminal call in the profile query chain
      mockSupabase.limit.mockResolvedValue({ data: [] });

      await harness.trigger('friends:searchUsers', { query: 'bob' });

      expect(harness.socket.emit).toHaveBeenCalledWith(
        'friends:searchResults',
        expect.objectContaining({ users: [] })
      );
    });

    it('returns users with friendship status', async () => {
      const profiles = [
        { id: 'user-b', username: 'bob', display_name: 'Bob', avatar_emoji: '⚙️', avatar_color: '#00f', avatar_image: null },
      ];
      mockSupabase.limit.mockResolvedValue({ data: profiles });
      mockSupabase.or.mockResolvedValue({
        data: [{ user_id: 'user-a', friend_id: 'user-b', status: 'accepted', id: 'f-1' }],
      });

      await harness.trigger('friends:searchUsers', { query: 'bob' });

      expect(harness.socket.emit).toHaveBeenCalledWith(
        'friends:searchResults',
        expect.objectContaining({
          users: [
            expect.objectContaining({
              userId: 'user-b',
              username: 'bob',
              isFriend: true,
              isPending: false,
            }),
          ],
        })
      );
    });

    it('caps limit at 50', async () => {
      mockSupabase.limit.mockResolvedValue({ data: [] });

      await harness.trigger('friends:searchUsers', { query: 'bob', limit: 999 });

      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
    });
  });

  // ==================== getPendingRequests ====================

  describe('friends:getPendingRequests', () => {
    it('returns sent and received requests with profiles', async () => {
      // Both queries return the same row shape; the handler distinguishes by eq('user_id') vs eq('friend_id')
      const sentRow = { id: 'req-1', user_id: 'user-a', friend_id: 'user-b', created_at: '2026-01-01T00:00:00Z' };
      const receivedRow = { id: 'req-2', user_id: 'user-c', friend_id: 'user-a', created_at: '2026-01-02T00:00:00Z' };

      // Track which eq column is called to return correct data
      let queryIndex = 0;
      const makeEqChain = (resolveData: any) => {
        const chain: any = {
          eq: jest.fn().mockReturnValue({ data: resolveData }),
        };
        return chain;
      };

      const mockSupabase: any = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation((_col: string) => {
              queryIndex++;
              // First call chain -> sent, second -> received
              if (queryIndex <= 1) {
                return makeEqChain([sentRow]);
              }
              return makeEqChain([receivedRow]);
            }),
          }),
        }),
      };

      mockGetSupabase.mockReturnValue(mockSupabase);
      mockGetUserProfile
        .mockResolvedValueOnce(PROFILE_B) // sent req: lookup friend_id=user-b
        .mockResolvedValueOnce({ username: 'charlie', displayName: 'Charlie', avatar: { emoji: '🎩', color: '#0f0' }, isOnline: false });

      await harness.trigger('friends:getPendingRequests');

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:pendingRequests', {
        sent: [expect.objectContaining({ requestId: 'req-1', toUserId: 'user-b', toUsername: 'bob' })],
        received: [expect.objectContaining({ requestId: 'req-2', fromUserId: 'user-c', fromUsername: 'charlie' })],
      });
    });

    it('handles supabase unavailable', async () => {
      mockGetSupabase.mockReturnValue(null as any);

      await harness.trigger('friends:getPendingRequests');

      expect(harness.socket.emit).toHaveBeenCalledWith('friends:error', {
        code: 'SERVER_ERROR',
        message: 'Database unavailable',
      });
    });
  });

  // ==================== Rate limiting ====================

  describe('rate limiting', () => {
    it('emits rateLimited when rate limit exceeded', async () => {
      mockCheckRateLimit.mockReturnValue(false);

      await harness.trigger('friends:sendRequest', { targetUserId: 'user-b' });

      expect(harness.socket.emit).toHaveBeenCalledWith('rateLimited');
      expect(friendsManager.sendFriendRequest).not.toHaveBeenCalled();
    });
  });
});
