/**
 * Push Notification Triggers Tests
 * Tests for game event → push notification wiring
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import {
  notifyFriendRequest,
  notifyFriendAccepted,
  notifyGameInvite,
} from '../pushNotificationTriggers';

// Mock fcmService
const { mockSendToUser } = vi.hoisted(() => {
  const mockSendToUser = vi.fn();
  return { mockSendToUser };
});
vi.mock('../fcmService', () => ({
  sendToUser: (...args: unknown[]) => mockSendToUser(...args),
}));

// Mock supabase for notification history
const mockInsert = vi.fn();
vi.mock('../supabase', () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} }));

describe('pushNotificationTriggers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
