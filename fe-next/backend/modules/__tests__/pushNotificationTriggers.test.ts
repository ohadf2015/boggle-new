/**
 * Push Notification Triggers Tests
 * Tests for game event → push notification wiring
 */

import {
  notifyFriendRequest,
  notifyFriendAccepted,
  notifyGameInvite,
} from '../pushNotificationTriggers';

// Mock fcmService
const mockSendToUser = jest.fn();
jest.mock('../fcmService', () => ({
  sendToUser: (...args: unknown[]) => mockSendToUser(...args),
}));

// Mock supabase for notification history
const mockInsert = jest.fn();
jest.mock('../supabase', () => ({
  getSupabase: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: mockInsert,
    })),
  })),
  isSupabaseConfigured: jest.fn(() => true),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('pushNotificationTriggers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    mockSendToUser.mockResolvedValue(undefined);
  });

  describe('notifyFriendRequest', () => {
    it('should send push with correct payload', async () => {
      await notifyFriendRequest('target-user-id', 'Ohad');

      expect(mockSendToUser).toHaveBeenCalledWith('target-user-id', {
        title: 'Friend Request',
        body: 'Ohad sent you a friend request!',
        data: {
          type: 'friend_request',
          deepLink: '/adventure?tab=friends',
        },
      });
    });

    it('should save notification to history', async () => {
      await notifyFriendRequest('target-user-id', 'Ohad');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'target-user-id',
          notification_type: 'social',
          title: 'Friend Request',
          body: 'Ohad sent you a friend request!',
        })
      );
    });

    it('should not throw on FCM failure', async () => {
      mockSendToUser.mockRejectedValue(new Error('FCM down'));
      await expect(notifyFriendRequest('user', 'Ohad')).resolves.toBeUndefined();
    });
  });

  describe('notifyFriendAccepted', () => {
    it('should send push with correct payload', async () => {
      await notifyFriendAccepted('original-sender-id', 'Maya');

      expect(mockSendToUser).toHaveBeenCalledWith('original-sender-id', {
        title: 'Friend Request Accepted',
        body: 'Maya accepted your friend request!',
        data: {
          type: 'friend_accepted',
          deepLink: '/adventure?tab=friends',
        },
      });
    });
  });

  describe('notifyGameInvite', () => {
    it('should send push with room code deep link', async () => {
      await notifyGameInvite('target-user-id', 'Ohad', 'ABC123');

      expect(mockSendToUser).toHaveBeenCalledWith('target-user-id', {
        title: 'Game Invite',
        body: 'Ohad invited you to play!',
        data: {
          type: 'game_invite',
          deepLink: '/join/ABC123',
        },
      });
    });
  });
});
